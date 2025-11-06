// cloudinary.provider.ts
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';

export type CloudinaryType = typeof cloudinary;

export const CloudinaryProvider: Provider = {
  provide: 'CLOUDINARY',
  useFactory: (config: ConfigService): CloudinaryType => {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
      secure: true // Always use HTTPS
    });
    return cloudinary;
  },
  inject: [ConfigService],
};