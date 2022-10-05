import { createEffect } from './index'

export function watch<T>(source: T | (() => T), callback: (newVal: T, oldVal: T) => void) {
  let getter: Function
  if (typeof source === 'function')
    getter = source

  else
    getter = () => traverse(source)

  let newVal: T, oldVal: T
  const effectFn = createEffect(
    () => getter(),
    {
      lazy: true,
      scheduler: () => {
        newVal = effectFn()
        callback(newVal, oldVal)
        oldVal = newVal
      },
    },
  )
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
