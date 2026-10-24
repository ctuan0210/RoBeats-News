/**
 * Safe JSON parser for Fetch API responses.
 * Prevents "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * when a server returns an empty body, 204 No Content, non-JSON text, or errors.
 */
export async function safeJson<T = any>(response: Response, fallback: any = null): Promise<T> {
  try {
    const text = await response.text();
    if (!text || !text.trim()) {
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch (err) {
    return fallback;
  }
}
