/**
 * Critical concurrency test: simultaneous bookings for the same slot.
 * Requires running Postgres. Skipped if DATABASE_URL is not set for CI without DB.
 */
import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();
const hasDb = !!process.env.DATABASE_URL;

(hasDb ? describe : describe.skip)('Double booking protection', () => {
  let doctorId: string;
  let branchId: string;
  let clinicId: string;
  let patientIds: string[] = [];
  const date = new Date('2030-06-15T00:00:00.000Z');
  const startTime = '10:00';

  beforeAll(async () => {
    const doctor = await prisma.doctor.findFirst({ include: { branches: true } });
    const patients = await prisma.patient.findMany({ take: 10 });
    if (!doctor || !doctor.branches[0] || patients.length < 5) {
      throw new Error('Seed data required for concurrency test');
    }
    doctorId = doctor.id;
    branchId = doctor.branches[0].branchId;
    const branch = await prisma.branch.findUniqueOrThrow({ where: { id: branchId } });
    clinicId = branch.clinicId;
    patientIds = patients.map((p) => p.id);

    await prisma.appointment.deleteMany({
      where: { doctorId, branchId, appointmentDate: date, startTime },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { doctorId, branchId, appointmentDate: date, startTime },
    });
    await prisma.$disconnect();
  });

  it('allows only one confirmed booking for the same slot under concurrency', async () => {
    const attempts = patientIds.slice(0, 8).map((patientId) =>
      prisma.appointment
        .create({
          data: {
            clinicId,
            branchId,
            doctorId,
            patientId,
            appointmentDate: date,
            startTime,
            endTime: '10:20',
            status: AppointmentStatus.PENDING,
            fee: 500000,
          },
        })
        .then(() => ({ ok: true as const }))
        .catch((err) => ({ ok: false as const, code: err.code })),
    );

    const results = await Promise.all(attempts);
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures.length).toBeGreaterThanOrEqual(7);
    expect(failures.every((f) => !f.ok && f.code === 'P2002')).toBe(true);

    const count = await prisma.appointment.count({
      where: { doctorId, branchId, appointmentDate: date, startTime },
    });
    expect(count).toBe(1);
  });
});
