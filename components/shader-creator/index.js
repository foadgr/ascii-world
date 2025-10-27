import { shaderRegistry } from 'components/shader-effect/ShaderRegistry'
import { useRef, useState } from 'react'
import s from './shader-creator.module.scss'

const SHADER_TEMPLATES = {
  basic: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uIntensity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Your shader code here
  // inputColor: current pixel color
  // uv: texture coordinates (0-1)
  // outputColor: final pixel color
  
  outputColor = inputColor;
}`,

  pixelate: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Pixelate effect
  vec2 division = resolution / uGranularity;
  vec2 d = 1.0 / division;
  vec2 pixelizedUV = d * (floor(uv / d) + 0.5);
  
  vec4 pixelizedColor = texture2D(inputBuffer, pixelizedUV);
  outputColor = vec4(mix(uBackground, pixelizedColor.rgb, pixelizedColor.a), 1.0);
}`,

  faceTracking: `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform bool uFaceDepthMode;
uniform float uNoseTipDepth;
uniform float uLeftCheekDepth;
uniform float uRightCheekDepth;
uniform float uGranularityMin;
uniform float uGranularityMax;

float calculateFaceGranularity(vec2 uv) {
  if (!uFaceDepthMode) {
    return uGranularity;
  }
  
  vec2 center = vec2(0.5, 0.45);
  vec2 facePos = (uv - center) * 2.2;
  float x = facePos.x;
  float y = facePos.y;
  
  // Face region weights
  float noseTipWeight = exp(-((x*x + (y-0.1)*(y-0.1)) * 6.0));
  float leftCheekWeight = max(0.0, (x + 0.4) * 3.0) * exp(-((y*y + (x+0.6)*(x+0.6)) * 1.5)) * step(-0.8, x);
  float rightCheekWeight = max(0.0, (-x + 0.4) * 3.0) * exp(-((y*y + (x-0.6)*(x-0.6)) * 1.5)) * step(x, 0.8);
  
  float totalWeight = noseTipWeight + leftCheekWeight + rightCheekWeight;
  if (totalWeight < 0.001) {
    return uGranularity;
  }
  
  // Calculate depth-based granularity
  float depthScale = 8.0;
  float depthOffset = 0.15;
  
  float finalGranularity = 
    mix(uGranularityMin, uGranularityMax, (uNoseTipDepth + depthOffset) * depthScale) * (noseTipWeight / totalWeight) +
    mix(uGranularityMin, uGranularityMax, (uLeftCheekDepth + depthOffset) * depthScale) * (leftCheekWeight / totalWeight) +
    mix(uGranularityMin, uGranularityMax, (uRightCheekDepth + depthOffset) * depthScale) * (rightCheekWeight / totalWeight);
    
  return clamp(finalGranularity, uGranularityMin, uGranularityMax);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float currentGranularity = calculateFaceGranularity(uv);
  
  // Your effect code here using currentGranularity
  outputColor = inputColor;
}`,
}

const LLM_PROMPT_TEMPLATE = `Create a GLSL fragment shader for a video effect. The shader should:

Requirements:
- Use the mainImage function signature: void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
- inputColor is the current pixel color
- uv are texture coordinates (0.0 to 1.0)
- outputColor is the final pixel color
- Use texture2D(inputBuffer, uv) to sample the input video
- Available uniforms: uGranularity (float), uColor (vec3), uBackground (vec3), uIntensity (float), uTime (float)
- Resolution is available as 'resolution' (vec2)

Effect Description: {description}

Additional Requirements: {requirements}

Please return only the complete GLSL shader code, no explanations.`

