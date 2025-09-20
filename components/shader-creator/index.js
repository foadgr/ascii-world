import { shaderRegistry } from 'components/shader-effect/ShaderRegistry'
import { useState } from 'react'
import { z } from 'zod'
import s from './shader-creator.module.scss'

// Client-side validation schema (matches the API schema)
const ShaderGenerationResponseSchema = z.object({
  shaderCode: z.string(),
  suggestedName: z.string(),
  suggestedDescription: z.string(),
  primaryTrackingMode: z.enum(['audio', 'face', 'hand', 'mixed']),
  colorPalette: z.array(z.string()).min(2).max(5),
  intensity: z.number().min(0).max(1),
  customUniforms: z.array(z.object({
    name: z.string(),
    type: z.enum(['float', 'vec2', 'vec3', 'vec4', 'bool', 'int']),
    defaultValue: z.string(),
    description: z.string()
  }))
})

const SHADER_TEMPLATES = {
  basic: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uIntensity;
uniform float uTime;

// Audio tracking
uniform float uAudioLevel;
uniform float uAudioSpike;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Sample input video
  vec4 videoColor = texture2D(inputBuffer, uv);
  
  // Create dynamic color based on audio
  vec3 dynamicColor = mix(uColor, vec3(1.0, 0.5, 0.2), uAudioLevel);
  dynamicColor = mix(dynamicColor, vec3(1.0, 1.0, 1.0), uAudioSpike * 0.8);
  
  // Your creative effect here
  outputColor = vec4(mix(uBackground, dynamicColor * videoColor.rgb, videoColor.a), 1.0);
}`,

  audioReactive: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uIntensity;
uniform float uTime;

// Audio tracking uniforms
uniform float uAudioLevel;
uniform float uAudioVoice;
uniform float uAudioMusic;
uniform float uAudioSpike;
uniform float uAudioSmoothed;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 videoColor = texture2D(inputBuffer, uv);
  
  // Create audio-reactive color palette
  vec3 voiceColor = vec3(1.0, 0.7, 0.3); // Warm orange for voice
  vec3 musicColor = vec3(0.3, 0.7, 1.0); // Cool blue for music
  vec3 spikeColor = vec3(1.0, 1.0, 1.0); // White for spikes
  
  // Mix colors based on audio content
  vec3 audioColor = mix(uColor, voiceColor, uAudioVoice * 0.8);
  audioColor = mix(audioColor, musicColor, uAudioMusic * 0.6);
  audioColor = mix(audioColor, spikeColor, uAudioSpike * 0.9);
  
  // Create ripple effect based on audio spikes
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);
  float ripple = sin(dist * 20.0 - uTime * 3.0 + uAudioSpike * 10.0) * 0.5 + 0.5;
  ripple *= uAudioLevel * 2.0;
  
  // Apply granularity based on audio intensity
  vec2 pixelSize = vec2(1.0) / resolution * (uGranularity + uAudioLevel * 20.0);
  vec2 pixelUV = floor(uv / pixelSize) * pixelSize;
  vec4 pixelColor = texture2D(inputBuffer, pixelUV);
  
  vec3 finalColor = mix(pixelColor.rgb, audioColor, ripple * uIntensity);
  outputColor = vec4(mix(uBackground, finalColor, pixelColor.a), 1.0);
}`,

  faceInteractive: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uIntensity;
uniform float uTime;

// Face tracking uniforms
uniform bool uFaceDetected;
uniform float uFaceNoseDepth;
uniform float uFaceForeheadDepth;
uniform float uFaceLeftCheekDepth;
uniform float uFaceRightCheekDepth;
uniform float uFaceLeftEyeDepth;
uniform float uFaceRightEyeDepth;
uniform float uFaceMouthDepth;
uniform float uFaceNormalizedDepth;

// Audio for extra reactivity
uniform float uAudioLevel;
uniform float uAudioSpike;

