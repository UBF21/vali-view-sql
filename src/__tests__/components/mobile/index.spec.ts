import { describe, it, expect } from 'vitest'
import * as mobileBarrel from '../../../components/mobile/index'

describe('mobile barrel export', () => {
  it('exports MobileBottomSheet', () => {
    expect(mobileBarrel.MobileBottomSheet).toBeDefined()
  })

  it('exports MobileNavSheet', () => {
    expect(mobileBarrel.MobileNavSheet).toBeDefined()
  })

  it('exports MobileSwipeLayout', () => {
    expect(mobileBarrel.MobileSwipeLayout).toBeDefined()
  })

  it('exports MobileExplainLayout', () => {
    expect(mobileBarrel.MobileExplainLayout).toBeDefined()
  })

  it('exports MobileDiffLayout', () => {
    expect(mobileBarrel.MobileDiffLayout).toBeDefined()
  })

  it('exports MobileStepperLayout', () => {
    expect(mobileBarrel.MobileStepperLayout).toBeDefined()
  })

  it('exports exactly 6 named exports', () => {
    expect(Object.keys(mobileBarrel)).toHaveLength(6)
  })
})
