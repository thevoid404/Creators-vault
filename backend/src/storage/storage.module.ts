import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalDiskStorageProvider } from './providers/local-disk.storage';
import { STORAGE_PROVIDER, type StorageProvider } from './storage-provider.interface';

/**
 * Binds the configured driver to the `STORAGE_PROVIDER` token.
 *
 * This factory is the *only* place that knows which implementation is active.
 * Adding S3 means writing `S3StorageProvider` and adding one `case` here —
 * nothing that consumes storage changes.
 */
@Global()
@Module({
  providers: [
    LocalDiskStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalDiskStorageProvider],
      useFactory: (config: ConfigService, local: LocalDiskStorageProvider): StorageProvider => {
        const logger = new Logger('StorageModule');
        const driver = config.get<string>('storage.driver', 'local');

        switch (driver) {
          case 'local':
            logger.log('Storage driver: local disk');
            return local;
          default:
            logger.warn(
              `STORAGE_DRIVER="${driver}" is not implemented yet — falling back to local disk.`,
            );
            return local;
        }
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
