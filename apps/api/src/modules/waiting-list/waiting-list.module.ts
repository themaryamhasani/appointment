import { Module } from '@nestjs/common';
import { WaitingListService } from './waiting-list.service';
import { WaitingListController } from './waiting-list.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [WaitingListController],
  providers: [WaitingListService],
  exports: [WaitingListService],
})
export class WaitingListModule {}
