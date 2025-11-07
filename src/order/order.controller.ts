import { Controller, Req, Get, Post, Body, Patch, Param, Delete, All, UseGuards, Logger, ParseIntPipe, BadRequestException, ForbiddenException, RawBody, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentService } from '../payment/payment.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService
  ) { }

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateOrderDto
  ) {
    const userId = req.user.id;
    return this.orderService.create(userId, dto);
  }

  @Get()
  @Roles('admin')
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10
  ) {
    if (page < 1) throw new BadRequestException('Page must be at least 1');
    if (limit < 1 || limit > 100) throw new BadRequestException('Limit must be between 1 and 100');

    const skip = (page - 1) * limit;

    const { data, total } = await this.orderService.findAll(skip, limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  @Get('mine')
  findMine(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10
  ) {
    if (page < 1) throw new BadRequestException('Page must be at least 1');
    if (limit < 1 || limit > 100) throw new BadRequestException('Limit must be between 1 and 100');

    return this.orderService.findUserOrders(req.user.id, (page - 1) * limit, limit);
  }

  @Get('mine/:id')
  async findOneMine(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number
  ) {
    const order = await this.orderService.findOne(id, req.user.id);

    if (order.user.id !== req.user.id) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    return order;
  }

  @Get(':id')
  @Roles('admin')
  async findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.orderService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any
  ) {
    return this.orderService.cancelOrder(id, req.user.id);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.remove(id);
  }

  @All('paymob-webhook')
  @Public()
  async handlePaymobWebhook(
    @RawBody() rawBody: Buffer,
    @Query('hmac') signature: string
  ) {

    this.logger.log(`Received Paymob webhook with signature: ${signature}`);

    if (!this.paymentService.validateWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const payload = JSON.parse(rawBody.toString());
    return this.orderService.handlePaymobWebhook(payload);
  }

}


// @UseGuards(PaymobWebhookGuard)

