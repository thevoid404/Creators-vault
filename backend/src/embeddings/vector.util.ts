/**
 * Vector maths used on the application side.
 *
 * Similarity between *stored* assets is computed in Postgres by pgvector, which
 * can use the HNSW index; these helpers are for the cases where one or both
 * vectors are transient and were never written to a row — ranking candidate tag
 * names, for instance.
 */

/** Cosine similarity, in [-1, 1]. Returns 0 for a zero vector or a length mismatch. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Maps a cosine similarity onto the 0–1 score the API reports.
 *
 * Text embeddings rarely go meaningfully negative, so the raw value is clamped
 * at zero rather than rescaled from -1: rescaling would report an unrelated pair
 * as "50% similar", which is worse than useless in a UI.
 */
export function similarityToScore(cosine: number): number {
  return Math.round(Math.max(0, Math.min(1, cosine)) * 10000) / 10000;
}

/** Formats a vector as the `[1,2,3]` literal pgvector accepts. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
