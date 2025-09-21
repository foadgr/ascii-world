import { BlendFunction, Effect } from 'postprocessing'
import { forwardRef, useEffect, useMemo } from 'react'
import { Color, Uniform } from 'three'

// Base shader effect class that can be extended for any custom shader
class BaseShaderEffectImpl extends Effect {
  constructor({
    fragmentShader,
    uniforms = new Map(),
    blendFunction = BlendFunction.NORMAL,
    name = 'CustomShaderEffect',
    ...options
  } = {}) {
    // Create a merged uniform map with standard tracking uniforms
    const standardUniforms = new Map([
      // Time and animation
      ['uTime', new Uniform(0)],
      ['uResolution', new Uniform([1, 1])],
      ['resolution', new Uniform([1, 1])], // Also provide 'resolution' for compatibility

      // Face tracking uniforms
      ['uFaceDepthMode', new Uniform(false)],
      ['uNoseDepth', new Uniform(0.0)],
      ['uForeheadDepth', new Uniform(0.0)],
      ['uCheeksDepth', new Uniform(0.0)],
      ['uChinDepth', new Uniform(0.0)],
      ['uGranularityMin', new Uniform(1.0)],
      ['uGranularityMax', new Uniform(50.0)],

      // Enhanced face region depth uniforms
      ['uNoseTipDepth', new Uniform(0.0)],
      ['uLeftCheekDepth', new Uniform(0.0)],
      ['uRightCheekDepth', new Uniform(0.0)],
      ['uLeftEyeDepth', new Uniform(0.0)],
      ['uRightEyeDepth', new Uniform(0.0)],
      ['uMouthDepth', new Uniform(0.0)],
      ['uLeftTempleDepth', new Uniform(0.0)],
      ['uRightTempleDepth', new Uniform(0.0)],

      // Hand tracking uniforms
      ['uHandDepthMode', new Uniform(false)],
      ['uHandDepth', new Uniform(0.0)],
      ['uHandGranularity', new Uniform(1.0)],

      // Audio tracking uniforms
      ['uAudioMode', new Uniform(false)],
      ['uAudioLevel', new Uniform(0.0)],
      ['uAudioSpike', new Uniform(false)],
      ['uAudioContentType', new Uniform(0)], // 0=none, 1=voice, 2=music, 3=noise

      // General effect uniforms
      ['uGranularity', new Uniform(16.0)],
      ['uColor', new Uniform(new Color('#ffffff'))],
      ['uBackground', new Uniform(new Color('#000000'))],
      ['uIntensity', new Uniform(1.0)],
      ['uOpacity', new Uniform(1.0)],
    ])

    // Merge custom uniforms with standard ones
    const mergedUniforms = new Map([...standardUniforms, ...uniforms])

    super(name, fragmentShader, {
      blendFunction,
      uniforms: mergedUniforms,
      ...options,
    })

    this.customUniforms = uniforms
  }

  update(render, target, deltaTime) {
    if (!this.overwriteTime) {
      this.uniforms.get('uTime').value += deltaTime * 0.2
    }
  }

  // Helper method to safely update uniform values
  updateUniform(name, value) {
    const uniform = this.uniforms.get(name)
    if (uniform) {
      if (uniform.value instanceof Color && typeof value === 'string') {
        uniform.value.set(value)
      } else {
        uniform.value = value
      }
    }
  }

  // Update face tracking uniforms
  updateFaceTracking(faceDepthMode, depthMap, granularityRange) {
    this.updateUniform('uFaceDepthMode', faceDepthMode || false)

    if (faceDepthMode && depthMap) {
      // Original 4 regions for backward compatibility
      this.updateUniform('uNoseDepth', depthMap.nose || 0.0)
      this.updateUniform('uForeheadDepth', depthMap.forehead || 0.0)
      this.updateUniform('uCheeksDepth', depthMap.cheeks || 0.0)
      this.updateUniform('uChinDepth', depthMap.chin || 0.0)

      // Enhanced detailed face regions
      this.updateUniform(
        'uNoseTipDepth',
        depthMap.noseTip || depthMap.nose || 0.0
      )
      this.updateUniform(
        'uLeftCheekDepth',
        depthMap.leftCheek || depthMap.cheeks || 0.0
      )
      this.updateUniform(
        'uRightCheekDepth',
        depthMap.rightCheek || depthMap.cheeks || 0.0
      )
      this.updateUniform('uLeftEyeDepth', depthMap.leftEye || 0.0)
      this.updateUniform('uRightEyeDepth', depthMap.rightEye || 0.0)
      this.updateUniform('uMouthDepth', depthMap.mouth || 0.0)
      this.updateUniform('uLeftTempleDepth', depthMap.leftTemple || 0.0)
      this.updateUniform('uRightTempleDepth', depthMap.rightTemple || 0.0)
    } else {
      // Reset all depth uniforms when face depth mode is disabled
      this.updateUniform('uNoseDepth', 0.0)
      this.updateUniform('uForeheadDepth', 0.0)
      this.updateUniform('uCheeksDepth', 0.0)
      this.updateUniform('uChinDepth', 0.0)
      this.updateUniform('uNoseTipDepth', 0.0)
      this.updateUniform('uLeftCheekDepth', 0.0)
      this.updateUniform('uRightCheekDepth', 0.0)
      this.updateUniform('uLeftEyeDepth', 0.0)
      this.updateUniform('uRightEyeDepth', 0.0)
      this.updateUniform('uMouthDepth', 0.0)
      this.updateUniform('uLeftTempleDepth', 0.0)
      this.updateUniform('uRightTempleDepth', 0.0)
    }

    if (granularityRange) {
      this.updateUniform('uGranularityMin', granularityRange.min)
      this.updateUniform('uGranularityMax', granularityRange.max)
    }
  }

