import {
  Controller, Post, Get, Patch, Delete,
  Param, Body, UseGuards, UseInterceptors,
  UploadedFiles, BadRequestException, Query,
  Logger, ParseIntPipe 
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5, {
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  @Roles('admin')
  create(@Body() dto: CreateProductDto, @UploadedFiles() files: Express.Multer.File[],) {
    return this.productService.create(dto, files);
  }

  @Get()
  @Public()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get('search')
  @Public()
  async search(
    @Query() searchQuery: SearchQueryDto
  ) {

    const page = searchQuery.page ?? 1;
    const limit = searchQuery.limit ?? 5;

    return this.productService.search(
      searchQuery.q,
      {
        page,
        limit,
        minPrice: searchQuery.minPrice,
        maxPrice: searchQuery.maxPrice
      })
  }

  @Get('category/:categoryId')
  @Public()
  findByCategory(@Param('categoryId') categoryId: string, @Query() query: ProductQueryDto) {
    return this.productService.findByCategory(+categoryId, query);
  }

  @Get('featured')
  @Public()
  findFeatured(@Query() query: ProductQueryDto) {
    return this.productService.findFeatured(query);
  }

  @Get(':id/related')
  @Public()
  async findRelated(@Param('id') id: string, @Query('limit') limit: number = 4) {
    return this.productService.findRelatedProducts(+id, limit);
  }

  @Get('admin')
  @Roles('admin')
  async getAllForAdmin(@Query() query: ProductQueryDto) {
    return this.productService.getAllForAdmin(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(+id, dto);
  }

  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images', 5, {
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  @Roles('admin')
  updateImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('remove') removePublicIds: string[]
  ) {
    return this.productService.updateImages(+id, files, removePublicIds);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
