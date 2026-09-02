import { AssetType } from '@prisma/client';
import { extname } from 'node:path';

/**
 * Maps a file onto an `AssetType`.
 *
 * Extension is checked before MIME type because the types that matter most to a
 * creator — a Figma file, a Sketch file, an .ai — are all served as
 * `application/octet-stream` and would otherwise all collapse into `other`.
 */
const EXTENSION_TYPES: Record<string, AssetType> = {
  // design files
  '.fig': AssetType.design_file,
  '.sketch': AssetType.design_file,
  '.xd': AssetType.design_file,
  '.psd': AssetType.design_file,
  '.ai': AssetType.design_file,
  '.indd': AssetType.design_file,
  '.afdesign': AssetType.design_file,
  '.afphoto': AssetType.design_file,
  '.blend': AssetType.design_file,
  // vectors
  '.svg': AssetType.vector,
  '.eps': AssetType.vector,
  // fonts
  '.ttf': AssetType.font,
  '.otf': AssetType.font,
  '.woff': AssetType.font,
  '.woff2': AssetType.font,
  '.eot': AssetType.font,
  // archives
  '.zip': AssetType.archive,
  '.rar': AssetType.archive,
  '.7z': AssetType.archive,
  '.tar': AssetType.archive,
  '.gz': AssetType.archive,
  // code
  '.ts': AssetType.code_snippet,
  '.tsx': AssetType.code_snippet,
  '.js': AssetType.code_snippet,
  '.jsx': AssetType.code_snippet,
  '.py': AssetType.code_snippet,
  '.rb': AssetType.code_snippet,
  '.go': AssetType.code_snippet,
  '.rs': AssetType.code_snippet,
  '.java': AssetType.code_snippet,
  '.php': AssetType.code_snippet,
  '.css': AssetType.code_snippet,
  '.scss': AssetType.code_snippet,
  '.html': AssetType.code_snippet,
  '.json': AssetType.code_snippet,
  '.yml': AssetType.code_snippet,
  '.yaml': AssetType.code_snippet,
  '.sh': AssetType.code_snippet,
  '.sql': AssetType.code_snippet,
  // documents
  '.pdf': AssetType.document,
  '.doc': AssetType.document,
  '.docx': AssetType.document,
  '.txt': AssetType.document,
  '.md': AssetType.document,
  '.rtf': AssetType.document,
  '.xls': AssetType.document,
  '.xlsx': AssetType.document,
  '.ppt': AssetType.document,
  '.pptx': AssetType.document,
};

export function inferAssetType(fileName: string, mimeType?: string | null): AssetType {
  const extension = extname(fileName).toLowerCase();
  const byExtension = EXTENSION_TYPES[extension];
  if (byExtension) {
    return byExtension;
  }

  const mime = (mimeType ?? '').toLowerCase();
  if (mime.startsWith('image/')) {
    return mime.includes('svg') ? AssetType.vector : AssetType.image;
  }
  if (mime.startsWith('video/')) {
    return AssetType.video;
  }
  if (mime.startsWith('audio/')) {
    return AssetType.audio;
  }
  if (mime.startsWith('font/')) {
    return AssetType.font;
  }
  if (mime.startsWith('text/')) {
    return AssetType.document;
  }
  if (mime === 'application/pdf') {
    return AssetType.document;
  }
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar')) {
    return AssetType.archive;
  }

  return AssetType.other;
}

/**
 * Type for an asset imported from a URL rather than uploaded. Known design tools
 * are recognised by domain so a pasted Figma link does not land as a generic
 * `link`.
 */
const DOMAIN_TYPES: Array<[RegExp, AssetType]> = [
  [/(^|\.)figma\.com$/, AssetType.design_file],
  [/(^|\.)sketch\.com$/, AssetType.design_file],
  [/(^|\.)framer\.com$/, AssetType.design_file],
  [/(^|\.)canva\.com$/, AssetType.design_file],
  [/(^|\.)fonts\.google\.com$/, AssetType.font],
  [/(^|\.)github\.com$/, AssetType.code_snippet],
  [/(^|\.)gitlab\.com$/, AssetType.code_snippet],
  [/(^|\.)codepen\.io$/, AssetType.code_snippet],
  [/(^|\.)youtube\.com$/, AssetType.video],
  [/(^|\.)vimeo\.com$/, AssetType.video],
];

export function inferAssetTypeFromUrl(url: string, contentType?: string | null): AssetType {
  let hostname: string;
  let pathname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname;
  } catch {
    return AssetType.link;
  }

  for (const [pattern, type] of DOMAIN_TYPES) {
    if (pattern.test(hostname)) {
      return type;
    }
  }

  // A direct link to a file — the path carries a recognisable extension.
  const fromPath = EXTENSION_TYPES[extname(pathname).toLowerCase()];
  if (fromPath) {
    return fromPath;
  }

  if (contentType) {
    const fromContentType = inferAssetType(pathname, contentType);
    if (fromContentType !== AssetType.other) {
      return fromContentType;
    }
  }

  return AssetType.link;
}
