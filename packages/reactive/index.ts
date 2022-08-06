interface EffectFn {
  (): void
  deps: Set<Dep>
  settings: EffectSettings
}
interface EffectSettings {
  scheduler?: (fn: EffectFn) => void
}
type Dep = Set<EffectFn>
type DepMap = Map<string | symbol, Dep>
type RawData = Record<string | symbol, any>

let activeEffect: EffectFn | null = null
const effectStack: EffectFn[] = []
const reactiveMap = new WeakMap<RawData, DepMap>()
export function createReactive<T extends RawData>(initialData: T): T {
  const reactive = new Proxy(initialData, {
    get(target, key) {
      track<T>(target, key)

      return target[key]
    },

    set(target, key, value) {
      target[key] = value

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
    effectSet = new Set<EffectFn>()
    depsMap.set(key, effectSet)
  }

  effectSet.add(activeEffect)

  activeEffect.deps.add(effectSet)
}

export function createEffect(fn: () => void, settings: EffectSettings = {}) {
  try {
    const effectFn: EffectFn = () => {
      cleanup(effectFn)

      activeEffect = effectFn
      effectStack.push(effectFn)
      fn()
    }
    effectFn.settings = settings
    effectFn.deps = new Set<Dep>()
    effectFn()
  }
  catch (err) {
    console.error(err)
  }
  finally {
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1] ?? null
  }
}

function cleanup(effectFn: EffectFn) {
  effectFn.deps.forEach(depSet => depSet.delete(effectFn))
  effectFn.deps.clear()
}

let isFlushing = false
let effectQueue: EffectFn[] = []
export function queueScheduler(fn: EffectFn) {
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
