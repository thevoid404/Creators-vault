import { ConfigService } from '@nestjs/config';
import { cosineSimilarity } from '../vector.util';
import { LocalEmbeddingProvider } from './local-embedding.provider';

describe('LocalEmbeddingProvider', () => {
  const provider = new LocalEmbeddingProvider(new ConfigService());

  const similarity = async (a: string, b: string) => {
    const [first, second] = await provider.embedMany([a, b]);
    return cosineSimilarity(first.vector, second.vector);
  };

  it('emits vectors of the configured width', async () => {
    const { vector } = await provider.embed('dashboard mockup');
    expect(vector).toHaveLength(provider.dimensions);
  });

  it('is deterministic across calls', async () => {
    const first = await provider.embed('AudioLux dashboard');
    const second = await provider.embed('AudioLux dashboard');
    expect(first.vector).toEqual(second.vector);
  });

  it('produces unit-length vectors', async () => {
    // Normalisation is what makes cosine distances comparable across assets with
    // very different amounts of text.
    const { vector } = await provider.embed('a longer piece of text with several words in it');
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('scores overlapping text far above unrelated text', async () => {
    const related = await similarity('dark mode dashboard mockup', 'dashboard mockup in dark mode');
    const unrelated = await similarity(
      'dark mode dashboard mockup',
      'watercolour botanical illustration',
    );

    expect(related).toBeGreaterThan(0.5);
    expect(unrelated).toBeLessThan(0.2);
    expect(related).toBeGreaterThan(unrelated);
  });

  it('scores an exact repeat as 1', async () => {
    expect(await similarity('gradient poster', 'gradient poster')).toBeCloseTo(1, 5);
  });

  it('is sensitive to word order through bigrams', async () => {
    // Same words, different order: close, because the unigrams match, but not
    // identical, because the bigrams do not.
    const reordered = await similarity('dark mode dashboard', 'dashboard mode dark');
    expect(reordered).toBeGreaterThan(0.4);
    expect(reordered).toBeLessThan(0.999);
  });

  it('does not let stop words create false similarity', async () => {
    const score = await similarity('the icon of the set', 'a poster with the frame');
    expect(score).toBeLessThan(0.2);
  });

  it('returns a zero vector for text with nothing indexable', async () => {
    const { vector } = await provider.embed('!!! ???');
    expect(vector.every((value) => value === 0)).toBe(true);
  });

  it('reports itself as always available', async () => {
    // The point of this provider: no key, no network, no failure mode.
    await expect(provider.isAvailable()).resolves.toBe(true);
  });
});
