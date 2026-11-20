/**
 * The storage abstraction.
 *
 * Business logic depends only on this interface — nothing in the assets module
 * knows whether a file lives on local disk, in S3 or in Cloudinary. Swapping the
 * implementation is a change to `STORAGE_DRIVER` and one new provider class; no
 * calling code changes.
 *
 * The interface is deliberately buffer-and-key based rather than path based:
 * paths are a local-disk concept and would leak that implementation into every
 * caller.
 */

/** Injection token. Concrete providers are bound to it in `StorageModule`. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface SaveFileInput {
  /** Scopes the stored object to a user, so a key cannot collide across accounts. */
  ownerId: string;
  buffer: Buffer;
  /** Original filename, used only to derive an extension and a default title. */
  originalName: string;
  mimeType: string;
}

export interface StoredFile {
  /**
   * Provider-agnostic identifier for the object. Persisted on the asset as
   * `storageKey`. For local disk it is a relative path; for S3 it would be the
   * object key. Callers must treat it as opaque.
   */
  key: string;
  /** Absolute URL a browser can fetch. */
  url: string;
  sizeBytes: number;
  mimeType: string;
  /** SHA-256 of the contents, used to spot duplicate uploads. */
  checksum: string;
}

export interface StorageProvider {
  /** Name of the concrete implementation, surfaced in logs and in /health. */
  readonly driver: string;

  save(input: SaveFileInput): Promise<StoredFile>;

  /** Removes an object. Must not throw when the key is already gone. */
  delete(key: string): Promise<void>;

  /** Absolute URL for a key. Synchronous, because callers use it while mapping rows. */
  getUrl(key: string): string;

  exists(key: string): Promise<boolean>;
}
