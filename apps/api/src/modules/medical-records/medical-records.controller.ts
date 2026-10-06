import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Medical Records')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly records: MedicalRecordsService) {}

  @Get('me')
  @RequirePermissions(PERMISSIONS.VISIT_READ)
  mine(@CurrentUser() user: AuthUser) {
    return this.records.findForPatient(user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.VISIT_READ)
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (patientId) return this.records.findForPatient(user, patientId);
    return this.records.findAll(user, { clinicId, page, limit });
  }
}
