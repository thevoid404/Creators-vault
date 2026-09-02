import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingProvider, EmbeddingResult } from '../embedding-provider.interface';

/**
 * A local, dependency-free `EmbeddingProvider` built on feature hashing
 * (the "hashing trick").
 *
 * **What it is honestly good for.** Each token is hashed to a dimension and
 * accumulated with a sign and a sub-linear term weight, then the vector is L2
 * normalised. The result is a real vector whose cosine similarity is a genuine
 * measure of *term overlap* — it reliably finds near-duplicates, versions of the
 * same asset, and assets sharing vocabulary. It is **not** semantic: it does not
 * know that "font" and "typeface" are related, because nothing in it was ever
 * trained on language.
 *
 * That is the deliberate trade. It costs nothing, needs no API key, no Python
 * sidecar and no network, so semantic search and similarity work out of the box
 * on a fresh clone. Setting `EMBEDDING_DRIVER=gemini` swaps in true semantic
 * embeddings without touching a line of calling code — which is the whole reason
 * this sits behind an interface.
 *
 * Word bigrams are included alongside single tokens so that word *order* carries
 * some weight: "dark mode dashboard" and "dashboard dark mode" are close but not
 * identical, and both are far from "dark dashboard mode lighting".
 */
@Injectable()
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly driver = 'local';
  readonly dimensions: number;

  private static readonly MODEL = 'local-feature-hash-v1';

  /**
   * Very common words carry no discriminating signal and would otherwise
   * dominate the shorter texts that asset titles usually are.
   */
  private static readonly STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'but',
    'by',
    'for',
    'from',
    'has',
    'have',
    'in',
    'into',
    'is',
    'it',
    'its',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'was',
    'were',
    'will',
    'with',
  ]);

  constructor(config: ConfigService) {
    this.dimensions = config.get<number>('embedding.dimensions', 384);
  }

  async isAvailable(): Promise<boolean> {
    // Nothing to reach; it is always usable. That is the point of it existing.
    return true;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    return { vector: this.hashText(text), model: LocalEmbeddingProvider.MODEL };
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  private hashText(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    const counts = new Map<string, number>();

    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !LocalEmbeddingProvider.STOP_WORDS.has(token));

    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    for (let i = 0; i < tokens.length - 1; i += 1) {
      const bigram = `${tokens[i]}_${tokens[i + 1]}`;
      counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
    }

    for (const [term, count] of counts) {
      const hash = LocalEmbeddingProvider.fnv1a(term);
      const index = hash % this.dimensions;
      // A second bit of the hash decides the sign, so unrelated terms colliding
      // on one dimension tend to cancel rather than reinforce.
      const sign = (hash >>> 31) & 1 ? -1 : 1;
      // Sub-linear term frequency: the tenth repeat of a word says much less
      // than the second.
      vector[index] += sign * (1 + Math.log(count));
    }

    return LocalEmbeddingProvider.normalise(vector);
  }

  /** FNV-1a: fast, stable across runs, and well spread for short strings. */
  private static fnv1a(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      // The FNV prime, via shifts, to stay inside 32-bit integer maths.
      hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
    }
    return hash >>> 0;
  }

  /**
   * L2 normalisation. With unit-length vectors, cosine similarity is a plain dot
   * product, which is what makes the pgvector `<=>` distances comparable across
   * assets of very different text lengths.
   */
  private static normalise(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((value) => value / magnitude);
  }
}
