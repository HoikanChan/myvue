import type { Computed } from './types'
import { createEffect, track, trigger } from './index'

export function computed<T>(fn: () => T): Computed<T> {
  let valueCache: T
  let dirty = true
  const effect = createEffect<T>(fn, {
    lazy: true,
    scheduler: () => {
      dirty = true
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      trigger(valueAgent, 'value')
    },
  })

  const valueAgent = {
    get value() {
      if (dirty) {
        valueCache = effect()
        dirty = false
      }

      // track effect if computed is used in it
      track(valueAgent, 'value')
      return valueCache
    },
  }
  return valueAgent
}
