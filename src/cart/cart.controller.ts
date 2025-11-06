import { Controller, Req, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartItemDto } from 'src/cart-item/dto/create-cart-item.dto';
import { UpdateCartItemDto } from 'src/cart-item/dto/update-cart-item.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  getCart(@Req() req) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  addToCart(@Req() req, @Body() dto: CreateCartItemDto) {
    console.log('req.user:', req.user);
    return this.cartService.addToCart(req.user.id, dto);
  }

  @Patch('item/:id')
  updateCartItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
    @Req() req: any
  ) {
    return this.cartService.updateItem(id, dto, req.user.id);
  }

  @Delete('item/:id')
  removeItem(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Post('merge')
  async mergeCarts(
    @Req() req,
    @Body() localItems: CreateCartItemDto[]
  ) {
    return this.cartService.mergeCarts(req.user.id, localItems);
  }

  @Delete('clear')
  clearCart(@Req() req) {
    return this.cartService.clearCart(req.user.id);
  }
}

