import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Insurance')
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insurance: InsuranceService) {}

  @Public()
  @Get('providers')
  findProviders(@Query('clinicId') clinicId: string) {
    return this.insurance.findProviders(clinicId);
  }

  @Post('providers')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  createProvider(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.insurance.createProvider(user, dto);
  }

  @Patch('providers/:id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  updateProvider(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.insurance.updateProvider(user, id, dto);
  }

  @Get('patients/:patientId')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.INSURANCE_READ)
  findPatient(@Param('patientId') patientId: string) {
    return this.insurance.findPatientInsurance(patientId);
  }

  @Post('patients')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.INSURANCE_MANAGE)
  linkPatient(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.insurance.linkPatient(user, dto);
  }
}
