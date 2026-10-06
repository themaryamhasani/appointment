import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.patients.getMe(user.id);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.patients.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PATIENT_READ)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.patients.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PATIENT_MANAGE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.patients.update(user, id, dto);
  }
}
