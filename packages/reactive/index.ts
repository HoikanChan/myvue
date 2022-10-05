import type { Computed, Dep, DepMap, EffectFn, EffectSettings, RawData } from './types'

let activeEffect: EffectFn<any> | null = null
const effectStack: EffectFn<any>[] = []
const reactiveMap = new WeakMap<RawData, DepMap>()
export function createReactive<T extends RawData>(initialData: T): T {
  const reactive = new Proxy(initialData, {
    get(target, key) {
      track<T>(target, key)

      return Reflect.get(target, key)
    },

    set(target, key, value) {
      Reflect.set(target, key, value)
      trigger<T>(target, key)

      return true
    },
  })

  return reactive
}

function trigger<T extends RawData>(target: T, key: string | symbol) {
  const depsMap = reactiveMap.get(target)

  if (depsMap) {
    const effectSet = depsMap.get(key)
    if (effectSet) {
      [...effectSet].forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          const { scheduler } = effectFn.settings
          if (scheduler)
            scheduler(effectFn)
          else
            effectFn()
        }
      })
    }
  }
}

function track<T extends RawData>(target: T, key: string | symbol) {
  if (!activeEffect)
    return

  let depsMap = reactiveMap.get(target)
  if (!depsMap) {
    depsMap = new Map<string, Dep>()
    reactiveMap.set(target, depsMap)
  }

  let effectSet = depsMap.get(key)
  if (!effectSet) {
    effectSet = new Set<EffectFn<any>>()
    depsMap.set(key, effectSet)
  }

  effectSet.add(activeEffect)

  activeEffect.deps.add(effectSet)
}

export function createEffect<T>(fn: () => T, settings: EffectSettings = {}): EffectFn<T> {
  try {
    const effectFn: EffectFn<T> = () => {
      cleanup(effectFn)

      activeEffect = effectFn
      effectStack.push(effectFn)

      const result = fn()

      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1] ?? null
      return result
    }
    effectFn.settings = settings
    effectFn.deps = new Set<Dep>()

    if (!settings.lazy)
      effectFn()

    return effectFn
  }
  catch (err) {
    console.error(err)
    throw err
  }
}

function cleanup(effectFn: EffectFn<any>) {
  effectFn.deps.forEach(depSet => depSet.delete(effectFn))
  effectFn.deps.clear()
}

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
