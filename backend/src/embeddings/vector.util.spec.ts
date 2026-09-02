import { cosineSimilarity, similarityToScore, toVectorLiteral } from './vector.util';

describe('cosineSimilarity', () => {
  it('is 1 for identical directions and 0 for orthogonal ones', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('ignores magnitude, comparing direction only', () => {
    expect(cosineSimilarity([1, 2, 3], [10, 20, 30])).toBeCloseTo(1);
  });

  it('is -1 for opposite directions', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 rather than NaN for degenerate input', () => {
    // A zero vector has no direction; dividing by its norm would produce NaN and
    // poison every score downstream.
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe('similarityToScore', () => {
  it('clamps negatives to zero instead of rescaling', () => {
    // Rescaling -1..1 onto 0..1 would report an unrelated pair as "50% similar".
    expect(similarityToScore(-0.4)).toBe(0);
    expect(similarityToScore(-1)).toBe(0);
  });

  it('clamps above 1 and rounds to four places', () => {
    expect(similarityToScore(1.2)).toBe(1);
    expect(similarityToScore(0.123456)).toBe(0.1235);
  });
});

describe('toVectorLiteral', () => {
  it('formats the literal pgvector accepts', () => {
    expect(toVectorLiteral([1, 2.5, -3])).toBe('[1,2.5,-3]');
  });
});
