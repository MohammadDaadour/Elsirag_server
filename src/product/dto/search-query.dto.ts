import { IsOptional, IsString, MinLength, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchQueryDto {
    @IsString()
    @MinLength(1, { message: 'Search term must be at least 2 characters' })
    readonly q: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    readonly page?: number = 1;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Transform(({ value }) => {
        const num = parseInt(value, 10);
        return num > 100 ? 100 : num; // Enforce maximum limit
    }, { toClassOnly: true })
    readonly limit: number = 5;

    @IsOptional()
    readonly minPrice?: number;

    @IsOptional()
    readonly maxPrice?: number;
}