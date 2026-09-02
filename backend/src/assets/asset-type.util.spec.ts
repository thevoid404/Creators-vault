import { AssetType } from '@prisma/client';
import { inferAssetType, inferAssetTypeFromUrl } from './asset-type.util';

describe('inferAssetType', () => {
  it('recognises design files that browsers report as octet-stream', () => {
    // The reason extension is checked before MIME type: every one of these
    // arrives as application/octet-stream.
    expect(inferAssetType('AudioLux.fig', 'application/octet-stream')).toBe(AssetType.design_file);
    expect(inferAssetType('logo.sketch', 'application/octet-stream')).toBe(AssetType.design_file);
    expect(inferAssetType('poster.psd', 'application/octet-stream')).toBe(AssetType.design_file);
  });

  it('separates vectors from raster images', () => {
    expect(inferAssetType('icon.svg', 'image/svg+xml')).toBe(AssetType.vector);
    expect(inferAssetType('shot.png', 'image/png')).toBe(AssetType.image);
  });

  it('falls back to the MIME type when the extension is unknown', () => {
    expect(inferAssetType('clip', 'video/mp4')).toBe(AssetType.video);
    expect(inferAssetType('track', 'audio/mpeg')).toBe(AssetType.audio);
    expect(inferAssetType('notes', 'application/pdf')).toBe(AssetType.document);
  });

  it('returns other when nothing identifies the file', () => {
    expect(inferAssetType('mystery', 'application/octet-stream')).toBe(AssetType.other);
  });
});

describe('inferAssetTypeFromUrl', () => {
  it('recognises known design and code hosts', () => {
    expect(inferAssetTypeFromUrl('https://www.figma.com/file/abc/AudioLux')).toBe(
      AssetType.design_file,
    );
    expect(inferAssetTypeFromUrl('https://github.com/nestjs/nest')).toBe(AssetType.code_snippet);
    expect(inferAssetTypeFromUrl('https://fonts.google.com/specimen/Inter')).toBe(AssetType.font);
  });

  it('uses the path extension for a direct file link', () => {
    expect(inferAssetTypeFromUrl('https://cdn.example.com/pack/icon.svg')).toBe(AssetType.vector);
    expect(inferAssetTypeFromUrl('https://example.com/brand/guide.pdf')).toBe(AssetType.document);
  });

  it('treats an ordinary page as a link', () => {
    expect(inferAssetTypeFromUrl('https://example.com/some/article')).toBe(AssetType.link);
  });

  it('does not match a lookalike domain', () => {
    // The host patterns are anchored, so "figma.com.evil.test" must not pass.
    expect(inferAssetTypeFromUrl('https://figma.com.evil.test/file/abc')).toBe(AssetType.link);
  });
});
