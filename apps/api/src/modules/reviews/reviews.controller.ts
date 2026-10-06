import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { Public, RequirePermissions } from '../../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '@healthcare/types';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('doctors/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.reviews.findByDoctor(doctorId);
  }

  @Post()
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.REVIEW_CREATE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.reviews.create(user, dto);
  }
}
