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
    trackingMode,
    faceTracking,
    handTracking,
    audioTracking,
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

  // Create tracking uniforms from tracking data
  const trackingUniforms = useMemo(() => {
    const uniforms = new Map()

    // Audio tracking uniforms
    if (audioTracking) {
      uniforms.set('uAudioLevel', new Uniform(audioTracking.currentLevel || 0))
      uniforms.set('uAudioVoice', new Uniform(audioTracking.voiceLevel || 0))
      uniforms.set('uAudioMusic', new Uniform(audioTracking.musicLevel || 0))
      uniforms.set('uAudioNoise', new Uniform(audioTracking.noiseLevel || 0))
      uniforms.set(
        'uAudioSpike',
        new Uniform(audioTracking.isSpike ? 1.0 : 0.0)
      )
      uniforms.set(
        'uAudioSmoothed',
        new Uniform(audioTracking.smoothedLevel || 0)
      )
    } else {
      // Default values when no audio tracking
      uniforms.set('uAudioLevel', new Uniform(0))
      uniforms.set('uAudioVoice', new Uniform(0))
      uniforms.set('uAudioMusic', new Uniform(0))
      uniforms.set('uAudioNoise', new Uniform(0))
      uniforms.set('uAudioSpike', new Uniform(0))
      uniforms.set('uAudioSmoothed', new Uniform(0))
    }

    // Face tracking uniforms
    if (faceTracking?.faceDetected && faceTracking.depthMap) {
      uniforms.set('uFaceDetected', new Uniform(true))
      uniforms.set(
        'uFaceNoseDepth',
        new Uniform(faceTracking.depthMap.noseTip || 0)
      )
      uniforms.set(
        'uFaceForeheadDepth',
        new Uniform(faceTracking.depthMap.forehead || 0)
      )
      uniforms.set(
        'uFaceLeftCheekDepth',
        new Uniform(faceTracking.depthMap.leftCheek || 0)
      )
      uniforms.set(
        'uFaceRightCheekDepth',
        new Uniform(faceTracking.depthMap.rightCheek || 0)
      )
      uniforms.set(
        'uFaceChinDepth',
        new Uniform(faceTracking.depthMap.chin || 0)
      )
      uniforms.set(
        'uFaceLeftEyeDepth',
        new Uniform(faceTracking.depthMap.leftEye || 0)
      )
      uniforms.set(
        'uFaceRightEyeDepth',
        new Uniform(faceTracking.depthMap.rightEye || 0)
      )
      uniforms.set(
        'uFaceMouthDepth',
        new Uniform(faceTracking.depthMap.mouth || 0)
      )
      uniforms.set(
        'uFaceNormalizedDepth',
        new Uniform(faceTracking.normalizedDepth || 0)
      )
    } else {
      uniforms.set('uFaceDetected', new Uniform(false))
      uniforms.set('uFaceNoseDepth', new Uniform(0))
      uniforms.set('uFaceForeheadDepth', new Uniform(0))
      uniforms.set('uFaceLeftCheekDepth', new Uniform(0))
      uniforms.set('uFaceRightCheekDepth', new Uniform(0))
      uniforms.set('uFaceChinDepth', new Uniform(0))
      uniforms.set('uFaceLeftEyeDepth', new Uniform(0))
      uniforms.set('uFaceRightEyeDepth', new Uniform(0))
      uniforms.set('uFaceMouthDepth', new Uniform(0))
      uniforms.set('uFaceNormalizedDepth', new Uniform(0))
    }

    // Hand tracking uniforms
    if (handTracking?.handDetected && handTracking.landmarks?.length > 0) {
      // Calculate palm center from landmarks (wrist is landmark 0)
      const wrist = handTracking.landmarks[0]
      uniforms.set('uHandDetected', new Uniform(true))
      uniforms.set(
        'uHandNormalizedDepth',
        new Uniform(handTracking.normalizedDepth || 0)
      )
      uniforms.set('uHandPalmX', new Uniform(wrist?.x || 0.5))
      uniforms.set('uHandPalmY', new Uniform(wrist?.y || 0.5))
    } else {
      uniforms.set('uHandDetected', new Uniform(false))
      uniforms.set('uHandNormalizedDepth', new Uniform(0))
      uniforms.set('uHandPalmX', new Uniform(0.5))
      uniforms.set('uHandPalmY', new Uniform(0.5))
    }

    return uniforms
  }, [audioTracking, faceTracking, handTracking])

  const customUniforms = useMemo(() => {
    const uniforms = new Map()

    // Start with tracking uniforms
    trackingUniforms.forEach((uniform, name) => {
      uniforms.set(name, uniform)
    })

    // Add shader-specific uniforms
    if (shader?.uniforms) {
      for (const [name, config] of Object.entries(shader.uniforms)) {
        const value =
          shaderConfig[name] !== undefined ? shaderConfig[name] : config.default

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
    }

    return uniforms
  }, [shader, shaderConfig, trackingUniforms])

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

  // Add tracking props
  trackingUniforms.forEach((uniform, name) => {
    customProps[name] = uniform.value
  })

  // Add shader-specific props
  if (shader?.uniforms) {
    for (const [name, config] of Object.entries(shader.uniforms)) {
      const propName = name.startsWith('u')
        ? name
        : `u${name.charAt(0).toUpperCase()}${name.slice(1)}`
      const value =
        shaderConfig[name] !== undefined ? shaderConfig[name] : config.default
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
