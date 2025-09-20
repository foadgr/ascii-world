import { useThree } from '@react-three/fiber'
import { ASCIIEffectAdapter } from 'components/ascii-effect/ASCIIEffectAdapter'
import { forwardRef, useMemo } from 'react'
import { Color, Uniform } from 'three'
import { BaseShaderEffect } from './BaseShaderEffect'
import { shaderRegistry } from './ShaderRegistry'

// Component that can render any registered shader effect
export const FlexibleShaderEffect = forwardRef((props, ref) => {
  const {
    shaderId = 'ascii',
    shaderConfig = {},
    ...baseProps
  } = props
  
  const { viewport } = useThree()
  
  // Calculate resolution for shaders
  const resolution = useMemo(() => {
    return [viewport.width * viewport.dpr, viewport.height * viewport.dpr]
  }, [viewport.width, viewport.height, viewport.dpr])

  const shader = useMemo(() => {
    return shaderRegistry.get(shaderId)
  }, [shaderId])

  const customUniforms = useMemo(() => {
    if (!shader || !shader.uniforms) return new Map()

    const uniforms = new Map()
    
    for (const [name, config] of Object.entries(shader.uniforms)) {
      const value = shaderConfig[name] !== undefined ? shaderConfig[name] : config.default
      
      // Convert values to appropriate Three.js types
      let uniformValue = value
      if (config.type === 'color' && typeof value === 'string') {
        uniformValue = new Color(value)
      } else if (config.type === 'vec3' && Array.isArray(value)) {
        uniformValue = value
      } else if (config.type === 'vec2' && Array.isArray(value)) {
        uniformValue = value
      }
      
      uniforms.set(name, new Uniform(uniformValue))
    }
    
    return uniforms
  }, [shader, shaderConfig])

  // Handle special case for ASCII effect (backward compatibility)
  if (shaderId === 'ascii') {
    return (
      <ASCIIEffectAdapter
        ref={ref}
        resolution={resolution}
        {...baseProps}
        {...shaderConfig}
      />
    )
  }

  // Handle other shader effects
  if (!shader) {
    console.warn(`Shader '${shaderId}' not found in registry`)
    return null
  }

  // Create custom props for uniform updates
  const customProps = {}
  if (shader.uniforms) {
    for (const [name, config] of Object.entries(shader.uniforms)) {
      const propName = name.startsWith('u') ? name : `u${name.charAt(0).toUpperCase()}${name.slice(1)}`
      const value = shaderConfig[name] !== undefined ? shaderConfig[name] : config.default
      customProps[propName] = value
    }
  }

  return (
    <BaseShaderEffect
      ref={ref}
      fragmentShader={shader.fragmentShader}
      uniforms={customUniforms}
      name={`${shader.name}Effect`}
      resolution={resolution}
      {...baseProps}
      {...customProps}
    />
  )
})

FlexibleShaderEffect.displayName = 'FlexibleShaderEffect'
