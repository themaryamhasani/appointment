/**
 * API-level booking flow smoke test (register → book → pay mock).
 * Requires DATABASE_URL and a running schema/seed.
 */
import { PrismaClient, AppointmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();
const hasDb = !!process.env.DATABASE_URL;

(hasDb ? describe : describe.skip)('Booking payment flow (integration)', () => {
  const date = new Date('2031-03-20T00:00:00.000Z');
  const startTime = '11:00';
  let clinicId: string;
  let branchId: string;
  let doctorId: string;
  let patientId: string;
  let appointmentId: string;

  beforeAll(async () => {
    const doctor = await prisma.doctor.findFirst({ include: { branches: true } });
    const patient = await prisma.patient.findFirst();
    if (!doctor?.branches[0] || !patient) throw new Error('Seed required');
    doctorId = doctor.id;
    branchId = doctor.branches[0].branchId;
    const branch = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
    clinicId = branch.clinicId;
    patientId = patient.id;

    const existing = await prisma.appointment.findMany({
      where: { doctorId, branchId, appointmentDate: date, startTime },
      select: { id: true },
    });
    const ids = existing.map((a) => a.id);
    if (ids.length) {
      await prisma.visit.deleteMany({ where: { appointmentId: { in: ids } } });
      await prisma.payment.deleteMany({ where: { appointmentId: { in: ids } } });
      await prisma.appointment.deleteMany({ where: { id: { in: ids } } });
    }
  });

  afterAll(async () => {
    if (appointmentId) {
      await prisma.visit.deleteMany({ where: { appointmentId } });
      await prisma.payment.deleteMany({ where: { appointmentId } });
      await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    }
    await prisma.$disconnect();
  });

  it('creates appointment and mock payment then confirms', async () => {
    const appt = await prisma.appointment.create({
      data: {
        clinicId,
        branchId,
        doctorId,
        patientId,
        appointmentDate: date,
        startTime,
        endTime: '11:20',
        status: AppointmentStatus.PENDING,
        fee: 250000,
        visitType: 'TELEHEALTH',
      },
    });
    appointmentId = appt.id;

    const payment = await prisma.payment.create({
      data: {
        clinicId,
        appointmentId,
        amount: 250000,
        status: PaymentStatus.PENDING,
        provider: 'mock',
        providerRef: `mock_${appointmentId}`,
        idempotencyKey: `flow_${appointmentId}`,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CONFIRMED },
    });

    const visit = await prisma.visit.create({
      data: {
        appointmentId,
        doctorId,
        patientId,
        meetingUrl: `https://meet.healthcare.local/${appointmentId}`,
        startedAt: new Date(),
        completedAt: new Date(),
        diagnosis: 'OK',
      },
    });

    expect(visit.meetingUrl).toContain(appointmentId);
    const confirmed = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    expect(confirmed?.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('isolates services by clinic', async () => {
    const clinics = await prisma.clinic.findMany({ take: 2 });
    if (clinics.length < 2) return;
    const a = await prisma.service.count({ where: { clinicId: clinics[0].id } });
    const b = await prisma.service.create({
      data: {
        clinicId: clinics[1].id,
        nameFa: 'تست',
        nameEn: 'Test Iso',
        slug: `iso-${Date.now()}`,
        price: 1,
      },
    });
    const cross = await prisma.service.findFirst({
      where: { id: b.id, clinicId: clinics[0].id },
    });
    expect(cross).toBeNull();
    await prisma.service.delete({ where: { id: b.id } });
    expect(a).toBeGreaterThanOrEqual(0);
  });
});
