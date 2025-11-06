import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider'; // 👈 Import the provider
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CloudinaryController],
  providers: [
    CloudinaryProvider, 
    CloudinaryService,
  ],
  exports: [
    CloudinaryService, 
  ],
})
export class CloudinaryModule { }