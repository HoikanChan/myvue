import type { EffectFn } from '../types'

let isFlushing = false
let effectQueue: EffectFn<any>[] = []
export function queueScheduler(fn: EffectFn<any>) {
  if (!effectQueue.includes(fn))
    effectQueue.push(fn)

  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(() => {
      effectQueue.forEach(fn => fn())
    }).finally(() => {
      isFlushing = false
      effectQueue = []
    })
  }
}
