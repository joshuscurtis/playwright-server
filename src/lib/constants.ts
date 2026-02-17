/**
 * Application-wide constants. Centralises hardcoded values so they can be
 * tuned from a single location.
 */

export const API_DEFAULTS = {
  /** Default number of items per page. */
  PAGE_LIMIT: 50,
  /** Maximum allowed page limit. */
  PAGE_MAX: 100,
  /** Number of reports shown in analytics trend charts. */
  ANALYTICS_TREND_LIMIT: 20,
  /** Number of slowest tests to return. */
  ANALYTICS_SLOWEST_LIMIT: 10,
  /** Number of flaky test records to scan. */
  ANALYTICS_FLAKY_SCAN: 20,
  /** Number of failed test records to scan for categorisation. */
  ANALYTICS_FAILURE_SCAN: 50,
  /** Maximum sample tests per failure category. */
  ANALYTICS_CATEGORY_SAMPLE: 3,
} as const;

export const CACHE = {
  /** Cache-Control header for immutable assets (1 year). */
  IMMUTABLE: "public, max-age=31536000, immutable",
} as const;

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
} as const;

/** Max upload size in bytes (100 MB). */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
