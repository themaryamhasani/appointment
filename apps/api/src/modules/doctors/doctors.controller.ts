import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctors: DoctorsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search doctors' })
  findAll(@Query() query: any) {
    return this.doctors.findAll(query);
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.doctors.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctors.findOne(id);
  }

  @Post(':id/branches')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.DOCTOR_MANAGE)
  assignBranch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { branchId: string },
  ) {
    return this.doctors.assignBranch(user, id, body.branchId);
  }

  @Post(':id/specialties')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.DOCTOR_MANAGE)
  assignSpecialty(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { specialtyId: string; isPrimary?: boolean },
  ) {
    return this.doctors.assignSpecialty(user, id, body.specialtyId, body.isPrimary);
  }
}
