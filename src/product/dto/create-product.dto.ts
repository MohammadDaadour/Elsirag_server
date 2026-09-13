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
import { Transform, Type, plainToInstance } from 'class-transformer';

// Products are created via multipart (the images travel with the fields), so
// array fields arrive as JSON strings. Parse them into DTO instances so the
// nested validators still run; JSON bodies pass through untouched.
const parseJsonArray =
  <T extends object>(cls: new () => T) =>
  ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    if (value.trim() === '') return undefined;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? plainToInstance(cls, parsed) : parsed;
    } catch {
      return value;
    }
  };

// Empty multipart fields come through as "", which @Type(() => Number) turns
// into 0 before this runs, so look at the raw field on the source object.
const emptyToUndefined = ({ value, obj, key }: { value: unknown; obj: Record<string, unknown>; key: string }) => {
  const raw = obj?.[key];
  return typeof raw === 'string' && raw.trim() === '' ? undefined : value;
};

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

  @IsOptional()
  @IsString()
  labelAr?: string;

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

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  // Optional: a product priced only by sheet count has no base price.
  @IsOptional()
  @Transform(emptyToUndefined)
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

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
  @Transform(emptyToUndefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packSize?: number;

  @IsOptional()
  @Transform(parseJsonArray(ProductSpecDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

  @IsOptional()
  @Transform(parseJsonArray(ProductPriceOptionDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceOptionDto)
  priceOptions?: ProductPriceOptionDto[];
}
