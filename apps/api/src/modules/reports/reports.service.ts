import { Injectable } from '@nestjs/common';
import { AppointmentStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertClinicAccess, parseDateOnly } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(
    user: AuthUser,
    query: { clinicId: string; from?: string; to?: string },
  ) {
    assertClinicAccess(user, query.clinicId);

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const from = query.from ? parseDateOnly(query.from) : monthStart;
    const to = query.to ? parseDateOnly(query.to) : todayStart;

    const clinicFilter = { clinicId: query.clinicId };

    const [
      todayCount,
      weekCount,
      monthCount,
      completedVisits,
      cancelledCount,
      noShowCount,
      totalInRange,
      revenue,
      outstanding,
      topDoctors,
      topSpecialties,
      patientStats,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: { ...clinicFilter, appointmentDate: todayStart },
      }),
      this.prisma.appointment.count({
        where: { ...clinicFilter, appointmentDate: { gte: weekStart } },
      }),
      this.prisma.appointment.count({
        where: { ...clinicFilter, appointmentDate: { gte: monthStart } },
      }),
      this.prisma.appointment.count({
        where: { ...clinicFilter, status: AppointmentStatus.COMPLETED, appointmentDate: { gte: from, lte: to } },
      }),
      this.prisma.appointment.count({
        where: { ...clinicFilter, status: AppointmentStatus.CANCELLED, appointmentDate: { gte: from, lte: to } },
      }),
      this.prisma.appointment.count({
        where: { ...clinicFilter, status: AppointmentStatus.NO_SHOW, appointmentDate: { gte: from, lte: to } },
      }),
      this.prisma.appointment.count({
        where: { ...clinicFilter, appointmentDate: { gte: from, lte: to } },
      }),
      this.prisma.payment.aggregate({
        where: { clinicId: query.clinicId, status: PaymentStatus.PAID, paidAt: { gte: from, lte: new Date(to.getTime() + 86400000) } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { clinicId: query.clinicId, status: PaymentStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['doctorId'],
        where: { ...clinicFilter, appointmentDate: { gte: from, lte: to } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.appointment.groupBy({
        by: ['specialtyId'],
        where: { ...clinicFilter, specialtyId: { not: null }, appointmentDate: { gte: from, lte: to } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.getPatientStats(query.clinicId, from, to),
    ]);

    const noShowRate = totalInRange > 0 ? (noShowCount / totalInRange) * 100 : 0;

    const doctorIds = topDoctors.map((d) => d.doctorId);
    const doctors = await this.prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const specialtyIds = topSpecialties.map((s) => s.specialtyId).filter(Boolean) as string[];
    const specialties = await this.prisma.specialty.findMany({
      where: { id: { in: specialtyIds } },
    });

    const waitingToday = await this.prisma.appointment.count({
      where: {
        ...clinicFilter,
        appointmentDate: todayStart,
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN] },
      },
    });

    const doctorsOnDuty = await this.prisma.appointment.findMany({
      where: { ...clinicFilter, appointmentDate: todayStart },
      select: { doctorId: true },
      distinct: ['doctorId'],
    });

    const revenueToday = await this.prisma.payment.aggregate({
      where: {
        clinicId: query.clinicId,
        status: PaymentStatus.PAID,
        paidAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });

    return {
      today: {
        appointments: todayCount,
        waiting: waitingToday,
        doctorsOnDuty: doctorsOnDuty.length,
        revenue: Number(revenueToday._sum.amount || 0),
        noShows: await this.prisma.appointment.count({
          where: { ...clinicFilter, appointmentDate: todayStart, status: AppointmentStatus.NO_SHOW },
        }),
      },
      period: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        appointmentsThisWeek: weekCount,
        appointmentsThisMonth: monthCount,
        completedVisits,
        cancelledAppointments: cancelledCount,
        noShowRate: Math.round(noShowRate * 10) / 10,
        revenue: Number(revenue._sum.amount || 0),
        outstandingPayments: Number(outstanding._sum.amount || 0),
      },
      topDoctors: topDoctors.map((d) => {
        const doc = doctors.find((x) => x.id === d.doctorId);
        return {
          doctorId: d.doctorId,
          name: doc ? `${doc.user.firstName} ${doc.user.lastName}` : d.doctorId,
          count: d._count.id,
        };
      }),
      topSpecialties: topSpecialties.map((s) => {
        const sp = specialties.find((x) => x.id === s.specialtyId);
        return {
          specialtyId: s.specialtyId,
          nameFa: sp?.nameFa,
          nameEn: sp?.nameEn,
          count: s._count.id,
        };
      }),
      patients: patientStats,
    };
  }

  private async getPatientStats(clinicId: string, from: Date, to: Date) {
    const patientsWithAppointments = await this.prisma.appointment.groupBy({
      by: ['patientId'],
      where: { clinicId, appointmentDate: { gte: from, lte: to } },
    });

    const newPatients = await this.prisma.patient.count({
      where: {
        createdAt: { gte: from, lte: new Date(to.getTime() + 86400000) },
        appointments: { some: { clinicId } },
      },
    });

    return {
      total: patientsWithAppointments.length,
      newPatients,
      returningPatients: Math.max(0, patientsWithAppointments.length - newPatients),
    };
  }
}
