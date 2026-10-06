import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { AvailabilityService } from './availability.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';
import { IsString, IsOptional, IsBoolean, IsInt, IsIn, Min, Max, Matches } from 'class-validator';

class CreateScheduleDto {
  @IsString() doctorId!: string;
  @IsString() branchId!: string;
  @IsIn(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])
  dayOfWeek!: any;
  @Matches(/^\d{2}:\d{2}$/) startTime!: string;
  @Matches(/^\d{2}:\d{2}$/) endTime!: string;
  @IsOptional() @IsInt() @Min(5) @Max(120) slotDurationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) breakDurationMinutes?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) bufferMinutes?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Schedules')
@Controller()
export class SchedulesController {
  constructor(
    private readonly schedules: SchedulesService,
    private readonly availability: AvailabilityService,
  ) {}

  @Public()
  @Get('doctors/:doctorId/availability')
  @ApiOperation({ summary: 'Get computed availability slots for a doctor' })
  getAvailability(
    @Param('doctorId') doctorId: string,
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.availability.getAvailability({ doctorId, branchId, from, to });
  }

  @Get('doctors/:doctorId/schedules')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SCHEDULE_READ)
  findByDoctor(@Param('doctorId') doctorId: string, @Query('branchId') branchId?: string) {
    return this.schedules.findByDoctor(doctorId, branchId);
  }

  @Post('schedules')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    return this.schedules.create(user, dto);
  }

  @Patch('schedules/:id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>) {
    return this.schedules.update(user, id, dto);
  }

  @Post('schedule-exceptions')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SCHEDULE_MANAGE)
  createException(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.schedules.createException(user, dto);
  }

  @Post('slots/reserve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Temporarily reserve a slot (5 min hold)' })
  async reserve(
    @CurrentUser() user: AuthUser,
    @Body() body: { doctorId: string; branchId: string; date: string; time: string },
  ) {
    const ok = await this.availability.reserveSlot(
      body.doctorId,
      body.branchId,
      body.date,
      body.time,
      user.id,
    );
    return { reserved: ok };
  }
}
