import {
  Injectable,
  BadRequestException,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from 'src/order-item/entities/order-item.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart-item/entities/cart-item.entity';
import { Product } from 'src/product/entities/product.entity';
import { User } from 'src/user/entities/user.entity';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { plainToInstance } from 'class-transformer';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);



  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,

    private readonly paymentService: PaymentService,
  ) { }

  async create(userId: number, dto: CreateOrderDto) {
    return this.orderRepo.manager.transaction(async (entityManager) => {
      try {
        // Validate delivery requirement
        if (dto.deliveryNeeded && !dto.shipping) {
          throw new BadRequestException('Shipping information is required for delivery');
        }

        // Fetch cart with lock to prevent race conditions
        const cart = await entityManager.findOne(Cart, {
          where: { user: { id: userId } },
          lock: { mode: 'pessimistic_write' }
        });

        if (!cart) {
          throw new BadRequestException('Cart not found');
        }

        // Then get the items with products in a separate query
        const cartWithItems = await entityManager.findOne(Cart, {
          where: { id: cart.id },
          relations: ['items', 'items.product']
        });

        if (!cartWithItems?.items?.length) {
          throw new BadRequestException('Cart is empty');
        }

        let totalCents = 0;
        const orderItems: OrderItem[] = [];

        for (const item of cartWithItems.items) {
          if (item.product.stock < item.quantity) {
            throw new ConflictException(
              `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`
            );
          }

          const priceCents = Math.round(item.product.price * 100);
          totalCents += priceCents * item.quantity;

          const orderItem = entityManager.create(OrderItem, {
            product: item.product,
            quantity: item.quantity,
            amount_cents: priceCents,
            name: item.product.name,
            description: item.product.description?.substring(0, 255) || '',
          });

          orderItems.push(orderItem);

          item.product.stock -= item.quantity;
          await entityManager.save(Product, item.product);
        }

        const order = entityManager.create(Order, {
          user: { id: userId },
          items: orderItems,
          total: totalCents,
          status: OrderStatus.PENDING,
          shipping: dto.shipping,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          currency: dto.currency || 'EGP',
          deliveryNeeded: dto.deliveryNeeded,
        });

        await entityManager.save(Order, order);
        await entityManager.remove(CartItem, cartWithItems.items);

        for (const item of orderItems) {
          item.order = plainToInstance(Order, { id: order.id });
        }

        await entityManager.save(OrderItem, orderItems);

        if (dto.paymentMethod === 'card') {
          try {
            // 1. Get user details for billing
            const user = await entityManager.findOne(User, {
              where: { id: userId }
            });

            // 2. Authenticate with Paymob
            const paymobToken = await this.paymentService.authenticate();

            // 3. Create Paymob order
            const paymobOrderId = await this.paymentService.createPaymobOrder(
              paymobToken,
              order.total,
              order.id,
              order.currency
            );

            const paymentToken = await this.paymentService.generatePaymentKey(
              paymobToken,
              order.total,
              paymobOrderId,
              {
                firstName: dto.shipping?.firstName,
                lastName: dto.shipping?.lastName,
                email: user?.email,
                phone: dto.shipping?.phoneNumber
              },
              order.currency
            );

            order.paymentGateway = 'paymob';
            order.paymentGatewayId = paymobOrderId.toString();
            await entityManager.save(Order, order);

            // 6. Attach payment URL to response
            order.paymentUrl = this.paymentService.getPaymentUrl(paymentToken);

            this.logger.log(`Paymob payment initialized for order ${order.id}`);
          } catch (paymobError) {
            this.logger.error(`Paymob integration failed: ${paymobError.message}`);
            // Don't block order creation if Paymob fails
          }
        }

        this.logger.log(`Order ${order.id} created for user ${userId}. Total: ${totalCents} cents`);
        return order;

      } catch (error) {
        this.logger.error(`Order creation failed: ${error.message}`, error.stack);
        if (error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
        throw new InternalServerErrorException('Failed to create order');
      }
    });
  }

  async findAll(skip: number = 0, take: number = 10) {
    const [data, total] = await this.orderRepo.findAndCount({
      skip,
      take,
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findUserOrders(userId: number, skip: number = 0, take: number = 10) {
    return this.orderRepo.find({
      where: { user: { id: userId } },
      skip,
      take,
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number, userId?: number) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Authorization check
    if (userId && order.user.id !== userId) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    return order;
  }

  // ================== UPDATE METHODS ================== //
  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id);

    // Validate status transition
    if (order.status === OrderStatus.DELIVERED && dto.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Delivered orders cannot be modified');
    }

    order.status = dto.status;
    await this.orderRepo.save(order);

    this.logger.log(`Order ${id} status updated to ${dto.status}`);
    return order;
  }

  async cancelOrder(id: number, userId?: number) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = OrderStatus.CANCELED;
    await this.orderRepo.save(order);

    if (userId && order.user.id !== userId) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    this.logger.log(`Order ${id} has been canceled`);
    return order;
  }


  // ================== PAYMOB WEBHOOK HANDLER ================== //
  async handlePaymobWebhook(payload: any) {
    this.logger.log(`Received Paymob webhook: ${JSON.stringify(payload)}`);

    //-----------------------------------\\
    const transaction = payload?.obj;
    if (!transaction) {
      throw new BadRequestException('Invalid webhook payload - missing transaction object');
    }

    const paymobOrderId = payload?.obj?.order?.id;
    if (!paymobOrderId) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const order = await this.orderRepo.findOne({
      where: { paymentGatewayId: paymobOrderId.toString() },
    });

    if (!order) throw new NotFoundException('Order not found');

    //------------------\\
    const isSuccessful = transaction.success;

    order.status = isSuccessful
      ? OrderStatus.CONFIRMED
      : OrderStatus.CANCELED;
    order.paymentGatewayMetadata = payload;

    if (isSuccessful) {
      this.logger.log(`Order ${order.id} confirmed via Paymob`);
    } else {
      this.logger.warn(`Order ${order.id} failed via Paymob. Error occurred: ${transaction.error_occured}, Pending: ${transaction.pending}`);
      if (transaction.data && Object.keys(transaction.data).length > 0) {
        this.logger.warn(`Transaction error data: ${JSON.stringify(transaction.data)}`);
      }
    }

    await this.orderRepo.manager.transaction(async (em) => {
      await em.save(Order, order);
    });
    return { success: true };
  }

  async remove(id: number) {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be deleted');
    }

    await this.orderRepo.remove(order);
    this.logger.warn(`Order ${id} deleted`);
    return { success: true };
  }
}