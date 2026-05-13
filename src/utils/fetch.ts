/**
 * Fetch a URL and parse the response body as JSON.
 *
 * Returns `null` instead of throwing when:
 *  - the network request fails,
 *  - the response status is not OK,
 *  - the body cannot be parsed as JSON.
 *
 * Designed for best-effort metadata fetches where the caller treats a
 * missing/invalid resource as a soft failure.
 */
export async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
    })
    if (!res.ok) return null
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch {
    return null
  }
}
