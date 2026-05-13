/**
 * Run an async function over a list of items, but only N at a time.
 *
 * Think of it as a "worker pool": we spawn `limit` workers that share a queue.
 * Each worker picks the next item, awaits `fn`, then picks the next one, until
 * the list is empty. This avoids hammering an external service (e.g. an IPFS
 * gateway) with hundreds of parallel requests, while still being much faster
 * than a sequential `for await` loop.
 *
 * Results keep the original input order, regardless of which worker finished
 * first. `limit` is clamped to `[1, items.length]`, so passing a value larger
 * than the input is safe.
 *
 * @example
 *   const data = await mapWithConcurrency(urls, 8, url => fetchJson(url))
 *
 * @param items - The list to iterate over.
 * @param limit - Max number of `fn` calls running at the same time.
 * @param fn    - Async function called with `(item, index)` for each item.
 * @returns     - Results in the same order as `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  const workerCount = Math.max(1, Math.min(limit, items.length))

  let nextIndex = 0
  const takeNext = () => nextIndex++

  const runWorker = async () => {
    while (true) {
      const index = takeNext()
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  }

  const workers = Array.from({ length: workerCount }, runWorker)
  await Promise.all(workers)

  return results
}
