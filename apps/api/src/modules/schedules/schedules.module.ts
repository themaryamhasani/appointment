import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { AvailabilityService } from './availability.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, AvailabilityService],
  exports: [SchedulesService, AvailabilityService],
})
export class SchedulesModule {}
