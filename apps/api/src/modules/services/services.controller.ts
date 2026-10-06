import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Public()
  @Get()
  findAll(@Query('clinicId') clinicId: string) {
    return this.services.findByClinic(clinicId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.services.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SERVICE_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.services.create(user, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SERVICE_MANAGE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.services.update(user, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.SERVICE_MANAGE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.services.remove(user, id);
  }
}
