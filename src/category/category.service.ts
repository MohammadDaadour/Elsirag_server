import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  private async upload(file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadImage(file);
    return { url: result.secure_url, public_id: result.public_id };
  }

  /** A failed cleanup should never fail the request it belongs to. */
  private async discard(publicId?: string | null) {
    if (!publicId) return;
    await Promise.allSettled([this.cloudinaryService.deleteImage(publicId)]);
  }

  async create(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const image = file ? await this.upload(file) : null;

    try {
      const category = this.repo.create({ ...dto, image });
      return await this.repo.save(category);
    } catch (error) {
      // Do not leave an orphaned upload behind if the insert fails.
      await this.discard(image?.public_id);
      throw new BadRequestException('Failed to create category');
    }
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const category = await this.repo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto, file?: Express.Multer.File) {
    const category = await this.findOne(id);
    const previousPublicId = category.image?.public_id;

    Object.assign(category, dto);
    if (file) {
      category.image = await this.upload(file);
    }

    const saved = await this.repo.save(category);

    // Only drop the old image once its replacement is safely stored.
    if (file && previousPublicId) {
      await this.discard(previousPublicId);
    }

    return saved;
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    const publicId = category.image?.public_id;

    const removed = await this.repo.remove(category);
    await this.discard(publicId);
    return removed;
  }
}
