import { ExtensionTokenService } from './extension-token.service';

describe('ExtensionTokenService.isWellFormed', () => {
  const valid = `${ExtensionTokenService.tokenPrefix}${'a'.repeat(48)}`;

  it('accepts a correctly shaped token', () => {
    expect(ExtensionTokenService.isWellFormed(valid)).toBe(true);
  });

  it('rejects a token without the prefix', () => {
    // The prefix is what makes a leaked token recognisable for what it is.
    expect(ExtensionTokenService.isWellFormed('a'.repeat(55))).toBe(false);
  });

  it('rejects tokens of the wrong length', () => {
    expect(ExtensionTokenService.isWellFormed(`${ExtensionTokenService.tokenPrefix}abc`)).toBe(
      false,
    );
    expect(
      ExtensionTokenService.isWellFormed(`${ExtensionTokenService.tokenPrefix}${'a'.repeat(64)}`),
    ).toBe(false);
  });

  it('rejects missing and non-string input', () => {
    expect(ExtensionTokenService.isWellFormed(undefined)).toBe(false);
    expect(ExtensionTokenService.isWellFormed('')).toBe(false);
  });

  it('uses a prefix that identifies the token’s purpose', () => {
    expect(ExtensionTokenService.tokenPrefix).toBe('cv_ext_');
  });
});
