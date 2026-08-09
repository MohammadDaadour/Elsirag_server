import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  async create(dto: CreateUserDto) {
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  async createSocialUser(
    email: string,
    username: string,
    provider: string,
    socialId: string
  ) {
    const userData: any = {
      email,
      username,
      role: 'user',
      emailVerified: true,
    };

    if (provider === 'google') {
      userData.googleId = socialId;
    } else if (provider === 'facebook') {
      userData.facebookId = socialId;
    }

    const user = this.userRepo.create(userData);
    return this.userRepo.save(user);

  }

  async save(user: User) {
    return this.userRepo.save(user);
  }


  async findByGoogleId(googleId: string) {
    return this.userRepo.findOne({ where: { googleId } });
  }

  async findByFacebookId(facebookId: string) {
    return this.userRepo.findOne({ where: { facebookId } });
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  findAll() {
    return this.userRepo.find();
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, updateUserDto: Partial<User>) {
    return this.userRepo.save({ id, ...updateUserDto });
  }

  async remove(id: number, requesterId?: number) {
    // Registration was removed with the shop, so a deleted admin cannot be
    // recreated through the app. Refuse to let one delete themselves.
    if (requesterId !== undefined && requesterId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.findOne(id);
    await this.userRepo.remove(user);
    return { id, message: 'User deleted' };
  }
}
