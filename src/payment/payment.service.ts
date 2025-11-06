import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async authenticate(): Promise<string> {
        try {
            const response = await firstValueFrom(
                this.httpService.post('https://accept.paymobsolutions.com/api/auth/tokens', {
                    api_key: this.configService.get('PAYMOB_API_KEY'),
                })
            );
            return response.data.token;
        } catch (error) {
            this.logger.error('Paymob authentication failed', error.response?.data);
            throw error;
        }
    }

    async createPaymobOrder(
        token: string,
        amountCents: number,
        merchantOrderId: number,
        currency: string = 'EGP'
    ): Promise<number> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://accept.paymobsolutions.com/api/ecommerce/orders',
                    {
                        auth_token: token,
                        delivery_needed: false,
                        amount_cents: amountCents,
                        currency,
                        merchant_order_id: merchantOrderId.toString(),
                    }
                )
            );
            return response.data.id;
        } catch (error) {
            this.logger.error('Paymob order creation failed', error.response?.data);
            throw error;
        }
    }

    async generatePaymentKey(
        token: string,
        amountCents: number,
        paymobOrderId: number,
        user: any,
        currency: string = 'EGP'
    ): Promise<string> {
        try {
            const billingData = {
                first_name: user.firstName || 'Test',
                last_name: user.lastName || 'User',
                email: user.email || 'test@example.com',
                phone_number: user.phone || '+201000000000',
                country: 'EG',
                city: user.city || 'Cairo',
                street: user.street || 'N/A',
                building: user.building || 'N/A',
                floor: user.floor || '0',
                apartment: user.apartment || '0',
                postal_code: user.postalCode || '00000'
            };

            const response = await firstValueFrom(
                this.httpService.post(
                    'https://accept.paymobsolutions.com/api/acceptance/payment_keys',
                    {
                        auth_token: token,
                        amount_cents: amountCents,
                        expiration: 3600,
                        order_id: paymobOrderId,
                        billing_data: billingData,
                        currency,
                        integration_id: this.configService.get('PAYMOB_CARD_INTEGRATION_ID'),
                    }
                )
            );
            return response.data.token;
        } catch (error) {
            this.logger.error('Payment key generation failed', error.response?.data);
            throw error;
        }
    }

    getPaymentUrl(paymentToken: string): string {
        return `https://accept.paymobsolutions.com/api/acceptance/iframes/${this.configService.get('PAYMOB_IFRAME_ID')}?payment_token=${paymentToken}`;
    }

    validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
        const secret = this.configService.get<string>('PAYMOB_HMAC_SECRET');

        if (!secret) {
            this.logger.error('Missing PAYMOB_HMAC_SECRET');
            throw new InternalServerErrorException('Payment configuration error');
        }

        const payload = JSON.parse(rawBody.toString('utf8'));
        const obj = payload.obj;

        // Manual field concatenation in lexicographical order (per Paymob docs)
        const hmacString =
            obj.amount_cents +
            obj.created_at +
            obj.currency +
            obj.error_occured +
            obj.has_parent_transaction +
            obj.id +
            obj.integration_id +
            obj.is_3d_secure +
            obj.is_auth +
            obj.is_capture +
            obj.is_refunded +
            obj.is_standalone_payment +
            obj.is_voided +
            obj.order.id +
            obj.owner +
            obj.pending +
            obj.source_data.pan +
            obj.source_data.sub_type +
            obj.source_data.type +
            obj.success;

        this.logger.debug(`Raw HMAC string: ${hmacString}`);

        const computedHmac = createHmac('sha512', secret)
            .update(hmacString)
            .digest('hex');

        const isValid = computedHmac === signature;

        this.logger.debug(`Computed HMAC: ${computedHmac}`);
        this.logger.debug(`Received HMAC: ${signature}`);
        this.logger.debug(`HMAC Valid: ${isValid}`);

        return isValid;
    }

}