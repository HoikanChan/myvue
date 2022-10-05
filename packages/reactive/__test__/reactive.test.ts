import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queueScheduler } from '../schedulers/queue-scheduler'
import { computed } from '../computed'
import { watch } from '../watch'
import { createEffect, createReactive } from '..'
import { clearLog, getLog, log } from './utils'

describe('reactive', () => {
  let commonData: { x: number }

  beforeEach(() => {
    commonData = createReactive({
      x: 0,
    })
  })

  afterEach(() => {
    clearLog()
  })

  it('change the reactive data should trigger effect', () => {
    createEffect(() => {
      log(commonData.x)
    })

    commonData.x = 1

    expect(getLog()).toMatchInlineSnapshot(`
      [
        0,
        1,
      ]
    `)
  })

  it('change reactive multiple key should effect', () => {
    const data = createReactive({
      a: 1,
      b: 1,
    })
    createEffect(() => {
      log(`A:${data.a}`)
    })
    createEffect(() => {
      log(`B:${data.b}`)
    })
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "A:1",
        "B:1",
      ]
    `)
    data.a = 2
    data.b = 2
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "A:1",
        "B:1",
        "A:2",
        "B:2",
      ]
    `)
  })

  it('In conditional case, effect should trigger correct reactive ', () => {
    const state = createReactive({
      isMobile: true,
      mobileWidth: 'm:0',
      pcWidth: 'pc:0',
    })
    createEffect(() => {
      state.isMobile ? log(state.mobileWidth) : log(state.pcWidth)
    })
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "m:0",
      ]
    `)
    state.isMobile = false
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "m:0",
        "pc:0",
      ]
    `)
    state.mobileWidth = 'm:100'
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "m:0",
        "pc:0",
      ]
    `)
  })

  it('nested effect should trigger correctly', () => {
    const data = createReactive({
      x: 1,
      y: -1,
    })
    createEffect(() => {
      log('outside')
      createEffect(() => {
        data.y
        log('inside')
      })
      data.x
    })
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "outside",
        "inside",
      ]
    `)
    clearLog()
    data.x = 2
    expect(getLog()).toMatchInlineSnapshot(`
      [
        "outside",
        "inside",
      ]
    `)
  })

  it('trigger and track happen in same effect should not cause infinite loop', () => {
    const fn = vi.fn()
    createEffect(() => {
      fn()
      commonData.x += commonData.x
    })
    expect(fn).toBeCalledTimes(1)
  })

  it('scheduler should support Promise.resolve', () => {
    createEffect(() => {
      commonData.x
      log(3)
    }, {
      scheduler: (fn) => {
        Promise.resolve().then(() => fn())
      },
    })

    clearLog()

    log(1)
    commonData.x = 2
    log(2)

    Promise.resolve().then(() => {
      expect(getLog()).toMatchInlineSnapshot(`
        [
          1,
          2,
          3,
        ]
      `)
    })
  })

  it('queueScheduler should merge continuous update', () => {
    createEffect(() => {
      log(commonData.x)
    }, {
      scheduler: queueScheduler,
    })

    clearLog()
    commonData.x++
    commonData.x++
    Promise.resolve().then(() => {
      expect(getLog()).toMatchInlineSnapshot(`
        [
          2,
        ]
      `)
    })
  })

  it('lazy option should not activate effect at once', () => {
    const fn = vi.fn()
    createEffect(() => {
      fn()
    }, {
      lazy: true,
    })
    expect(fn).toBeCalledTimes(0)
  })

  it('computed should get correct value', () => {
    const fn = vi.fn()

    const cpt = computed(() => {
      fn()
      return commonData.x + 1
    })
    // Computed should not activate effect before call the value getter function
    expect(fn).toBeCalledTimes(0)
    expect(cpt.value).toEqual(1)

    commonData.x++
    expect(cpt.value).toEqual(2)
    expect(cpt.value).toEqual(2)

    expect(fn).toBeCalledTimes(2)
  })

  it('computed update should activate the effect', () => {
    const fn = vi.fn()

    const double = computed(() => {
      return 2 * commonData.x + 1
    })

    createEffect(() => {
      fn(double.value)
    })

    commonData.x++
    expect(fn).toBeCalledTimes(2)
  })

  it('nested computed should update correctly', () => {
    const double = computed(() => {
      return 2 * commonData.x
    })

    const doubleOfDouble = computed(() => {
      return 2 * double.value
    })
    commonData.x = 1
    expect(double.value).toEqual(2)
    expect(doubleOfDouble.value).toEqual(4)
  })

  it('watch should call', () => {
    const data = createReactive({
      x: 0,
    })
    const fn = vi.fn()
    watch(data, () => {
      fn()
    })

    const fn2 = vi.fn()
    watch(() => data.x, (newVal: any, oldVal: any) => {
      fn2(newVal, oldVal)
    })

    data.x = 1
    expect(fn).toBeCalledTimes(1)
    expect(fn2).toBeCalledWith(1, 0)
  })

  /*
  * First modification -> mock 1
  * Second modification start -> mock 2
  * mock 2 completed -> set mock1 expired and finalData equal result of mock 2
  * mock 1 completed -> abandon
  */
  it('watch should handle race condition', () => {
    let finalData: number
    let times = 0
    vi.useFakeTimers()

    const mockFetch = (data: number) => new Promise<number>((resolve) => {
      setTimeout(() => { resolve(data) }, 600 - times * 300)
    })
    watch(commonData, async (newVal, oldVal, onInvalidate) => {
      let expired = false
      onInvalidate(() => {
        expired = true
      })

      const res = await mockFetch(times++)

      if (!expired)
        finalData = res
    })

    commonData.x++
    setTimeout(() => {
      commonData.x++
    }, 100)
    vi.runAllTimers()
    Promise.resolve().then(() => {
      expect(finalData).toEqual(1)
    })
  })
})
