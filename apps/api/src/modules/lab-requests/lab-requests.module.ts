import { Module } from '@nestjs/common';
import { LabRequestsService } from './lab-requests.service';
import { LabRequestsController } from './lab-requests.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LabRequestsController],
  providers: [LabRequestsService],
  exports: [LabRequestsService],
})
export class LabRequestsModule {}
