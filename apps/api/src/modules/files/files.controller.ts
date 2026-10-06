import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FILE_READ)
  findAll(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.files.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FILE_READ)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.findOne(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FILE_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.files.create(user, dto);
  }
}
