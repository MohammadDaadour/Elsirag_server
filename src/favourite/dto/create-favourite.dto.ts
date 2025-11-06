import { IsNotEmpty, isNumber, IsNumber } from "class-validator";
export class CreateFavouriteDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;
}