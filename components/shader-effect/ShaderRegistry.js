// Shader registry for managing different effect types
export class ShaderRegistry {
  constructor() {
    this.shaders = new Map()
    this.loadBuiltInShaders()
  }

  // Register a new shader
  register(id, shader) {
    this.shaders.set(id, {
      ...shader,
      id,
      createdAt: new Date(),
      isCustom: !shader.builtIn,
    })
  }

  // Get a shader by ID
  get(id) {
    return this.shaders.get(id)
  }

  // List all shaders
  list() {
    return Array.from(this.shaders.values())
  }

  // List only custom (user-created) shaders
  listCustom() {
    return this.list().filter((shader) => shader.isCustom)
  }

  // List only built-in shaders
  listBuiltIn() {
    return this.list().filter((shader) => shader.builtIn)
  }

  // Remove a shader
  remove(id) {
    const shader = this.shaders.get(id)
    if (shader && !shader.builtIn) {
      this.shaders.delete(id)
      return true
    }
    return false
  }

  // Load built-in shaders
  loadBuiltInShaders() {
    // ASCII effect (existing) - handled specially by the adapter
    this.register('ascii', {
      name: 'ASCII',
      description: 'Convert video to ASCII characters with depth tracking',
      category: 'Text Effects',
      builtIn: true,
      fragmentShader: 'special_ascii_adapter', // Special marker for ASCII adapter
      uniforms: {
        uCharactersTexture: { type: 'sampler2D', default: null },
        uCharactersLimit: { type: 'float', default: 32 },
        uFillPixels: { type: 'bool', default: false },
        uOverwriteColor: { type: 'bool', default: false },
        uGreyscale: { type: 'bool', default: false },
        uInvert: { type: 'bool', default: false },
        uMatrix: { type: 'bool', default: false },
      },
      controls: [],
    })

    // Pixelation effect
    this.register('pixelation', {
      name: 'Pixelation',
      description: 'Classic pixel art effect with depth-based granularity',
      category: 'Retro Effects',
      builtIn: true,
      fragmentShader: `
        uniform float uGranularity;
        uniform vec3 uColor;
        uniform vec3 uBackground;
        uniform vec2 resolution;

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          // Simple pixelation using granularity
          vec2 division = resolution / uGranularity;
          vec2 d = 1. / division;
          vec2 pixelizedUV = d * (floor(uv / d) + 0.5);
          
          vec4 pixelizedColor = texture2D(inputBuffer, pixelizedUV);
          
          outputColor = vec4(mix(uBackground, pixelizedColor.rgb, pixelizedColor.a), 1.0);
        }
      `,
      uniforms: {},
      controls: [],
    })

    // Halftone effect
    this.register('halftone', {
      name: 'Halftone',
      description: 'Newspaper-style halftone dots with depth tracking',
      category: 'Print Effects',
      builtIn: true,
      fragmentShader: `
        uniform float uGranularity;
        uniform vec3 uColor;
        uniform vec3 uBackground;
        uniform float uDotSize;
        uniform float uContrast;
        uniform vec2 resolution;

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          // Create halftone pattern using granularity from BaseShaderEffect
          vec2 division = resolution / uGranularity;
          vec2 gridUV = uv * division;
          vec2 gridID = floor(gridUV);
          vec2 localUV = fract(gridUV) - 0.5;
          
          // Sample color at grid center
          vec2 centerUV = (gridID + 0.5) / division;
          vec4 sampleColor = texture2D(inputBuffer, centerUV);
          float brightness = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
          
          // Create circular dot based on brightness
          float dist = length(localUV);
          float dotRadius = mix(0.1, 0.5, brightness * uContrast) * uDotSize;
          float dot = 1.0 - smoothstep(dotRadius - 0.02, dotRadius + 0.02, dist);
          
          vec3 color = mix(uBackground, uColor, dot);
          outputColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uDotSize: { type: 'float', default: 1.0 },
        uContrast: { type: 'float', default: 1.5 },
      },
      controls: [
        {
          name: 'dotSize',
          type: 'range',
          min: 0.2,
          max: 1.8,
          step: 0.05,
          default: 1.0,
          label: 'Dot Size',
        },
        {
          name: 'contrast',
          type: 'range',
          min: 0.3,
          max: 2.5,
          step: 0.1,
          default: 1.5,
          label: 'Contrast',
        },
      ],
    })

    // Edge detection
    this.register('edges', {
      name: 'Edge Detection',
      description: 'Sobel edge detection with depth-based intensity',
      category: 'Analysis Effects',
      builtIn: true,
      fragmentShader: `
        uniform float uGranularity;
        uniform vec3 uColor;
        uniform vec3 uBackground;
        uniform float uIntensity;
        uniform float uThreshold;
        uniform vec2 resolution;

        float sobel(vec2 uv) {
          vec2 texelSize = 1.0 / resolution;
          
          // Sobel X kernel
          float sobelX = 
            -1.0 * texture2D(inputBuffer, uv + vec2(-texelSize.x, -texelSize.y)).r +
            -2.0 * texture2D(inputBuffer, uv + vec2(-texelSize.x, 0.0)).r +
            -1.0 * texture2D(inputBuffer, uv + vec2(-texelSize.x, texelSize.y)).r +
             1.0 * texture2D(inputBuffer, uv + vec2(texelSize.x, -texelSize.y)).r +
             2.0 * texture2D(inputBuffer, uv + vec2(texelSize.x, 0.0)).r +
             1.0 * texture2D(inputBuffer, uv + vec2(texelSize.x, texelSize.y)).r;
          
          // Sobel Y kernel
          float sobelY = 
            -1.0 * texture2D(inputBuffer, uv + vec2(-texelSize.x, -texelSize.y)).r +
            -2.0 * texture2D(inputBuffer, uv + vec2(0.0, -texelSize.y)).r +
            -1.0 * texture2D(inputBuffer, uv + vec2(texelSize.x, -texelSize.y)).r +
             1.0 * texture2D(inputBuffer, uv + vec2(-texelSize.x, texelSize.y)).r +
             2.0 * texture2D(inputBuffer, uv + vec2(0.0, texelSize.y)).r +
             1.0 * texture2D(inputBuffer, uv + vec2(texelSize.x, texelSize.y)).r;
          
          return sqrt(sobelX * sobelX + sobelY * sobelY);
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          float edge = sobel(uv) * uIntensity;
          edge = step(uThreshold, edge);
          
          vec3 color = mix(uBackground, uColor, edge);
          outputColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uThreshold: { type: 'float', default: 0.3 },
      },
      controls: [
        {
          name: 'threshold',
          type: 'range',
          min: 0.05,
          max: 0.8,
          step: 0.01,
          default: 0.3,
          label: 'Edge Threshold',
        },
      ],
    })

    // Dithering effect
    this.register('dithering', {
      name: 'Dithering',
      description: 'Floyd-Steinberg dithering with adjustable intensity',
      category: 'Print Effects',
      builtIn: true,
      fragmentShader: `
        uniform float uGranularity;
        uniform vec3 uColor;
        uniform vec3 uBackground;
        uniform float uIntensity;
        uniform float uLevels;
        uniform bool uColorDither;
        uniform vec2 resolution;

        // Pseudo-random function for ordered dithering
        float random(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        // Bayer matrix 4x4 for ordered dithering
        float bayer4x4(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          
          float matrix[16];
          matrix[0] = 0.0; matrix[1] = 8.0; matrix[2] = 2.0; matrix[3] = 10.0;
          matrix[4] = 12.0; matrix[5] = 4.0; matrix[6] = 14.0; matrix[7] = 6.0;
          matrix[8] = 3.0; matrix[9] = 11.0; matrix[10] = 1.0; matrix[11] = 9.0;
          matrix[12] = 15.0; matrix[13] = 7.0; matrix[14] = 13.0; matrix[15] = 5.0;
          
          return matrix[y * 4 + x] / 16.0;
        }

        float dither(float value, vec2 coord) {
          float threshold = bayer4x4(coord * uGranularity);
          threshold = (threshold - 0.5) * uIntensity + 0.5;
          
          float quantized = floor(value * uLevels) / uLevels;
          float nextLevel = ceil(value * uLevels) / uLevels;
          
          return value > threshold ? nextLevel : quantized;
        }

        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          vec2 pixelCoord = uv * resolution;
          vec4 originalColor = texture2D(inputBuffer, uv);
          
          if (uColorDither) {
            // Full color dithering - dither each RGB channel independently
            float r = dither(originalColor.r, pixelCoord);
            float g = dither(originalColor.g, pixelCoord + vec2(1.0, 0.0));
            float b = dither(originalColor.b, pixelCoord + vec2(0.0, 1.0));
            
            outputColor = vec4(r, g, b, originalColor.a);
          } else {
            // Monochrome dithering - convert to single channel then apply custom/background colors
            float gray = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));
            float ditheredGray = dither(gray, pixelCoord);
            
            // Always use the color system (uColor/uBackground) for monochrome dithering
            vec3 finalColor = mix(uBackground, uColor, ditheredGray);
            outputColor = vec4(finalColor, originalColor.a);
          }
        }
      `,
      uniforms: {
        uIntensity: { type: 'float', default: 0.5 },
        uLevels: { type: 'float', default: 4.0 },
        uColorDither: { type: 'bool', default: false },
      },
      controls: [
        {
          name: 'intensity',
          type: 'range',
          min: 0.1,
          max: 1.0,
          step: 0.05,
          default: 0.5,
          label: 'Dither Intensity',
        },
        {
          name: 'levels',
          type: 'range',
          min: 2.0,
          max: 16.0,
          step: 1.0,
          default: 4.0,
          label: 'Color Levels',
        },
        {
          name: 'colorDither',
          type: 'boolean',
          default: false,
          label: 'Full Color Mode',
        },
      ],
    })
  }

  // Import shader from LLM-generated content
  importFromLLM(
    name,
    description,
    fragmentShader,
    uniforms = {},
    controls = []
  ) {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    this.register(id, {
      name,
      description,
      category: 'Custom',
      fragmentShader,
      uniforms,
      controls,
      builtIn: false,
      source: 'llm',
    })

    return id
  }

  // Export shader for sharing
  export(id) {
    const shader = this.get(id)
    if (!shader) return null

    return {
      name: shader.name,
      description: shader.description,
      fragmentShader: shader.fragmentShader,
      uniforms: shader.uniforms,
      controls: shader.controls,
      version: '1.0',
    }
  }

  // Import shader from exported data
  import(shaderData, name = null) {
    return this.importFromLLM(
      name || shaderData.name || 'Imported Shader',
      shaderData.description || 'Imported custom shader',
      shaderData.fragmentShader,
      shaderData.uniforms || {},
      shaderData.controls || []
    )
  }
}

// Global shader registry instance
export const shaderRegistry = new ShaderRegistry()
