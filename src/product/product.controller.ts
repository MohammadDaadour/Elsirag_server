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
import { GetVariantsQueryDto } from './dto/variant.dto';
import { RolesGuard } from 'src/auth/guard/roles.guard';

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
  findAll() {
    return this.productService.findAll();
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

  @Get('/attributes')
  @Public()
  async getAllAtt() {
    return this.productService.variantsService.findAllAtt();
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


  @Post('attributes')
  createAttribute(@Body() createAttributeDto: any) {
    return this.productService.variantsService.createAttributeWithOptions(createAttributeDto);
  }

  @Post(':id/attributes')
  @Roles('admin')
  assignAttributes(
    @Param('id') id: string,
    @Body() { attributes }: { attributes: number[] }
  ) {
    return this.productService.assignAttributesToProduct(+id, attributes);
  }

  @Post(':id/variants')
  async createVariant(@Param('id') id: string, @Body() createVariantDto: any) {
    if (createVariantDto.generate) {
      await this.productService.generateVariants(+id, { price: createVariantDto.price, stock: createVariantDto.stock });
      return { message: 'Variants generated' };
    }
    const variant = await this.productService.variantsService.create({ productId: +id, ...createVariantDto });
    return variant;
  }

  @Get('/variants')
  @Roles("admin")
  async findAllVariants(@Query() query: GetVariantsQueryDto) {
    return this.productService.variantsService.findAllForAdmin(query);
  }

  @Patch('variants/:id')
  async updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVariantDto: any,
  ) {
    await this.productService.variantsService.update({
      variantId: id,
      ...updateVariantDto,
    });
    
    return {
      message: 'Variant updated successfully',
    };
  }
}
