import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';
import { IsString, IsOptional, IsIn, Matches, MinLength, MaxLength } from 'class-validator';

class CreateAppointmentDto {
  @IsString() doctorId!: string;
  @IsString() branchId!: string;
  @IsOptional() @IsString() patientId?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) appointmentDate!: string;
  @Matches(/^\d{2}:\d{2}$/) startTime!: string;
  @IsOptional() @IsIn(['IN_PERSON', 'TELEHEALTH']) visitType?: 'IN_PERSON' | 'TELEHEALTH';
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsString() specialtyId?: string;
}

class CancelDto {
  @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}

class RescheduleDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) appointmentDate!: string;
  @Matches(/^\d{2}:\d{2}$/) startTime!: string;
  @IsOptional() @IsString() branchId?: string;
}

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CREATE)
  @ApiOperation({ summary: 'Book an appointment' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENT_READ)
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.appointments.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_READ)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointments.findOne(user, id);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CANCEL)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.appointments.cancel(user, id, dto.reason);
  }

  @Post(':id/check-in')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_UPDATE)
  checkIn(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointments.checkIn(user, id);
  }

  @Post(':id/confirm')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_UPDATE)
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointments.confirm(user, id);
  }

  @Post(':id/reschedule')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_UPDATE)
  @ApiOperation({ summary: 'Reschedule appointment to a new slot' })
  reschedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.appointments.reschedule(user, id, dto);
  }

  @Post(':id/no-show')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_UPDATE)
  noShow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointments.markNoShow(user, id);
  }
}
