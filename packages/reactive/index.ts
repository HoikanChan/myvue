type Effect = () => void;
type Dep = Set<Effect>;
type DepMap = Map<string | symbol, Dep>;
type RawData = Record<string | symbol, any>;

let activeEffect: Effect | null = null;
let activeEffectDependencies = new WeakMap<Effect, Set<Dep>>();;
const effectMap = new WeakMap<RawData, DepMap>();
export function createReactive<T extends RawData>(initialData: T): T {
  const reactive = new Proxy(initialData, {
    get(target, key) {
      track<T>(target, key);

      return target[key];
    },

    set(target, key, value) {
      target[key] = value;

      trigger<T>(target, key);

      return true;
    }
  })

  return reactive;
}

function trigger<T extends RawData>(target: T, key: string | symbol) {
  const depsMap = effectMap.get(target);

  if (depsMap) {
    const effectSet = depsMap.get(key);
    if (effectSet) {
      effectSet.forEach(fn => {
        cleanup(fn);
        fn()
      });
    }
  }
}

function track<T extends RawData>(target: T, key: string | symbol) {
  if (!activeEffect) {
    return;
  }

  let depsMap = effectMap.get(target);
  if (!depsMap) {
    depsMap = new Map<string, Dep>();
    effectMap.set(target, depsMap);
  }

  let effectSet = depsMap.get(key);
  if (!effectSet) {
    effectSet = new Set<Effect>();
    depsMap.set(key, effectSet);
  }

  effectSet.add(activeEffect);

  let dependenciesSet = activeEffectDependencies.get(activeEffect);
  if (!dependenciesSet) {
    dependenciesSet = new Set<Dep>();
    activeEffectDependencies.set(activeEffect, dependenciesSet);

  }
  dependenciesSet.add(effectSet);
}

export function createEffect(fn: Effect) {
  try {
    activeEffect = fn;
    fn()
  } catch (err) {
    console.error(err);
  } finally {
    activeEffect = null
  }
}

function cleanup(fn: Effect) {
  const dependenciesSet = activeEffectDependencies.get(fn);
  dependenciesSet && dependenciesSet.forEach(depSet => depSet.delete(fn));
}
