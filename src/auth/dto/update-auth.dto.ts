import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '../../user/dto/create-user.dto';

export class UpdateAuthDto extends PartialType(CreateUserDto) {}
