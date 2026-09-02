import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ExtensionController } from './extension.controller';
import { ExtensionTokenGuard } from './extension-token.guard';
import { ExtensionTokenService } from './extension-token.service';

/**
 * Backend only. The browser extension itself is explicitly out of scope —
 * no manifest, no content script, no packaging.
 */
@Module({
  imports: [AssetsModule],
  controllers: [ExtensionController],
  providers: [ExtensionTokenService, ExtensionTokenGuard],
  exports: [ExtensionTokenService],
})
export class ExtensionModule {}
