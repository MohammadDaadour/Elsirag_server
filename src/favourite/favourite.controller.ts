// src/favorite/favorite.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FavouriteService } from './favourite.service';
import { CreateFavouriteDto } from './dto/create-favourite.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('favourites')
export class FavouriteController {
  constructor(private readonly favoriteService: FavouriteService) { }

  @Post()
  addToFavorites(@Body() dto: CreateFavouriteDto, @Req() req) {
    return this.favoriteService.addToFavorites(req.user.id, dto.productId);
  }

  @Get()
  getFavorites(@Req() req) {
    return this.favoriteService.getUserFavorites(req.user.id);
  }

  @Delete(':productId')
  removeFavorite(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req,
  ) {
    return this.favoriteService.removeFavorite(req.user.id, productId);
  }
}
