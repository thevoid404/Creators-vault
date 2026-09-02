import { extractKeywords } from './keyword.util';

const terms = (input: Parameters<typeof extractKeywords>[0]) =>
  extractKeywords(input).map((keyword) => keyword.term);

describe('extractKeywords', () => {
  it('ranks title terms above description terms', () => {
    const result = extractKeywords([
      { text: 'Dashboard mockup', weight: 1 },
      { text: 'A rough illustration exploring layout', weight: 0.5 },
    ]);

    const dashboard = result.find((keyword) => keyword.term === 'dashboard');
    const illustration = result.find((keyword) => keyword.term === 'illustration');

    expect(dashboard).toBeDefined();
    expect(illustration).toBeDefined();
    expect(dashboard!.weight).toBeGreaterThan(illustration!.weight);
  });

  it('emits adjacent pairs, because useful tags are often two words', () => {
    expect(terms([{ text: 'dark mode landing page', weight: 1 }])).toEqual(
      expect.arrayContaining(['dark mode', 'landing page']),
    );
  });

  it('drops stop words and format noise', () => {
    const result = terms([{ text: 'The final copy of the logo png file', weight: 1 }]);

    expect(result).toContain('logo');
    for (const noise of ['the', 'final', 'copy', 'png', 'file']) {
      expect(result).not.toContain(noise);
    }
  });

  it('drops bare numbers and very short words', () => {
    const result = terms([{ text: 'v2 ui 2026 gradient', weight: 1 }]);

    expect(result).toContain('gradient');
    expect(result).not.toContain('ui'); // under the 3-character floor
    expect(result).not.toContain('2026');
  });

  it('ignores empty and missing input', () => {
    expect(
      terms([
        { text: null, weight: 1 },
        { text: undefined, weight: 1 },
      ]),
    ).toEqual([]);
  });

  it('returns terms sorted by weight, strongest first', () => {
    const weights = extractKeywords([
      { text: 'Gradient poster artwork', weight: 1 },
      { text: 'poster', weight: 0.5 },
    ]).map((keyword) => keyword.weight);

    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });
});
