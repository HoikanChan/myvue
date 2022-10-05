import type { Dep, DepMap, EffectFn, EffectSettings, RawData } from './types'

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

export function trigger<T extends RawData>(target: T, key: string | symbol) {
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

export function track<T extends RawData>(target: T, key: string | symbol) {
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

