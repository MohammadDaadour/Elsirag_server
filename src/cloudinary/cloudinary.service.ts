import { Injectable, Inject, Logger } from '@nestjs/common';
import { CloudinaryType } from './cloudinary.provider';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);

    constructor(
        @Inject('CLOUDINARY')
        private readonly cloudinary: CloudinaryType
    ) { }

    async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
        if (!file) {
            throw new Error('No file provided');
        }

        return new Promise((resolve, reject) => {
            const upload = this.cloudinary.uploader.upload_stream(
                {
                    folder: 'products',
                    resource_type: 'auto'
                },
                (error: UploadApiErrorResponse, result: UploadApiResponse) => {
                    if (error) {
                        this.logger.error('Cloudinary upload error', error);
                        return reject(new Error(`Upload failed: ${error.message}`));
                    }

                    if (!result) {
                        return reject(new Error('No response from Cloudinary'));
                    }

                    resolve(result);
                }
            );

            upload.on('error', (error) => {
                this.logger.error('Upload stream error', error);
                reject(error);
            });

            upload.end(file.buffer);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        try {
            const result = await this.cloudinary.uploader.destroy(publicId);
            if (result.result !== 'ok') {
                throw new Error(`Failed to delete image: ${result.result}`);
            }
        } catch (error) {
            this.logger.error(`Error deleting image ${publicId}`, error.stack);
            throw new Error('Failed to delete image from Cloudinary');
        }
    }

    async uploadImages(files: Express.Multer.File[]): Promise<UploadApiResponse[]> {
        const uploadPromises = files.map(async (file, index) => {
            try {
                return await this.uploadImage(file);
            } catch (error) {
                this.logger.error(`Failed to upload file ${index}:`, error);
                throw error;
            }
        });

        return Promise.all(uploadPromises);
    }

    async getImageInfo(publicId: string): Promise<any> {
        return this.cloudinary.api.resource(publicId);
    }

    extractPublicId(url: string): string {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return filename.split('.')[0];
    }

    
}