import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { StorageModule } from '../storage/storage.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { UrlMetadataService } from './url-metadata.service';

@Module({
  imports: [
    StorageModule,
    UsersModule,
    TagsModule,
    // No `dest` and no `storage`, so Multer keeps each file in memory and hands
    // it to the StorageProvider as a Buffer. Writing to a temp path instead would
    // leak a local-disk assumption past the storage abstraction.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: config.get<number>('storage.maxUploadSizeMB', 100) * 1024 * 1024,
        },
      }),
    }),
  ],
  controllers: [AssetsController],
  providers: [AssetsService, UrlMetadataService],
  exports: [AssetsService, UrlMetadataService],
})
export class AssetsModule {}
