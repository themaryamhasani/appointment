import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PaymentStatus, AppointmentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from './providers/payment-provider.interface';
import { AppException } from '../../common/exceptions/app.exception';
import { assertClinicAccess, paginate, paginationMeta } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async createIntent(user: AuthUser, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, payments: true },
    });
    if (!appointment) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Not found' });

    const existingPaid = appointment.payments.find((p) => p.status === PaymentStatus.PAID);
    if (existingPaid) {
      throw new AppException('ALREADY_PAID', 'Appointment is already paid');
    }

    const pending = appointment.payments.find((p) => p.status === PaymentStatus.PENDING);
    if (pending) {
      const meta = (pending.metadata || {}) as Record<string, unknown>;
      return { ...pending, redirectUrl: meta.redirectUrl };
    }

    const idempotencyKey = `pay:${appointmentId}:${randomUUID()}`;
    const amount = Number(appointment.fee);
    const providerName = this.config.get('PAYMENT_PROVIDER', 'mock');

    const intent = await this.provider.createIntent({
      amount,
      currency: appointment.currency,
      idempotencyKey,
      metadata: { appointmentId },
    });

    const payment = await this.prisma.payment.create({
      data: {
        clinicId: appointment.clinicId,
        appointmentId,
        amount,
        currency: appointment.currency,
        status: PaymentStatus.PENDING,
        provider: providerName,
        providerRef: intent.providerRef,
        idempotencyKey,
        metadata: { redirectUrl: intent.redirectUrl },
      },
    });

    await this.audit.log({
      actorId: user.id,
      clinicId: appointment.clinicId,
      action: 'PAYMENT_INTENT_CREATED',
      entity: 'Payment',
      entityId: payment.id,
    });

    return { ...payment, redirectUrl: intent.redirectUrl };
  }

  async handleWebhook(payload: Record<string, unknown>) {
    const verified = await this.provider.verifyCallback(payload);
    const idempotencyKey = String(payload.idempotencyKey || '');

    // Idempotency: find by provider ref or idempotency key
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { providerRef: verified.providerRef },
          ...(idempotencyKey ? [{ idempotencyKey }] : []),
        ],
      },
      include: { appointment: { include: { patient: true } } },
    });

    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
    }

    // Already processed — idempotent success
    if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.FAILED) {
      return payment;
    }

    const newStatus =
      verified.status === 'PAID' ? PaymentStatus.PAID : PaymentStatus.FAILED;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Check if transaction already recorded
      const existingTx = await tx.paymentTransaction.findFirst({
        where: { paymentId: payment.id, providerRef: verified.providerRef },
      });
      if (existingTx) return payment;

      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          paidAt: newStatus === PaymentStatus.PAID ? new Date() : null,
          failureReason: newStatus === PaymentStatus.FAILED ? 'Gateway reported failure' : null,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: 'CHARGE',
          amount: payment.amount,
          providerRef: verified.providerRef,
          rawPayload: payload as any,
        },
      });

      if (newStatus === PaymentStatus.PAID && payment.appointmentId) {
        await tx.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: AppointmentStatus.CONFIRMED },
        });
        await tx.appointmentStatusHistory.create({
          data: {
            appointmentId: payment.appointmentId,
            fromStatus: AppointmentStatus.PENDING,
            toStatus: AppointmentStatus.CONFIRMED,
            reason: 'Payment confirmed',
          },
        });
      }

      return result;
    });

    if (newStatus === PaymentStatus.PAID && payment.appointment) {
      await this.notifications.enqueue({
        type: 'PaymentCompleted',
        userId: payment.appointment.patient.userId,
        clinicId: payment.clinicId,
        title: 'Payment Successful',
        body: 'Your payment was successful and appointment is confirmed.',
        data: { paymentId: payment.id, appointmentId: payment.appointmentId },
      });
    }

    await this.audit.log({
      clinicId: payment.clinicId,
      action: newStatus === PaymentStatus.PAID ? 'PAYMENT_COMPLETED' : 'PAYMENT_FAILED',
      entity: 'Payment',
      entityId: payment.id,
    });

    return updated;
  }

  async findAll(user: AuthUser, query: { page?: number; limit?: number; clinicId?: string; status?: PaymentStatus }) {
    const { skip, take, page, limit } = paginate(query.page, query.limit);
    const where: Record<string, unknown> = {};
    if (query.clinicId) {
      assertClinicAccess(user, query.clinicId);
      where.clinicId = query.clinicId;
    } else if (!user.isSuperAdmin) {
      where.clinicId = { in: user.clinicIds };
    }
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { appointment: true },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, meta: paginationMeta(total, page, limit) };
  }

  async refund(user: AuthUser, paymentId: string, amount: number, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Not found' });
    assertClinicAccess(user, payment.clinicId);
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new AppException('INVALID_PAYMENT_STATE', 'Only paid payments can be refunded');
    }
    const refundAmount = amount || Number(payment.amount);
    const refund = await this.prisma.refund.create({
      data: {
        paymentId,
        amount: refundAmount,
        reason,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });
    const fully = refundAmount >= Number(payment.amount);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: fully ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
      },
    });
    await this.prisma.paymentTransaction.create({
      data: {
        paymentId,
        type: 'REFUND',
        amount: refundAmount,
        providerRef: `refund_${refund.id}`,
      },
    });
    await this.audit.log({
      actorId: user.id,
      clinicId: payment.clinicId,
      action: 'PAYMENT_REFUNDED',
      entity: 'Payment',
      entityId: paymentId,
    });
    return refund;
  }

  async createInvoice(user: AuthUser, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException();
    assertClinicAccess(user, appointment.clinicId);
    const existing = await this.prisma.invoice.findUnique({ where: { appointmentId } });
    if (existing) return existing;
    const amount = Number(appointment.fee);
    return this.prisma.invoice.create({
      data: {
        clinicId: appointment.clinicId,
        appointmentId,
        invoiceNumber: `INV-${Date.now()}`,
        amount,
        taxAmount: 0,
        totalAmount: amount,
        currency: appointment.currency,
        status: 'ISSUED',
        issuedAt: new Date(),
      },
    });
  }
}
