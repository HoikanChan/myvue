export interface EffectFn<T> {
  (): T
  deps: Set<Dep>
  settings: EffectSettings
}
export interface EffectSettings {
  scheduler?: (fn: EffectFn<any>) => void
  /*
  * Default: false
  */
  lazy?: boolean
}
export type Dep = Set<EffectFn<any>>
export type DepMap = Map<string | symbol, Dep>
export type RawData = Record<string | symbol, any>
export interface Computed<T> {
  readonly value: T
}