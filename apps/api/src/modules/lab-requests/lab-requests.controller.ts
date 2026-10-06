import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LabRequestsService } from './lab-requests.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Lab Requests')
@ApiBearerAuth()
@Controller('lab-requests')
export class LabRequestsController {
  constructor(private readonly labRequests: LabRequestsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.LAB_READ)
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.labRequests.findAll(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.LAB_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.labRequests.create(user, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.LAB_MANAGE)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.labRequests.updateStatus(user, id, body.status);
  }
}
