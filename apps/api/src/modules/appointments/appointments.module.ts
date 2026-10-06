import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentStateMachine } from './appointment-state-machine';
import { SchedulesModule } from '../schedules/schedules.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SchedulesModule, AuditModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentStateMachine],
  exports: [AppointmentsService, AppointmentStateMachine],
})
export class AppointmentsModule {}
