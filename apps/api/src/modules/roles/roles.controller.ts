import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  findAll(@CurrentUser() user: AuthUser, @Query('clinicId') clinicId?: string) {
    return this.roles.findAll(user, clinicId);
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  findPermissions() {
    return this.roles.findPermissions();
  }
}
