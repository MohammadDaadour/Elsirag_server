import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductImage {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  public_id: string;
}

export class ProductSpecDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  value: string;
}

export class ProductPriceOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @ValidateNested({ each: true })
  @Type(() => ProductImage)
  images: ProductImage[];

  // Optional: the catalogue does not track stock. The column is kept so no
  // historical data is lost, and defaults to 0 when omitted.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  categoryId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packSize?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceOptionDto)
  priceOptions?: ProductPriceOptionDto[];
}
