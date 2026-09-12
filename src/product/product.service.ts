import { Injectable, NotFoundException, BadRequestException, HttpException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto, SortBy, SortOrder } from './dto/product-query.dto';
import { PaginatedResponse, PaginationMeta } from './dto/product-query.dto';
import { Category } from '../category/entities/category.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// Keep the real reason (e.g. an image upload rejected by Cloudinary) so the
// admin sees it instead of a bare "failed"; HTTP errors already carry theirs.
function describeFailure(prefix: string, error: unknown): string {
  if (error instanceof HttpException) return error.message;
  // Cloudinary throws plain strings for missing config, so accept those too.
  const reason = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return reason ? `${prefix}: ${reason}` : prefix;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(dto: CreateProductDto, files?: Express.Multer.File[]) {
    // Validate inputs
    if (!files || files.length === 0) {
      throw new BadRequestException("At least one image is required");
    }

    if (files.length > 5) {
      throw new BadRequestException("Maximum 5 images allowed");
    }

    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Invalid category');

    // Use transaction for data consistency
    return await this.productRepo.manager.transaction(async manager => {
      let uploadedImages: any[] = [];

      try {
        // Upload images first
        uploadedImages = await this.cloudinaryService.uploadImages(files);

        // Create product with uploaded images
        const product = manager.create(Product, {
          ...dto,
          category,
          images: uploadedImages.map(result => ({
            url: result.secure_url,
            public_id: result.public_id,
          }))
        });

        return await manager.save(product);

      } catch (error) {
        // Critical: Cleanup uploaded images on failure
        if (uploadedImages.length > 0) {
          await Promise.allSettled(
            uploadedImages.map(img =>
              this.cloudinaryService.deleteImage(img.public_id)
            )
          );
        }
        throw new BadRequestException(describeFailure('Failed to create product', error));
      }
    });
  }

  /** The public catalogue: active products, filterable by category and search. */
  async findAll(query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
    const queryBuilder = this.createQueryBuilder();

    queryBuilder.where('product.isActive = true');

    this.applyFilters(queryBuilder, query);
    this.applySorting(queryBuilder, query);

    return this.paginate(queryBuilder, query);
  }

  async getAllForAdmin(query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      minStock,
      isActive,
      sortBy = 'id',
      sortOrder = SortOrder.DESC,
    } = query;

    const qb = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    const columnMap = {
      id: 'product.id',
      name: 'product.name',
      price: 'product.price',
      stock: 'product.stock',
      createdAt: 'product."createdAt"',  // Quote the camelCase column
      updatedAt: 'product."updatedAt"'   // Quote the camelCase column
    };

    const orderByColumn = columnMap[sortBy] || columnMap.id;

    if (search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (minStock !== undefined) {
      qb.andWhere('product.stock >= :minStock', { minStock });
    }

    if (isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive });
    }

    qb.orderBy(orderByColumn, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, totalItems] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page * limit < totalItems,
        hasPrevPage: page > 1,
      },
    };
  }

  async findRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
    const currentProduct = await this.findOne(productId);

    return this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.categoryId = :categoryId', {
        categoryId: currentProduct.category.id
      })
      .andWhere('product.id != :productId', { productId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({ where: { id }, relations: ['category'] });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async search(
    searchTerm: string,
    query: ProductQueryDto
  ): Promise<PaginatedResponse<Product>> {
    const queryBuilder = this.createQueryBuilder();

    if (searchTerm) {
      queryBuilder.where(
        '(product.name ILIKE :search OR product.description ILIKE :search OR category.name ILIKE :search)',
        { search: `%${searchTerm}%` }
      );

      queryBuilder.addSelect(
        `CASE 
        WHEN product.name ILIKE :exact THEN 3
        WHEN product.name ILIKE :start THEN 2
        WHEN product.name ILIKE :contains THEN 1
        ELSE 0
      END`,
        'relevance'
      )
        .setParameters({
          exact: `${searchTerm}`,
          start: `${searchTerm}%`,
          contains: `%${searchTerm}%`
        })
        .orderBy('relevance', 'DESC');
    }

    this.applyFilters(queryBuilder, query);
    this.applySorting(queryBuilder, query);

    return this.paginate(queryBuilder, query);
  }

  async findByCategory(categoryId: number, query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
    const queryBuilder = this.createQueryBuilder();

    queryBuilder.where('category.id = :categoryId', { categoryId });

    this.applyFilters(queryBuilder, query);
    this.applySorting(queryBuilder, query);

    return this.paginate(queryBuilder, query);
  }

  async findFeatured(query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
    const queryBuilder = this.createQueryBuilder();

    // Stock is not tracked on a catalogue, so filtering by it would silently
    // hide any product left at zero.
    queryBuilder.where('product.isActive = true');

    this.applyFilters(queryBuilder, query);
    this.applySorting(queryBuilder, query);

    return this.paginate(queryBuilder, query);
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Invalid category');
      product.category = category;
    }

    const updated = Object.assign(product, dto);
    return this.productRepo.save(updated);
  }

  async updateImages(
    id: number,
    files: Express.Multer.File[],
    removePublicIds: string[] = []
  ): Promise<Product> {
    const product = await this.findOne(id);

    return await this.productRepo.manager.transaction(async manager => {
      let uploadedImages: any[] = [];

      try {
        if (removePublicIds.length > 0) {
          const imagesToRemove = product.images.filter(image =>
            removePublicIds.includes(image.public_id)
          );

          await Promise.allSettled(
            imagesToRemove.map(image =>
              this.cloudinaryService.deleteImage(image.public_id)
            )
          );

          product.images = product.images.filter(image =>
            !removePublicIds.includes(image.public_id)
          );
        }

        if (files && files.length > 0) {
          uploadedImages = await this.cloudinaryService.uploadImages(files);
          const newImages = uploadedImages.map(result => ({
            url: result.secure_url,
            public_id: result.public_id,
          }));

          product.images.push(...newImages);
        }

        return await manager.save(product);

      } catch (error) {
        if (uploadedImages.length > 0) {
          await Promise.allSettled(
            uploadedImages.map(img =>
              this.cloudinaryService.deleteImage(img.public_id)
            )
          );
        }
        throw new BadRequestException(describeFailure('Failed to update images', error));
      }
    });
  }

  async remove(id: number) {
    const product = await this.findOne(id);

    return await this.productRepo.manager.transaction(async manager => {
      try {
        this.logger.log(`Starting transactional deletion of product ${id}`);

        const imageDeletePromises = product.images?.map(async (image) => {
          try {
            await this.cloudinaryService.deleteImage(image.public_id);
            this.logger.log(`Deleted image: ${image.public_id}`);
          } catch (error) {
            this.logger.warn(`Failed to delete image ${image.public_id}: ${error.message}`);
          }
        }) || [];

        await Promise.allSettled(imageDeletePromises);

        await manager.remove(Product, product);

        this.logger.log(`Successfully deleted product ${id}`);
        return { message: 'Product deleted successfully', id };

      } catch (error) {
        this.logger.error(`Transaction failed for product ${id}: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to delete product: ${error.message}`);
      }
    });
  }

  private createQueryBuilder(): SelectQueryBuilder<Product> {
    return this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<Product>, query: ProductQueryDto): void {
    const searchTerm = query.search;

    if (searchTerm) {
      const sanitizedSearch = searchTerm.replace(/[%_]/g, '\\$&');
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product."nameAr" ILIKE :search OR product."descriptionAr" ILIKE :search)',
        { search: `%${sanitizedSearch}%` }
      );
    }

    if (query.categoryId !== undefined) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId: query.categoryId });
    }

    if (query.minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.minStock !== undefined) {
      queryBuilder.andWhere('product.stock >= :minStock', { minStock: query.minStock });
    }

    if (typeof query.isActive === 'boolean') {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: query.isActive });
    }
  }

  private applySorting(queryBuilder: SelectQueryBuilder<Product>, query: ProductQueryDto): void {
    const { sortBy, sortOrder } = query;

    switch (sortBy) {
      case SortBy.NAME:
        queryBuilder.orderBy('product.name', sortOrder);
        break;
      case SortBy.PRICE:
        queryBuilder.orderBy('product.price', sortOrder);
        break;
      case SortBy.STOCK:
        queryBuilder.orderBy('product.stock', sortOrder);
        break;
      case SortBy.CREATED_AT:
        queryBuilder.orderBy('product.createdAt', sortOrder);
        break;
      case SortBy.UPDATED_AT:
        queryBuilder.orderBy('product.updatedAt', sortOrder);
        break;
      default:
        queryBuilder.orderBy('product.id', sortOrder);
    }
  }

  private async paginate(
    queryBuilder: SelectQueryBuilder<Product>,
    query: ProductQueryDto
  ): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const [data, totalItems] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    const meta: PaginationMeta = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    return { data, meta };
  }
}
