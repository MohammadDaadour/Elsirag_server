import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from './entities/variant.entity';
import { Option } from './entities/option.entity';
import { Attribute } from './entities/attribute.entity';
import { Product } from './entities/product.entity';
import { CreateAttributeDto, GetVariantsQueryDto } from './dto/variant.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(Variant) private variantRepository: Repository<Variant>,
    @InjectRepository(Option) private optionRepository: Repository<Option>,
    @InjectRepository(Attribute) private attributeRepository: Repository<Attribute>,
    @InjectRepository(Product) private productRepository: Repository<Product>
  ) { }

  async create(createVariantDto: {
    productId: number;
    sku: string;
    price: number;
    stock: number;
    options?: number[];
  }): Promise<Variant> {
    return await this.variantRepository.manager.transaction(async (transactionalEntityManager) => {
      // Create basic variant
      const variant = transactionalEntityManager.create(Variant, {
        product: { id: createVariantDto.productId },
        sku: createVariantDto.sku,
        price: createVariantDto.price,
        stock: createVariantDto.stock,
      });

      // Handle options if provided
      if (createVariantDto.options && createVariantDto.options.length > 0) {
        const options = await this.optionRepository.findByIds(createVariantDto.options);
        if (options.length !== createVariantDto.options.length) {
          throw new BadRequestException('Some options were not found');
        }
        variant.options = options;
      }

      return await transactionalEntityManager.save(variant);
    });
  }

  async save(variant: Variant): Promise<Variant> {
    return await this.variantRepository.save(variant);
  }

  async findAllForAdmin(query: GetVariantsQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'id',
      sortOrder = 'ASC',
      search,
      productId,
      minStock,
      maxStock,
      minPrice,
      maxPrice,
    } = query;

    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(variant.sku LIKE :search OR variant.name LIKE :search OR product.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Product filter
    if (productId) {
      queryBuilder.andWhere('variant.productId = :productId', { productId });
    }

    // Stock filters
    if (minStock !== undefined) {
      queryBuilder.andWhere('variant.stock >= :minStock', { minStock });
    }
    if (maxStock !== undefined) {
      queryBuilder.andWhere('variant.stock <= :maxStock', { maxStock });
    }

    // Price filters
    if (minPrice !== undefined) {
      queryBuilder.andWhere('variant.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('variant.price <= :maxPrice', { maxPrice });
    }

    // Sorting
    queryBuilder.orderBy(`variant.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [variants, total] = await queryBuilder.getManyAndCount();

    return {
      data: variants,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async update({
    variantId,
    stock,
    price
  }: {
    variantId: number;
    stock?: number;
    price?: number;
  }): Promise<void> {
    // Validate input
    if (stock === undefined && price === undefined) {
      throw new BadRequestException("At least one field (stock or price) must be provided.");
    }

    if (price !== undefined && price < 0) {
      throw new BadRequestException("Price cannot be negative.");
    }

    if (stock !== undefined && stock < 0) {
      throw new BadRequestException("Stock cannot be negative.");
    }

    // Find variant
    const variant = await this.variantRepository.findOneById(variantId);
    if (!variant) {
      throw new NotFoundException(`Variant with ID ${variantId} not found.`);
    }

    // Update fields
    if (price !== undefined) {
      variant.price = price;
    }
    if (stock !== undefined) {
      variant.stock = stock;
    }

    // Persist changes
    await this.variantRepository.save(variant);
  }

  // Attribute management service
  async createAttributeWithOptions(createAttributeDto: {
    name: string;
    type: string;
    options: string[];
  }) {

    const existingAttribute = await this.attributeRepository.findOne({ where: { name: createAttributeDto.name } });
    if (existingAttribute) {
      throw new BadRequestException(`Attribute with name ${createAttributeDto.name} already exists`);
    }

    return await this.attributeRepository.manager.transaction(async (manager) => {
      const attribute = manager.create(Attribute, {
        name: createAttributeDto.name,
        type: createAttributeDto.type,
      });
      const savedAttribute = await manager.save(Attribute, attribute);

      const optionPromises = createAttributeDto.options.map(optionValue => {
        const option = manager.create(Option, {
          value: optionValue,
          attribute: savedAttribute,
        });
        return manager.save(Option, option);
      });

      savedAttribute.options = await Promise.all(optionPromises);
      return savedAttribute;
    });
  }

  async findBySku(sku: string) {
    return this.variantRepository.findOne({ where: { sku } });
  }

  async findAllAtt() {
    return await this.attributeRepository.find({
      relations: ['options', 'products'],
    });
  }
}