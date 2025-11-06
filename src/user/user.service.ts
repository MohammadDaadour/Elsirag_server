import { Injectable } from '@nestjs/common';
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

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update(id: number, updateUserDto: Partial<User>) {
    return this.userRepo.save({ id, ...updateUserDto });
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
