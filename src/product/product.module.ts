import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CategoryModule } from 'src/category/category.module';
import { Category } from 'src/category/entities/category.entity'; 
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Variant } from './entities/variant.entity'; // new
import { Attribute } from './entities/attribute.entity'; // new
import { Option } from './entities/option.entity'; // new

import { VariantsService } from './variants.service'; // new

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Variant, Attribute, Option]), 
    CategoryModule, 
    CloudinaryModule,
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, 
      },
    }),
  ],
  controllers: [ProductController],
  providers: [ProductService, VariantsService],
})
export class ProductModule { }
