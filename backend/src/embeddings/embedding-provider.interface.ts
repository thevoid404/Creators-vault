/**
 * The embedding abstraction.
 *
 * Declared here in Phase 3, ahead of any implementation, because tag
 * auto-suggest is the first consumer and must be written against the interface
 * rather than against a concrete provider. Phase 5 binds a real implementation
 * to this token and adds semantic search on top; nothing that consumes
 * embeddings changes when it does.
 *
 * The token is optional at injection time (`@Optional()`), which is what lets a
 * consumer degrade to a non-AI code path instead of failing when no provider is
 * configured. That is the required behaviour for search, and it is why tag
 * suggestion works today with no provider bound at all.
 */

/** Injection token. Concrete providers are bound to it in `EmbeddingsModule`. */
export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');

export interface EmbeddingResult {
  /** The vector itself. Length must equal `dimensions`. */
  vector: number[];
  /** Model identifier, stored on the asset so a re-index can spot stale vectors. */
  model: string;
}

export interface EmbeddingProvider {
  /** Name of the concrete implementation, surfaced in logs and in /health. */
  readonly driver: string;

  /**
   * Vector width this provider emits. Must match the `vector(N)` column in
   * `prisma/schema.prisma`, or writes will be rejected by Postgres.
   */
  readonly dimensions: number;

  /** Embeds a single piece of text. */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Embeds a batch. Providers that bill per request implement this as one call;
   * the default is simply a loop.
   */
  embedMany(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Whether the provider is usable right now — credentials present, model
   * reachable. Callers check this to decide whether to take the AI path or fall
   * back, rather than discovering the problem through a thrown error.
   */
  isAvailable(): Promise<boolean>;
}
