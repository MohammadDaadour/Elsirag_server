import { Module } from '@nestjs/common';
import { LinkService } from './link.service';
import { LinkController } from './link.controller';
import { LinkData } from './entities/link-data.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports:[TypeOrmModule.forFeature([LinkData])],
  controllers: [LinkController],
  providers: [LinkService],

  exports: [LinkService]
})
export class LinkModule {}
