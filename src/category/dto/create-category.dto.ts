import { IsString, IsOptional, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 50, { message: 'Name must be between 2 and 50 characters.' })
  name: string;

  // @IsString()
  // @Length(3, 50)
  // slug: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Description must be less than 200 characters.' })
  description?: string;
}
