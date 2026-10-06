import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Branches')
@Controller()
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Public()
  @Get('clinics/:clinicId/branches')
  findByClinic(@Param('clinicId') clinicId: string) {
    return this.branches.findByClinic(clinicId);
  }

  @Public()
  @Get('branches/:id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  @Post('branches')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.branches.create(user, dto);
  }

  @Patch('branches/:id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.branches.update(user, id, dto);
  }
}
