import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { assertClinicAccess } from '../../common/utils/helpers';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadRoot() {
    return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  }

  async create(
    user: AuthUser,
    dto: {
      clinicId?: string;
      originalName: string;
      mimeType: string;
      contentBase64: string;
      entityType?: string;
      entityId?: string;
    },
  ) {
    if (dto.clinicId) assertClinicAccess(user, dto.clinicId);
    const buffer = Buffer.from(dto.contentBase64, 'base64');
    const filename = `${randomUUID()}-${dto.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const dir = this.uploadRoot();
    await mkdir(dir, { recursive: true });
    const path = join(dir, filename);
    await writeFile(path, buffer);

    return this.prisma.file.create({
      data: {
        clinicId: dto.clinicId,
        uploadedById: user.id,
        filename,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: buffer.length,
        path,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
  }

  async findAll(user: AuthUser, query: { clinicId?: string; entityType?: string; entityId?: string }) {
    const where: Record<string, unknown> = {};
    if (query.clinicId) {
      assertClinicAccess(user, query.clinicId);
      where.clinicId = query.clinicId;
    }
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    return this.prisma.file.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(user: AuthUser, id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException();
    if (file.clinicId) assertClinicAccess(user, file.clinicId);
    return file;
  }
}
