import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PrescriptionsService } from './prescriptions.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.VISIT_CREATE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.prescriptions.create(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.VISIT_READ)
  findAll(@CurrentUser() user: AuthUser, @Query('patientId') patientId?: string) {
    return this.prescriptions.findByPatient(user, patientId);
  }
}
