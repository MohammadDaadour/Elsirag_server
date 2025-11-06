import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { LinkData } from './entities/link-data.entity';

@Injectable()
export class LinkService {
  constructor(
    @InjectRepository(LinkData)
    private readonly linkDataRepository: Repository<LinkData>,
  ) {}

  async storeLinkData(data: {
    userId: string;
    provider: string;
    socialId: string;
    expiresAt: Date;
  }): Promise<string> {
    const token = uuidv4();
    const linkData = this.linkDataRepository.create({
      token,
      userId: data.userId,
      provider: data.provider,
      socialId: data.socialId,
      expiresAt: data.expiresAt,
    });

    await this.linkDataRepository.save(linkData);
    return token;
  }

  async validateLinkToken(token: string): Promise<LinkData> {
    const linkData = await this.linkDataRepository.findOne({ where: { token } });

    if (!linkData) {
      throw new NotFoundException('Link token not found');
    }

    if (linkData.expiresAt < new Date()) {
      await this.linkDataRepository.delete({ token });
      throw new UnauthorizedException('Link token has expired');
    }

    return linkData;
  }

  async deleteLinkToken(token: string): Promise<void> {
    const result = await this.linkDataRepository.delete({ token });
    if (result.affected === 0) {
      throw new NotFoundException('Link token not found');
    }
  }
}