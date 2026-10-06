import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Visits')
@ApiBearerAuth()
@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Post('start')
  @RequirePermissions(PERMISSIONS.VISIT_CREATE)
  start(@CurrentUser() user: AuthUser, @Body() body: { appointmentId: string }) {
    return this.visits.start(user, body.appointmentId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.VISIT_READ)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.visits.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.VISIT_CREATE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.visits.update(user, id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.VISIT_COMPLETE)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.visits.complete(user, id);
  }
}
