import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';
import { IsString } from 'class-validator';

class AssignRoleDto {
  @IsString() userId!: string;
  @IsString() roleId!: string;
  @IsString() clinicId!: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('clinics/:clinicId/staff')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  findStaff(
    @CurrentUser() user: AuthUser,
    @Param('clinicId') clinicId: string,
    @Query() query: any,
  ) {
    return this.users.findStaff(user, clinicId, query);
  }

  @Post('staff/assign-role')
  @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  assignRole(@CurrentUser() user: AuthUser, @Body() dto: AssignRoleDto) {
    return this.users.assignRole(user, dto);
  }
}
