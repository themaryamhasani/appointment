import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDoctor(doctorId: string) {
    return this.prisma.doctorReview.findMany({
      where: { doctorId },
      include: { patient: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    user: AuthUser,
    dto: { doctorId: string; patientId: string; rating: number; comment?: string },
  ) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new AppException('INVALID_RATING', 'Rating must be 1-5');
    }
    const doctor = await this.prisma.doctor.findUnique({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException();

    const review = await this.prisma.doctorReview.upsert({
      where: {
        doctorId_patientId: { doctorId: dto.doctorId, patientId: dto.patientId },
      },
      create: {
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        rating: dto.rating,
        comment: dto.comment,
      },
      update: { rating: dto.rating, comment: dto.comment },
    });

    const agg = await this.prisma.doctorReview.aggregate({
      where: { doctorId: dto.doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.doctor.update({
      where: { id: dto.doctorId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count.rating,
      },
    });

    return review;
  }
}