export const ShaderCreator = ({ isOpen, onClose, onShaderCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [shaderCode, setShaderCode] = useState(SHADER_TEMPLATES.basic)
  const [customUniforms, setCustomUniforms] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPrompt, setGenerationPrompt] = useState('')
  const [additionalRequirements, setAdditionalRequirements] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('basic')
  const [error, setError] = useState('')

  const textareaRef = useRef()

  const handleTemplateChange = (template) => {
    setSelectedTemplate(template)
    setShaderCode(SHADER_TEMPLATES[template] || SHADER_TEMPLATES.basic)
  }

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

      // Note: In a real implementation, you'd call your LLM API here
      // For now, we'll simulate it with a timeout and show a placeholder

      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulated LLM response - in reality this would come from your LLM
      const simulatedResponse = `uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform float uIntensity;
uniform float uTime;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // ${generationPrompt}
  
  // Example generated effect based on prompt
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);
  float wave = sin(dist * 20.0 - uTime * 2.0) * 0.5 + 0.5;
  
  vec4 color = texture2D(inputBuffer, uv);
  color.rgb = mix(color.rgb, uColor, wave * uIntensity);
  
  outputColor = color;
}`

      setShaderCode(simulatedResponse)
      if (!name) {
        setName(`Generated Effect: ${generationPrompt.substring(0, 30)}...`)
      }
      if (!description) {
        setDescription(`LLM-generated effect: ${generationPrompt}`)
      }
    } catch (err) {
      setError('Failed to generate shader. Please try again or write manually.')
      console.error('LLM generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const parseCustomUniforms = () => {
    if (!customUniforms.trim()) return {}

    try {
      // Simple parsing for uniform declarations like:
      // uniform float myFloat; // default: 1.0
      // uniform vec3 myColor; // default: vec3(1.0, 0.0, 0.0)
      const uniforms = {}
      const lines = customUniforms.split('\n')

      for (const line of lines) {
        const match = line.match(
          /uniform\s+(\w+)\s+(\w+);?\s*(?:\/\/\s*default:\s*(.+))?/
        )
        if (match) {
          const [, type, name, defaultValue] = match
          uniforms[name] = {
            type,
            default: defaultValue
              ? defaultValue.trim()
              : getDefaultForType(type),
          }
        }
      }

      return uniforms
    } catch (err) {
      console.warn('Failed to parse custom uniforms:', err)
      return {}
    }
  }

  const getDefaultForType = (type) => {
    switch (type) {
      case 'float':
        return 1.0
      case 'int':
        return 1
      case 'bool':
        return false
      case 'vec2':
        return [0, 0]
      case 'vec3':
        return [0, 0, 0]
      case 'vec4':
        return [0, 0, 0, 1]
      default:
        return null
    }
  }

  const handleCreateShader = () => {
    if (!name.trim()) {
      setError('Please enter a name for the shader')
      return
    }

    if (!shaderCode.trim()) {
      setError('Please enter shader code')
      return
    }

    try {
      const uniforms = parseCustomUniforms()

      const shaderId = shaderRegistry.importFromLLM(
        name,
        description || 'Custom shader effect',
        shaderCode,
        uniforms,
        [] // Controls can be added later
      )

      onShaderCreated(shaderId)
      handleClose()
    } catch (err) {
      setError(`Failed to create shader: ${err.message}`)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setShaderCode(SHADER_TEMPLATES.basic)
    setCustomUniforms('')
    setGenerationPrompt('')
    setAdditionalRequirements('')
    setSelectedTemplate('basic')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <h2>NEW SHADER</h2>
          <button type="button" className={s.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={s.content}>
          {/* LLM Generation Section */}
          <div className={s.section}>
            <h3>AI GENERATION</h3>
            <div className={s.inputGroup}>
              <label htmlFor="effect-description">Effect Description</label>
              <textarea
                id="effect-description"
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder="Describe the visual effect you want (e.g., 'wavy distortion that follows audio', 'spiral pattern that rotates', 'glitch effect with color shifting')"
                rows={3}
              />
            </div>
            <div className={s.inputGroup}>
              <label htmlFor="additional-requirements">Additional Requirements (optional)</label>
              <input
                id="additional-requirements"
                type="text"
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="e.g., 'should respond to face tracking', 'needs to be subtle'"
              />
            </div>
            <button
              type="button"
              className={s.generateButton}
              onClick={generateWithLLM}
              disabled={isGenerating}
            >
              {isGenerating ? 'GENERATING...' : 'GENERATE'}
            </button>
          </div>

          <div className={s.divider}>OR</div>

          {/* Manual Creation Section */}
          <div className={s.section}>
            <h3>MANUAL ENTRY</h3>

            <div className={s.inputGroup}>
              <label htmlFor="template-select">Template</label>
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="basic">Basic Effect</option>
                <option value="pixelate">Pixelation</option>
                <option value="faceTracking">Face Tracking</option>
              </select>
            </div>

            <div className={s.row}>
              <div className={s.inputGroup}>
                <label htmlFor="shader-name">Shader Name *</label>
                <input
                  id="shader-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Cool Effect"
                />
              </div>
              <div className={s.inputGroup}>
                <label htmlFor="shader-description">Description</label>
                <input
                  id="shader-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this shader does"
                />
              </div>
            </div>

            <div className={s.inputGroup}>
              <label htmlFor="shader-code">Fragment Shader Code *</label>
              <textarea
                id="shader-code"
                ref={textareaRef}
                value={shaderCode}
                onChange={(e) => setShaderCode(e.target.value)}
                className={s.codeEditor}
                rows={20}
                spellCheck={false}
                placeholder="Enter your GLSL fragment shader code..."
              />
            </div>

            <div className={s.inputGroup}>
              <label htmlFor="custom-uniforms">Custom Uniforms (optional)</label>
              <textarea
                id="custom-uniforms"
                value={customUniforms}
                onChange={(e) => setCustomUniforms(e.target.value)}
                placeholder={`uniform float myFloat; // default: 1.0
uniform vec3 myColor; // default: vec3(1.0, 0.0, 0.0)
uniform bool myBool; // default: false`}
                rows={4}
              />
              <small>Declare additional uniforms your shader needs</small>
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}
        </div>

        <div className={s.footer}>
          <button type="button" className={s.cancelButton} onClick={handleClose}>
            CANCEL
          </button>
          <button type="button" className={s.createButton} onClick={handleCreateShader}>
            CREATE
          </button>
        </div>
      </div>
    </div>
  )
}
