import { IsNumber, Min } from 'class-validator';

export class CreateCartItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;
}