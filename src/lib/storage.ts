/**
 * Small, defensive localStorage helpers for browser-only features.
 * All callers provide a fallback so private browsing and malformed data
 * cannot break the page.
 */
export const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};

export const writeStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be disabled in private browsing or restricted webviews.
  }
};
