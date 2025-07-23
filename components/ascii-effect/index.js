import { useThree } from '@react-three/fiber'
import { BlendFunction, Effect } from 'postprocessing'
import { forwardRef, useEffect, useMemo } from 'react'
import { Color, Uniform } from 'three'
import fragmentShader from './fragment.glsl'

// https://github.com/pmndrs/postprocessing/wiki/Custom-Effects
// https://docs.pmnd.rs/react-postprocessing/effects/custom-effects

// Effect implementation
class ASCIIEffectImpl extends Effect {
  constructor({
    charactersTexture,
    granularity = 16,
    charactersLimit = 32,
    fillPixels = false,
    overwriteColor = false,
    color = '#ffffff',
    greyscale = false,
    invert = false,
    matrix = false,
    background = '#000000',
    // Face depth mode parameters
    faceDepthMode = false,
    depthMap = null,
    granularityRange = { min: 1, max: 50 },
  } = {}) {
    super('ASCIIEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uCharactersTexture', new Uniform(charactersTexture)],
        ['uGranularity', new Uniform(granularity)],
        ['uFillPixels', new Uniform(fillPixels)],
        ['uCharactersLimit', new Uniform(charactersLimit)],
        ['uOverwriteColor', new Uniform(color !== undefined)],
        ['uColor', new Uniform(new Color(color))],
        ['uGreyscale', new Uniform(greyscale)],
        ['uInvert', new Uniform(invert)],
        ['uMatrix', new Uniform(matrix)],
        ['uTime', new Uniform(0)],
        ['uBackground', new Uniform(new Color('#ff0000'))],
        // Face depth mode uniforms
        ['uFaceDepthMode', new Uniform(faceDepthMode)],
        ['uNoseDepth', new Uniform(0.0)],
        ['uForeheadDepth', new Uniform(0.0)],
        ['uCheeksDepth', new Uniform(0.0)],
        ['uChinDepth', new Uniform(0.0)],
        ['uGranularityMin', new Uniform(granularityRange.min)],
        ['uGranularityMax', new Uniform(granularityRange.max)],
      ]),
    })
  }

  update(render, target, deltaTime) {
    if (!this.overwriteTime) {
      this.uniforms.get('uTime').value += deltaTime * 0.2
    }
  }
}

// Effect component
export const ASCIIEffect = forwardRef((props, ref) => {
  const { viewport } = useThree()

  const effect = useMemo(() => new ASCIIEffectImpl(props), [props])

  useEffect(() => {
    const {
      charactersTexture,
      granularity,
      charactersLimit,
      fillPixels,
      overwriteColor,
      color,
      greyscale,
      invert,
      matrix,
      time,
      background,
      faceDepthMode,
      depthMap,
      granularityRange,
    } = props

    effect.uniforms.get('uCharactersTexture').value = charactersTexture
    effect.uniforms.get('uGranularity').value = granularity
    effect.uniforms.get('uCharactersLimit').value = charactersLimit
    effect.uniforms.get('uFillPixels').value = fillPixels
    effect.uniforms.get('uOverwriteColor').value = color !== undefined
    effect.uniforms.get('uColor').value.set(color)
    effect.uniforms.get('uGreyscale').value = greyscale
    effect.uniforms.get('uInvert').value = invert
    effect.uniforms.get('uMatrix').value = matrix
    effect.uniforms.get('uBackground').value.set(background)

    // Update face depth mode uniforms
    effect.uniforms.get('uFaceDepthMode').value = faceDepthMode || false

    if (faceDepthMode && depthMap) {
      effect.uniforms.get('uNoseDepth').value = depthMap.nose || 0.0
      effect.uniforms.get('uForeheadDepth').value = depthMap.forehead || 0.0
      effect.uniforms.get('uCheeksDepth').value = depthMap.cheeks || 0.0
      effect.uniforms.get('uChinDepth').value = depthMap.chin || 0.0
    } else {
      effect.uniforms.get('uNoseDepth').value = 0.0
      effect.uniforms.get('uForeheadDepth').value = 0.0
      effect.uniforms.get('uCheeksDepth').value = 0.0
      effect.uniforms.get('uChinDepth').value = 0.0
    }

    if (granularityRange) {
      effect.uniforms.get('uGranularityMin').value = granularityRange.min
      effect.uniforms.get('uGranularityMax').value = granularityRange.max
    }

    effect.overwriteTime = time !== undefined

    if (effect.overwriteTime) {
      effect.uniforms.get('uTime').value = time
    } else {
      effect.uniforms.get('uTime').value = 0
    }
  }, [props, effect])

  return <primitive ref={ref} object={effect} />
})
ASCIIEffect.displayName = 'ASCIIEffect'
