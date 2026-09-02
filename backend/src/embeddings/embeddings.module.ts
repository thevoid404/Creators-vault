import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from './embedding-provider.interface';
import { EmbeddingsService } from './embeddings.service';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';
import { LocalEmbeddingProvider } from './providers/local-embedding.provider';

/**
 * Binds the configured driver to the `EMBEDDING_PROVIDER` token.
 *
 * As with storage, this factory is the only place that knows which
 * implementation is live. Business logic — tag suggestion, indexing, semantic
 * search — depends on the interface alone, so adding a provider is a new class
 * and one `case`.
 *
 * Global, because `TagsService` has injected this token optionally since
 * Phase 3 and now resolves it for real without a change to that module.
 */
@Global()
@Module({
  providers: [
    LocalEmbeddingProvider,
    GeminiEmbeddingProvider,
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService, LocalEmbeddingProvider, GeminiEmbeddingProvider],
      useFactory: (
        config: ConfigService,
        local: LocalEmbeddingProvider,
        gemini: GeminiEmbeddingProvider,
      ): EmbeddingProvider => {
        const logger = new Logger('EmbeddingsModule');
        const driver = config.get<string>('embedding.driver', 'local');

        switch (driver) {
          case 'gemini':
            if (!config.get<string>('embedding.geminiApiKey')) {
              logger.warn(
                'EMBEDDING_DRIVER=gemini but GEMINI_API_KEY is empty — falling back to the local provider.',
              );
              return local;
            }
            logger.log(`Embedding driver: gemini (${config.get('embedding.geminiModel')})`);
            return gemini;

          case 'local':
            logger.log('Embedding driver: local feature hashing (lexical, not semantic)');
            return local;

          default:
            logger.warn(
              `EMBEDDING_DRIVER="${driver}" is not implemented — falling back to the local provider.`,
            );
            return local;
        }
      },
    },
    EmbeddingsService,
  ],
  exports: [EMBEDDING_PROVIDER, EmbeddingsService],
})
export class EmbeddingsModule {}
