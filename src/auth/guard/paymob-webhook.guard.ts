import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
    InternalServerErrorException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaymobWebhookGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const signature = request.headers['x-paymob-signature'];
        const rawBody = request.rawBody;

        if (!signature) throw new UnauthorizedException('Missing signature');

        if (!rawBody) {
            Logger.error('Raw body missing in request');
            throw new InternalServerErrorException('Webhook processing error');
        }

        const secret = this.configService.get<string>('PAYMOB_HMAC_SECRET');

        if (!secret) {
            throw new Error('Missing PAYMOB_HMAC_SECRET in environment variables');
        }

        const hmac = crypto
            .createHmac('sha512', secret)
            .update(rawBody)
            .digest('hex');

        if (hmac !== signature) {
            throw new UnauthorizedException('Invalid signature');
        }

        return true;
    }
}