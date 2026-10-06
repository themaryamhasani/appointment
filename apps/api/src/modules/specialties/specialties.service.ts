import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
      include: { _count: { select: { doctors: true } } },
    });
  }

  async findBySlug(slug: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { slug },
      include: {
        doctors: {
          include: {
            doctor: {
              include: {
                user: { select: { firstName: true, lastName: true, avatarUrl: true } },
                specialties: { include: { specialty: true } },
              },
            },
          },
        },
      },
    });
    if (!specialty) throw new NotFoundException({ code: 'SPECIALTY_NOT_FOUND', message: 'Not found' });
    return specialty;
  }

  async create(dto: {
    nameFa: string; nameEn: string; slug: string;
    descriptionFa?: string; descriptionEn?: string;
  }) {
    return this.prisma.specialty.create({ data: dto });
  }
}
