import { tool } from 'ai'

// Tool for generating a complete shader with all components
export const generateShaderTool = tool({
  description: 'Generate a complete GLSL fragment shader with metadata and controls',
  execute: async ({ name, description, effect, category }) => {
    // Normalize inputs and generate sensible defaults
    const effectText = (effect || '').trim()
    const cleanName = (name && name.trim()) ||
      (effectText ? effectText.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : 'generated_shader')
    const cleanDescription = (description && description.trim()) ||
      (effectText ? `AI-generated shader: ${effectText}` : 'AI-generated visual effect shader')
    const cleanCategory = category || 'Custom'

    // Generate shader based on effect description
    let fragmentShader, uniforms, controls

    // Determine shader type based on effect description
    const effectLower = effectText.toLowerCase()
    
    if (effectLower.includes('water') || effectLower.includes('ripple')) {
      fragmentShader = `
precision mediump float;

uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform vec2 resolution;
uniform sampler2D inputBuffer;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    
    float wave = sin(dist * 20.0 * uIntensity - uTime * uSpeed * 5.0) * 0.02 * uIntensity;
    vec2 rippleUV = uv + wave * normalize(uv - center);
    
    vec4 texColor = texture2D(inputBuffer, rippleUV);
    outputColor = vec4(texColor.rgb, texColor.a);
}`.trim()

      uniforms = {
        uIntensity: { type: 'float', default: 1.0 },
        uSpeed: { type: 'float', default: 1.0 }
      }

      controls = [
        { name: 'uIntensity', type: 'range', min: 0.0, max: 3.0, step: 0.1, default: 1.0, label: 'Ripple Intensity' },
        { name: 'uSpeed', type: 'range', min: 0.1, max: 3.0, step: 0.1, default: 1.0, label: 'Wave Speed' }
      ]
    } else if (effectLower.includes('glitch') || effectLower.includes('distortion')) {
      fragmentShader = `
precision mediump float;

uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform vec2 resolution;
uniform sampler2D inputBuffer;
uniform float uTime;
uniform float uIntensity;
uniform float uGlitchHeight;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 glitchUV = uv;
    
    // Digital glitch effect
    float noise = fract(sin(dot(vec2(floor(uv.y * resolution.y / uGlitchHeight), uTime), vec2(12.9898, 78.233))) * 43758.5453);
    
    if (noise > 0.95) {
        glitchUV.x += (noise - 0.95) * uIntensity * 0.3;
    }
    
    vec4 texColor = texture2D(inputBuffer, glitchUV);
    
    // RGB shift
    vec4 r = texture2D(inputBuffer, glitchUV + vec2(0.002 * uIntensity, 0.0));
    vec4 g = texture2D(inputBuffer, glitchUV);
    vec4 b = texture2D(inputBuffer, glitchUV - vec2(0.002 * uIntensity, 0.0));
    
    outputColor = vec4(r.r, g.g, b.b, texColor.a);
}`.trim()

      uniforms = {
        uIntensity: { type: 'float', default: 1.0 },
        uGlitchHeight: { type: 'float', default: 10.0 }
      }

      controls = [
        { name: 'uIntensity', type: 'range', min: 0.0, max: 3.0, step: 0.1, default: 1.0, label: 'Glitch Intensity' },
        { name: 'uGlitchHeight', type: 'range', min: 5.0, max: 50.0, step: 1.0, default: 10.0, label: 'Scanline Height' }
      ]
    } else if (effectLower.includes('plasma') || effectLower.includes('energy')) {
      fragmentShader = `
precision mediump float;

uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform vec2 resolution;
uniform sampler2D inputBuffer;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 p = uv * 2.0 - 1.0;
    
    float plasma = sin(p.x * 10.0 + uTime * uSpeed) +
                   sin(p.y * 10.0 + uTime * uSpeed) +
                   sin((p.x + p.y) * 10.0 + uTime * uSpeed) +
                   sin(sqrt(p.x * p.x + p.y * p.y) * 10.0 + uTime * uSpeed);
    
    plasma = (plasma + 4.0) / 8.0;
    
    vec3 plasmaColor = vec3(
        sin(plasma * 3.14159 * 2.0),
        sin(plasma * 3.14159 * 2.0 + 2.0),
        sin(plasma * 3.14159 * 2.0 + 4.0)
    ) * 0.5 + 0.5;
    
    vec4 texColor = texture2D(inputBuffer, uv);
    vec3 finalColor = mix(texColor.rgb, plasmaColor, uIntensity * 0.7);
    
    outputColor = vec4(finalColor, texColor.a);
}`.trim()

      uniforms = {
        uIntensity: { type: 'float', default: 0.5 },
        uSpeed: { type: 'float', default: 1.0 }
      }

      controls = [
        { name: 'uIntensity', type: 'range', min: 0.0, max: 1.0, step: 0.05, default: 0.5, label: 'Plasma Intensity' },
        { name: 'uSpeed', type: 'range', min: 0.1, max: 5.0, step: 0.1, default: 1.0, label: 'Animation Speed' }
      ]
    } else {
      // Generic effect - create a simple pattern based on the description
      fragmentShader = `
precision mediump float;

uniform float uGranularity;
uniform vec3 uColor;
uniform vec3 uBackground;
uniform vec2 resolution;
uniform sampler2D inputBuffer;
uniform float uTime;
uniform float uIntensity;
uniform float uPattern;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 texColor = texture2D(inputBuffer, uv);
    
    // Create a pattern based on UV coordinates and time
    float pattern = sin(uv.x * uPattern + uTime) * cos(uv.y * uPattern + uTime);
    pattern = (pattern + 1.0) * 0.5;
    
    vec3 effectColor = mix(texColor.rgb, uColor, pattern * uIntensity);
    outputColor = vec4(effectColor, texColor.a);
}`.trim()

      uniforms = {
        uIntensity: { type: 'float', default: 0.5 },
        uPattern: { type: 'float', default: 10.0 }
      }

      controls = [
        { name: 'uIntensity', type: 'range', min: 0.0, max: 1.0, step: 0.05, default: 0.5, label: 'Effect Intensity' },
        { name: 'uPattern', type: 'range', min: 5.0, max: 50.0, step: 1.0, default: 10.0, label: 'Pattern Scale' }
      ]
    }

    return {
      name: cleanName,
      description: cleanDescription,
      category: cleanCategory,
      fragmentShader,
      uniforms,
      controls,
      success: true
    }
  }
})

// Tool for registering and applying a shader (combined for simplicity)
export const registerAndApplyShaderTool = tool({
  description: 'Register a generated shader and signal to apply it to the canvas',
  execute: async ({ name, description, fragmentShader, uniforms, controls }) => {
    // Return shader data for client-side registration
    return {
      success: true,
      action: 'registerAndApply',
      shaderData: {
        name,
        description,
        fragmentShader,
        uniforms,
        controls
      },
      message: `Shader "${name}" is ready to be registered and applied`
    }
  }
})

// Export all tools as a collection
export const shaderTools = {
  generateShader: generateShaderTool,
  registerAndApplyShader: registerAndApplyShaderTool
}