vec3 faceRegionColor(vec2 uv, vec2 regionCenter, float regionDepth, vec3 baseColor) {
  float dist = distance(uv, regionCenter);
  float influence = exp(-dist * 8.0);
  
  // Map depth to color intensity and hue shift
  float intensity = (regionDepth + 1.0) * 0.5; // Convert -1,1 to 0,1
  vec3 regionColor = mix(baseColor, vec3(intensity, 1.0 - intensity, 0.5), intensity);
  
  return mix(vec3(1.0), regionColor, influence);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 videoColor = texture2D(inputBuffer, uv);
  
  if (!uFaceDetected) {
    // No face detected - simple effect
    outputColor = vec4(mix(uBackground, uColor * videoColor.rgb, videoColor.a), 1.0);
    return;
  }
  
  // Face region positions (approximate)
  vec2 nosePos = vec2(0.5, 0.45);
  vec2 leftEyePos = vec2(0.42, 0.4);
  vec2 rightEyePos = vec2(0.58, 0.4);
  vec2 mouthPos = vec2(0.5, 0.6);
  vec2 foreheadPos = vec2(0.5, 0.25);
  vec2 leftCheekPos = vec2(0.35, 0.5);
  vec2 rightCheekPos = vec2(0.65, 0.5);
  
  // Create color influences from each face region
  vec3 colorMod = vec3(1.0);
  colorMod *= faceRegionColor(uv, nosePos, uFaceNoseDepth, vec3(1.0, 0.5, 0.5)); // Red nose
  colorMod *= faceRegionColor(uv, leftEyePos, uFaceLeftEyeDepth, vec3(0.5, 1.0, 0.5)); // Green left eye
  colorMod *= faceRegionColor(uv, rightEyePos, uFaceRightEyeDepth, vec3(0.5, 0.5, 1.0)); // Blue right eye
  colorMod *= faceRegionColor(uv, mouthPos, uFaceMouthDepth, vec3(1.0, 1.0, 0.5)); // Yellow mouth
  colorMod *= faceRegionColor(uv, foreheadPos, uFaceForeheadDepth, vec3(1.0, 0.5, 1.0)); // Magenta forehead
  colorMod *= faceRegionColor(uv, leftCheekPos, uFaceLeftCheekDepth, vec3(0.5, 1.0, 1.0)); // Cyan left cheek
  colorMod *= faceRegionColor(uv, rightCheekPos, uFaceRightCheekDepth, vec3(1.0, 1.0, 0.5)); // Yellow right cheek
  
  // Add audio reactivity
  colorMod = mix(colorMod, vec3(1.5), uAudioSpike * 0.5);
  
  // Apply face distance effect
  float distanceEffect = (uFaceNormalizedDepth + 1.0) * 0.5; // Convert -1,1 to 0,1
  colorMod = mix(colorMod * 0.5, colorMod * 1.5, distanceEffect);
  
  vec3 finalColor = videoColor.rgb * colorMod * uColor;
  outputColor = vec4(mix(uBackground, finalColor, videoColor.a * uIntensity), 1.0);
}`,

  handDistortion: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uIntensity;
uniform float uTime;

// Hand tracking uniforms
uniform bool uHandDetected;
uniform float uHandNormalizedDepth;
uniform float uHandPalmX;
uniform float uHandPalmY;

// Audio for rhythm
uniform float uAudioLevel;
uniform float uAudioMusic;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 sampleUV = uv;
  vec3 effectColor = uColor;
  
  if (uHandDetected) {
    // Hand position in UV space
    vec2 handPos = vec2(uHandPalmX, 1.0 - uHandPalmY); // Flip Y for screen coords
    
    // Distance from hand
    float handDist = distance(uv, handPos);
    
    // Create distortion field around hand
    float distortionRadius = 0.3 + uHandNormalizedDepth * 0.2;
    float distortionStrength = max(0.0, (distortionRadius - handDist) / distortionRadius);
    
    // Swirl distortion
    float angle = distortionStrength * 6.28 * (0.5 + uHandNormalizedDepth);
    float s = sin(angle);
    float c = cos(angle);
    vec2 offset = (uv - handPos) * 0.1 * distortionStrength;
    sampleUV = uv + vec2(offset.x * c - offset.y * s, offset.x * s + offset.y * c);
    
    // Color modulation based on hand depth
    float depthFactor = (uHandNormalizedDepth + 1.0) * 0.5; // Convert -1,1 to 0,1
    effectColor = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.5, 0.2), depthFactor);
    
    // Audio-reactive pulsing around hand
    float pulse = sin(uTime * 6.0 + uAudioMusic * 10.0) * 0.5 + 0.5;
    effectColor = mix(effectColor, vec3(1.0, 1.0, 1.0), distortionStrength * pulse * uAudioLevel);
  }
  
  // Sample the distorted video
  vec4 videoColor = texture2D(inputBuffer, sampleUV);
  
  // Apply granularity effect
  vec2 pixelSize = vec2(1.0) / resolution * uGranularity;
  vec2 pixelUV = floor(uv / pixelSize) * pixelSize;
  vec4 pixelColor = texture2D(inputBuffer, pixelUV);
  
  // Mix video and effect
  vec3 finalColor = mix(pixelColor.rgb, videoColor.rgb * effectColor, uIntensity);
  outputColor = vec4(mix(uBackground, finalColor, videoColor.a), 1.0);
}`,
}

