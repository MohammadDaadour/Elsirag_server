import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CategoryModule } from '../category/category.module';
import { Category } from '../category/entities/category.entity'; 
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
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
  providers: [ProductService],
})
export class ProductModule { }
