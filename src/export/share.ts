/**
 * Hands a link to the system share sheet where there is one (phones), and copies it
 * otherwise. Returns what happened, for the message shown after.
 */
export async function shareLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
