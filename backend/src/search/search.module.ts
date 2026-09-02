import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { AssetSimilarityController, SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * EmbeddingsModule is global, so EmbeddingsService needs no import here.
 * AssetsModule is imported for its ownership check, and does not import this
 * module back — the dependency runs one way only.
 */
@Module({
  imports: [AssetsModule],
  controllers: [SearchController, AssetSimilarityController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
