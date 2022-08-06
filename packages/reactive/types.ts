export interface EffectFn {
  (): void
  deps: Set<Dep>
  settings: EffectSettings
}
export interface EffectSettings {
  scheduler?: (fn: EffectFn) => void
}
export type Dep = Set<EffectFn>
export type DepMap = Map<string | symbol, Dep>
export type RawData = Record<string | symbol, any>
