// facebook.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private authService: AuthService,
        private configService: ConfigService
    ) {
        super({
            clientID: configService.get<string>('FACEBOOK_APP_ID')!,
            clientSecret: configService.get<string>('FACEBOOK_APP_SECRET')!,
            callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
            profileFields: ['id', 'emails', 'name', 'displayName'],
            scope: ['email']
        }); 
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (err: any, user: any, info?: any) => void
    ) {
        const { id, name, emails } = profile;
        const user = {
            id,
            email: emails[0].value,
            name: name.givenName + ' ' + name.familyName,
            provider: 'facebook'
        };

        const token = await this.authService.handleSocialUser(user, 'facebook');
        done(null, { token });
    }
}