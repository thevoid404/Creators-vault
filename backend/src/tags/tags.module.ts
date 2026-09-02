import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

/**
 * TagsService was introduced in Phase 2 so that the `tags` field on asset
 * creation actually worked; Phase 3 adds the controller, CRUD and auto-suggest.
 *
 * The optional EMBEDDING_PROVIDER that TagsService injects is bound by
 * EmbeddingsModule in Phase 5. Until then the injection resolves to undefined
 * and the suggester takes its non-AI path.
 */
@Module({
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
