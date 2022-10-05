import { createEffect } from './index'
export interface WatchOptions {
  immediate?: boolean
  flush?: 'sync' | 'post'
}
export type Cleanup = () => void
export type OnInvalidate = (cu: Cleanup) => void
export type WatchCallback<T> = (newVal: T, oldVal: T, onInvalidate: OnInvalidate) => void
export function watch<T>(source: T | (() => T), callback: WatchCallback<T>, options: WatchOptions = {}) {
  let getter: Function
  if (typeof source === 'function')
    getter = source

  else
    getter = () => traverse(source)

  let newVal: T, oldVal: T
  let cleanup: Cleanup
  const onInvalidate = (fn: Cleanup) => {
    cleanup = fn
  }
  const job = () => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    newVal = effectFn()
    if (cleanup)
      cleanup()
    callback(newVal, oldVal, onInvalidate)
    oldVal = newVal
  }

  const effectFn = createEffect(
    () => getter(),
    {
      lazy: true,
      scheduler: () => {
        if (options.flush === 'post')
          Promise.resolve().then(job)
        else
          job()
      },
    },
  )

  if (options.immediate)
    job()
  else
    oldVal = effectFn()
}

function traverse(value: any, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value))
    return
  seen.add(value)
  for (const k in value)
    traverse(value[k], seen)

  return value
}
