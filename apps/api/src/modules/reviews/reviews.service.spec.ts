import { ReviewsService } from './reviews.service';

describe('ReviewsService rating aggregate', () => {
  const prisma = {
    doctor: { findUnique: jest.fn(), update: jest.fn() },
    doctorReview: {
      upsert: jest.fn(),
      aggregate: jest.fn(),
    },
  };
  const service = new ReviewsService(prisma as any);
  const user = { id: 'u1' } as any;

  beforeEach(() => jest.clearAllMocks());

  it('updates doctor rating average after review', async () => {
    prisma.doctor.findUnique.mockResolvedValue({ id: 'd1' });
    prisma.doctorReview.upsert.mockResolvedValue({ id: 'r1', rating: 5 });
    prisma.doctorReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    });
    prisma.doctor.update.mockResolvedValue({});

    await service.create(user, {
      doctorId: 'd1',
      patientId: 'p1',
      rating: 5,
      comment: 'Great',
    });

    expect(prisma.doctor.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { rating: 4.5, reviewCount: 2 },
    });
  });

  it('rejects invalid rating', async () => {
    await expect(
      service.create(user, { doctorId: 'd1', patientId: 'p1', rating: 6 }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INVALID_RATING' }) });
  });
});
