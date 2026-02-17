import { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";
import { PgStorageProvider } from "./postgres";

export type { StorageProvider } from "./types";
export { LocalStorageProvider } from "./local";
export { S3StorageProvider } from "./s3";
export { PgStorageProvider } from "./postgres";

let _storage: StorageProvider | null = null;
let _tableEnsured = false;

export function getStorage(): StorageProvider {
  if (_storage) return _storage;

  const storageType = process.env.STORAGE_TYPE || "local";

  if (storageType === "s3") {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET is required when STORAGE_TYPE=s3");

    _storage = new S3StorageProvider({
      bucket,
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  } else if (storageType === "postgres") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required when STORAGE_TYPE=postgres");

    const provider = new PgStorageProvider(url);
    // Ensure the storage table exists (lazy, once per cold start)
    if (!_tableEnsured) {
      provider.ensureTable().then(() => { _tableEnsured = true; }).catch(() => {});
    }
    _storage = provider;
  } else {
    const basePath = process.env.LOCAL_STORAGE_PATH || "./data/reports";
    _storage = new LocalStorageProvider(basePath);
  }

  return _storage;
}