const LLM_PROMPT_TEMPLATE = `Create a GLSL fragment shader for an advanced video effect with real-time tracking integration. The shader should:

CORE REQUIREMENTS:
- Use the mainImage function signature: void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
- inputColor is the current pixel color
- uv are texture coordinates (0.0 to 1.0)
- outputColor is the final pixel color
- Use texture2D(inputBuffer, uv) to sample the input video
- Resolution is available as 'resolution' (vec2)

AVAILABLE TRACKING DATA (be creative with these!):
AUDIO TRACKING UNIFORMS:
- uAudioLevel: float (0-1, current audio intensity)
- uAudioVoice: float (0-1, voice frequency content)
- uAudioMusic: float (0-1, music frequency content)
- uAudioNoise: float (0-1, noise frequency content)
- uAudioSpike: float (0-1, 1.0 when sudden audio spike detected)
- uAudioSmoothed: float (0-1, smoothed baseline audio level)

FACE TRACKING UNIFORMS (when face detected):
- uFaceDetected: bool (true when face is visible)
- uFaceNoseDepth: float (nose tip depth, relative to calibration)
- uFaceForeheadDepth: float (forehead region depth)
- uFaceLeftCheekDepth: float (left cheek depth)
- uFaceRightCheekDepth: float (right cheek depth)
- uFaceChinDepth: float (chin depth)
- uFaceLeftEyeDepth: float (left eye region depth)
- uFaceRightEyeDepth: float (right eye region depth)
- uFaceMouthDepth: float (mouth region depth)
- uFaceNormalizedDepth: float (-1 to 1, overall face distance)

HAND TRACKING UNIFORMS (when hand detected):
- uHandDetected: bool (true when hand is visible)
- uHandNormalizedDepth: float (-1 to 1, hand distance from calibration)
- uHandPalmX: float (0-1, palm center X position)
- uHandPalmY: float (0-1, palm center Y position)

STANDARD UNIFORMS:
- uGranularity: float (character/pixel density control)
- uColor: vec3 (primary color - RGB 0-1)
- uBackground: vec3 (background color - RGB 0-1)
- uIntensity: float (0-1, effect intensity)
- uTime: float (elapsed time in seconds)

CREATIVE GUIDANCE:
- DON'T just modulate granularity - be creative with colors, patterns, distortions
- Use face regions for localized effects (e.g., eyes glow, mouth distorts, nose creates ripples)
- Use audio spikes for sudden visual bursts, voice for warm colors, music for rhythm
- Use hand position for interactive elements, hand depth for scale/zoom effects
- Create dynamic color palettes that respond to tracking data
- Think beyond simple ASCII - consider edge detection, particle effects, fluid dynamics
- Combine multiple tracking inputs for complex behaviors

Effect Description: {description}

Additional Requirements: {requirements}

Please return only the complete GLSL shader code with creative use of the tracking uniforms, no explanations.`

