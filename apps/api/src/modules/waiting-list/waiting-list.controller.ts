import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WaitingListService } from './waiting-list.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Waiting List')
@ApiBearerAuth()
@Controller('waiting-list')
export class WaitingListController {
  constructor(private readonly waitingList: WaitingListService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.WAITING_LIST_READ)
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.waitingList.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WAITING_LIST_MANAGE)
  join(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.waitingList.join(user, dto);
  }

  @Patch(':id/promote')
  @RequirePermissions(PERMISSIONS.WAITING_LIST_MANAGE)
  promote(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.waitingList.promote(user, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.WAITING_LIST_MANAGE)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.waitingList.cancel(user, id);
  }
}
