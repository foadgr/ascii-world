import { forwardRef } from 'react'
// Import the original ASCII effect directly to avoid double-prefixing
import { ASCIIEffect } from './index'

// Adapter to make the existing ASCII effect work with the new shader system
export const ASCIIEffectAdapter = forwardRef((props, ref) => {
  // Just pass through all props to the original ASCII effect
  return <ASCIIEffect ref={ref} {...props} />
})

ASCIIEffectAdapter.displayName = 'ASCIIEffectAdapter'