  // Update hand tracking uniforms
  updateHandTracking(handDepthMode, handTracking) {
    this.updateUniform('uHandDepthMode', handDepthMode || false)

    if (handDepthMode && handTracking) {
      this.updateUniform('uHandDepth', handTracking.relativeDepth || 0.0)
      this.updateUniform('uHandGranularity', handTracking.granularity || 1.0)
    } else {
      this.updateUniform('uHandDepth', 0.0)
      this.updateUniform('uHandGranularity', 1.0)
    }
  }

  // Update audio tracking uniforms
  updateAudioTracking(audioMode, audioTracking) {
    this.updateUniform('uAudioMode', audioMode || false)

    if (audioMode && audioTracking) {
      this.updateUniform('uAudioLevel', audioTracking.currentLevel || 0.0)
      this.updateUniform('uAudioSpike', audioTracking.isSpike || false)

      // Map content type to number
      const contentTypeMap = { none: 0, voice: 1, music: 2, noise: 3 }
      this.updateUniform(
        'uAudioContentType',
        contentTypeMap[audioTracking.contentType] || 0
      )
    } else {
      this.updateUniform('uAudioLevel', 0.0)
      this.updateUniform('uAudioSpike', false)
      this.updateUniform('uAudioContentType', 0)
    }
  }
}

// React component for the base shader effect
export const BaseShaderEffect = forwardRef((props, ref) => {
  const {
    fragmentShader,
    uniforms = new Map(),
    trackingMode,
    faceTracking,
    handTracking,
    audioTracking,
    granularityRange,
    granularity = 16.0,
    color = new Color('#ffffff'),
    background = new Color('#000000'),
    intensity = 1.0,
    opacity = 1.0,
    time = 0,
    resolution = [1, 1],
    ...customProps
  } = props

  const effect = useMemo(() => {
    return new BaseShaderEffectImpl({
      fragmentShader,
      uniforms,
      ...customProps,
    })
  }, [fragmentShader, uniforms, customProps])

  // Check if this is an AI shader that uses mixed tracking
  const isAIShader = useMemo(
    () => fragmentShader.includes('uHandDetected'),
    [fragmentShader]
  )

  useEffect(() => {
    // Update basic uniforms
    effect.updateUniform('uGranularity', granularity)

    // Ensure color and background are Color objects
    const colorObject =
      color instanceof Color ? color : new Color(color || '#ffffff')
    const backgroundObject =
      background instanceof Color
        ? background
        : new Color(background || '#000000')

    effect.updateUniform('uColor', colorObject)
    effect.updateUniform('uBackground', backgroundObject)
    effect.updateUniform('uIntensity', intensity)
    effect.updateUniform('uOpacity', opacity)
    effect.updateUniform('uTime', time || 0)

    // Update resolution uniforms
    effect.updateUniform('uResolution', resolution)
    effect.updateUniform('resolution', resolution)

    // Update tracking modes - for AI shaders, always provide tracking data regardless of mode
    const faceDepthMode =
      trackingMode === 'face' &&
      faceTracking?.faceDetected &&
      faceTracking?.depthMap
    const handDepthMode = trackingMode === 'hand' && handTracking?.handDetected
    const audioMode = trackingMode === 'audio' && audioTracking?.audioDetected

    // For mixed/AI shaders, always provide data when available
    const mixedMode = trackingMode === 'mixed' || isAIShader
    const alwaysProvideHand = mixedMode && handTracking?.handDetected
    const alwaysProvideFace = mixedMode && faceTracking?.faceDetected
    const alwaysProvideAudio = mixedMode && audioTracking?.audioDetected

    effect.updateFaceTracking(
      faceDepthMode || alwaysProvideFace,
      faceTracking?.depthMap,
      granularityRange
    )
    effect.updateHandTracking(handDepthMode || alwaysProvideHand, handTracking)
    effect.updateAudioTracking(audioMode || alwaysProvideAudio, audioTracking)

    // Handle time override
    effect.overwriteTime = time !== undefined
    if (effect.overwriteTime) {
      effect.updateUniform('uTime', time)
    }

    // Update custom uniforms from props
    for (const [key, value] of Object.entries(customProps)) {
      if (key.startsWith('u') && effect.uniforms.has(key)) {
        effect.updateUniform(key, value)
      }
    }
  }, [
    effect,
    resolution,
    trackingMode,
    faceTracking,
    handTracking,
    audioTracking,
    granularityRange,
    granularity,
    color,
    background,
    intensity,
    opacity,
    time,
    isAIShader,
    customProps,
  ])

  return <primitive ref={ref} object={effect} />
})

BaseShaderEffect.displayName = 'BaseShaderEffect'
