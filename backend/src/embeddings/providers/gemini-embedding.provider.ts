import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance } from 'axios';
import type { EmbeddingProvider, EmbeddingResult } from '../embedding-provider.interface';

interface GeminiEmbeddingResponse {
  embedding?: { values: number[] };
}

interface GeminiBatchResponse {
  embeddings?: Array<{ values: number[] }>;
}

/**
 * True semantic embeddings from Gemini's free tier.
 *
 * Chosen over a local `sentence-transformers` model because that would mean
 * shipping a Python sidecar and a model download — a lot of operational weight
 * for a solo developer, when a free-tier API key achieves the same thing.
 *
 * `text-embedding-004` natively emits 768 dimensions but supports
 * `outputDimensionality`, so it is asked for 384 to match the `vector(384)`
 * column. It is a Matryoshka-style model, meaning the leading dimensions carry
 * the most information and truncation degrades gracefully — this is a supported
 * use, not a hack. Raising `EMBEDDING_DIMENSIONS` requires changing the column
 * and re-indexing, which is why the value is documented in one place.
 */
@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly driver = 'gemini';
  readonly dimensions: number;

  private readonly logger = new Logger(GeminiEmbeddingProvider.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('embedding.geminiApiKey') ?? '';
    this.model = config.get<string>('embedding.geminiModel') ?? 'text-embedding-004';
    this.dimensions = config.get<number>('embedding.dimensions', 384);
    this.http = axios.create({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 15000,
    });
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async embed(text: string): Promise<EmbeddingResult> {
    this.assertConfigured();

    const { data } = await this.http.post<GeminiEmbeddingResponse>(
      `/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        model: `models/${this.model}`,
        content: { parts: [{ text: this.truncate(text) }] },
        // Indexing stored documents, not the query — the two use different task
        // types, and mismatching them measurably degrades retrieval quality.
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: this.dimensions,
      },
    );

    const vector = data.embedding?.values;
    if (!vector?.length) {
      throw new ServiceUnavailableException('Gemini returned an empty embedding.');
    }
    return { vector, model: this.model };
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    this.assertConfigured();
    if (texts.length === 0) {
      return [];
    }

    // One request per batch rather than per text: the free tier is
    // rate-limited by request count, so batching is what keeps a bulk re-index
    // inside the quota.
    const { data } = await this.http.post<GeminiBatchResponse>(
      `/models/${this.model}:batchEmbedContents?key=${this.apiKey}`,
      {
        requests: texts.map((text) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text: this.truncate(text) }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: this.dimensions,
        })),
      },
    );

    const embeddings = data.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      this.logger.warn(
        `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`,
      );
      throw new ServiceUnavailableException('Gemini returned an incomplete batch.');
    }
    return embeddings.map((embedding) => ({ vector: embedding.values, model: this.model }));
  }

  private assertConfigured(): void {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not set. Set EMBEDDING_DRIVER=local to run without it.',
      );
    }
  }

  /**
   * Caps input length. The model's own limit is well above this; the cap is
   * about cost and latency, and an asset's identity is carried by its opening
   * text rather than by a long description's tail.
   */
  private truncate(text: string): string {
    return text.slice(0, 8000);
  }
}
