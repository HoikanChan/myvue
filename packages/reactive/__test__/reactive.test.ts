import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEffect, createReactive } from '..'
import { clearLog, getLog, log } from './utils'

describe('reactive', () => {
  afterEach(() => {
    clearLog()
  })

  it('change the reactive data should trigger effect', () => {
    const data = createReactive({
      a: 1,
    })

    createEffect(() => {
      log(data.a)
    })
    expect(getLog()).toMatchInlineSnapshot(`
      [
        1,
      ]
    `)
    data.a = 2
    expect(getLog()).toMatchInlineSnapshot(`
      [
        1,
        2,
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
    const data = createReactive({
      x: 0,
    })
    const fn = vi.fn()
    createEffect(() => {
      fn()
      data.x += data.x
    })
    expect(fn).toBeCalledTimes(1)
  })
})
