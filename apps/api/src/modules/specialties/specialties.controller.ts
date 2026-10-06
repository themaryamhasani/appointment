import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SpecialtiesService } from './specialties.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Specialties')
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialties: SpecialtiesService) {}

  @Public()
  @Get()
  findAll() {
    return this.specialties.findAll();
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.specialties.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SPECIALTY_MANAGE)
  create(@Body() dto: any) {
    return this.specialties.create(dto);
  }
}
