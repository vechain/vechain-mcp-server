import { AsyncLocalStorage } from 'node:async_hooks'
import { ThorNetworkType } from './config'

type RequestContext = {
  network?: ThorNetworkType
}

const storage = new AsyncLocalStorage<RequestContext>()

/**
 * Run `fn` with a per-request network override available to any code that
 * later calls `getRequestNetwork()` (and through it `getThorClient()`,
 * `getThorNetworkType()`, `getThorNodeUrl()` and helpers built on top).
 *
 * If `network` is undefined the surrounding context is preserved.
 */
export function runWithRequestNetwork<T>(
  network: ThorNetworkType | undefined,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  if (!network) return fn()
  return storage.run({ network }, fn)
}

/**
 * Read the per-request network override, if any was set by an ancestor
 * `runWithRequestNetwork` frame. Returns `undefined` outside a request scope
 * (callers MUST then fall back to the env-configured default).
 */
export function getRequestNetwork(): ThorNetworkType | undefined {
  return storage.getStore()?.network
}