export const ShaderCreator = ({ isOpen, onClose, onShaderCreated }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPrompt, setGenerationPrompt] = useState('')
  const [additionalRequirements, setAdditionalRequirements] = useState('')
  const [error, setError] = useState('')
  const [generatedShader, setGeneratedShader] = useState(null)


  const generateWithLLM = async () => {
    if (!generationPrompt.trim()) {
      setError('Please enter a description for the shader effect')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      // Create the full prompt
      const prompt = LLM_PROMPT_TEMPLATE.replace(
        '{description}',
        generationPrompt
      ).replace('{requirements}', additionalRequirements || 'None')

      // Make OpenAI API call
      const response = await fetch('/api/generate-shader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          description: generationPrompt,
          requirements: additionalRequirements,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      let data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Validate the response structure
      try {
        data = ShaderGenerationResponseSchema.parse(data)
      } catch (validationError) {
        console.warn('Response validation failed, using data as-is:', validationError)
        // Continue with unvalidated data for backwards compatibility
      }

      // Clean up the generated shader code to avoid conflicts
      const cleanedShaderCode = data.shaderCode
        // Remove duplicate uniform declarations that are already provided by the framework
        .replace(/^\s*uniform\s+sampler2D\s+inputBuffer\s*;\s*$/gm, '')
        // Keep resolution uniform but make sure it's declared properly
        .replace(/^\s*uniform\s+vec2\s+resolution\s*;\s*$/gm, '')
        // Remove precision directives as they're handled by the framework
        .replace(/^\s*#ifdef\s+GL_ES\s*$/gm, '')
        .replace(/^\s*precision\s+mediump\s+float\s*;\s*$/gm, '')
        .replace(/^\s*precision\s+highp\s+float\s*;\s*$/gm, '')
        .replace(/^\s*#endif\s*$/gm, '')
        // Clean up extra whitespace
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim()

      // Add the resolution uniform if the shader uses it and it's not already declared
      const needsResolution = cleanedShaderCode.includes('resolution.')
      const hasResolutionUniform = /^\s*uniform\s+vec2\s+resolution\s*;/gm.test(cleanedShaderCode)
      
      const finalShaderCode = needsResolution && !hasResolutionUniform 
        ? `uniform vec2 resolution;\n\n${cleanedShaderCode}`
        : cleanedShaderCode

      // Store the cleaned shader data
      const cleanedData = {
        ...data,
        shaderCode: finalShaderCode
      }

      setGeneratedShader(cleanedData)
      setError('') // Clear any previous errors

      // Log for debugging
      console.log('Generated shader (cleaned):', cleanedData)
    } catch (err) {
      setError(`Failed to generate shader: ${err.message}`)
      console.error('LLM generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }


  const handleCreateShader = () => {
    if (!generatedShader) {
      setError('Please generate a shader first')
      return
    }

    try {
      // Convert customUniforms array to the format expected by the registry
      const uniforms = {}
      if (generatedShader.customUniforms && generatedShader.customUniforms.length > 0) {
        generatedShader.customUniforms.forEach(uniform => {
          const uniformName = `u${uniform.name.charAt(0).toUpperCase()}${uniform.name.slice(1)}`
          
          // Parse the string defaultValue back to the appropriate type
          let parsedDefault
          try {
            // Try to parse as JSON first (for arrays, booleans, numbers)
            parsedDefault = JSON.parse(uniform.defaultValue)
          } catch {
            // If JSON parsing fails, treat as string
            parsedDefault = uniform.defaultValue
          }
          
          uniforms[uniformName] = {
            type: uniform.type,
            default: parsedDefault,
          }
        })
      }

      const metadata = {
        primaryTrackingMode: generatedShader.primaryTrackingMode,
        colorPalette: generatedShader.colorPalette,
        intensity: generatedShader.intensity,
        customUniforms: generatedShader.customUniforms,
      }

      const shaderId = shaderRegistry.importFromLLM(
        generatedShader.suggestedName,
        generatedShader.suggestedDescription,
        generatedShader.shaderCode,
        uniforms,
        [], // Controls can be added later
        metadata
      )

      onShaderCreated(shaderId)
      handleClose()
    } catch (err) {
      setError(`Failed to create shader: ${err.message}`)
    }
  }

  const handleClose = () => {
    setGenerationPrompt('')
    setAdditionalRequirements('')
    setError('')
    setGeneratedShader(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h2>AI Shader Generator</h2>
          <button className={s.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={s.content}>
          {!generatedShader ? (
            // AI Generation Section
            <div className={s.section}>
              <h3>AI Shader Generator</h3>
              <p className={s.description}>
                Describe the visual effect you want and our AI will generate a custom shader 
                that uses audio, face, and hand tracking data creatively.
              </p>
              
              <div className={s.inputGroup}>
                <label>Effect Description</label>
                <textarea
                  value={generationPrompt}
                  onChange={(e) => setGenerationPrompt(e.target.value)}
                  placeholder="Describe the visual effect you want (e.g., 'wavy underwater distortion that reacts to my voice', 'spiral pattern that follows my hand movement', 'glitch effect with color shifting based on face position')"
                  rows={4}
                />
              </div>
              
              <div className={s.inputGroup}>
                <label>Additional Requirements (optional)</label>
                <input
                  type="text"
                  value={additionalRequirements}
                  onChange={(e) => setAdditionalRequirements(e.target.value)}
                  placeholder="e.g., 'should be subtle and elegant', 'needs bright vibrant colors', 'focus on face tracking'"
                />
              </div>
              
              <button
                className={s.generateButton}
                onClick={generateWithLLM}
                disabled={isGenerating || !generationPrompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <span className={s.spinner}></span>
                    Generating...
                  </>
                ) : (
                  '✨ Generate Shader'
                )}
              </button>
            </div>
          ) : (
            // Generated Shader Preview Section
            <div className={s.section}>
              <h3>✨ Generated Shader</h3>
              
              <div className={s.shaderPreview}>
                <div className={s.shaderInfo}>
                  <h4>{generatedShader.suggestedName}</h4>
                  <p>{generatedShader.suggestedDescription}</p>
                  
                  <div className={s.shaderMeta}>
                    <div className={s.metaItem}>
                      <span className={s.metaLabel}>Primary Tracking:</span>
                      <span className={s.metaBadge} data-mode={generatedShader.primaryTrackingMode}>
                        {generatedShader.primaryTrackingMode}
                      </span>
                    </div>
                    
                    <div className={s.metaItem}>
                      <span className={s.metaLabel}>Color Palette:</span>
                      <div className={s.colorPalette}>
                        {generatedShader.colorPalette?.map((color, index) => (
                          <div 
                            key={index} 
                            className={s.colorSwatch} 
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className={s.metaItem}>
                      <span className={s.metaLabel}>Intensity:</span>
                      <span className={s.metaValue}>{Math.round(generatedShader.intensity * 100)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className={s.shaderActions}>
                  <button 
                    className={s.regenerateButton}
                    onClick={() => setGeneratedShader(null)}
                  >
                    🔄 Generate Different
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <div className={s.error}>{error}</div>}
        </div>

        <div className={s.footer}>
          <button className={s.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          {generatedShader && (
            <button className={s.createButton} onClick={handleCreateShader}>
              Use This Shader
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
