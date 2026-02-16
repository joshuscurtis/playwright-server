import { Readable } from "stream";

export interface StorageProvider {
  /** Upload a file from a Buffer */
  put(key: string, data: Buffer, contentType?: string): Promise<void>;

  /** Get file contents as a Buffer */
  get(key: string): Promise<Buffer>;

  /** Get file as a readable stream */
  getStream(key: string): Promise<Readable>;

  /** Delete a single file */
  delete(key: string): Promise<void>;

  /** Delete all files under a prefix */
  deletePrefix(prefix: string): Promise<void>;

  /** Check if a file exists */
  exists(key: string): Promise<boolean>;

  /** List files under a prefix */
  list(prefix: string): Promise<string[]>;
}
