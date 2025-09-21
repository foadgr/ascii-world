import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the structured output schema
const ShaderGenerationResponse = z.object({
  shaderCode: z
    .string()
    .describe(
      'Complete GLSL fragment shader code that creatively uses tracking uniforms'
    ),
  suggestedName: z
    .string()
    .describe(
      'Short, descriptive name for the effect (e.g., "Audio Reactive Waves", "Face Distortion Field")'
    ),
  suggestedDescription: z
    .string()
    .describe(
      'Brief description of what the shader does and how it responds to tracking data'
    ),
  primaryTrackingMode: z
    .enum(['audio', 'face', 'hand', 'mixed'])
    .describe('The primary tracking mode this shader is designed for'),
  colorPalette: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      'Array of hex color codes that represent the main colors used in the effect'
    ),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Recommended default intensity level for the effect (0.0 to 1.0)'
    ),
  customUniforms: z
    .array(
      z.object({
        name: z.string().describe('Uniform name (without u prefix)'),
        type: z
          .enum(['float', 'vec2', 'vec3', 'vec4', 'bool', 'int'])
          .describe('GLSL type'),
        defaultValue: z
          .string()
          .describe(
            'Default value as a string (e.g., "1.0", "[0.5, 0.5]", "true")'
          ),
        description: z.string().describe('What this uniform controls'),
      })
    )
    .describe('Custom uniforms specific to this shader (can be empty array)'),
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, description, requirements } = req.body

  if (!prompt || !description) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Use GPT-5 Responses API for better performance
    const response = await openai.responses.create({
      model: 'gpt-5',
      input: `You are an expert GLSL shader programmer specializing in creative video effects with real-time tracking integration. You create sophisticated, performant shaders that leverage audio, face, and hand tracking data in creative ways.

Focus on creating visually stunning effects that creatively use the available tracking uniforms. Make interactions OBVIOUS and RESPONSIVE - users should clearly see their hand/face movements affecting the visual elements. Don't just modulate granularity - think about colors, patterns, distortions, particle movements, force fields, and interactive elements.

Key interaction design principles:
- Hand position (uHandPalmX, uHandPalmY) should create visible attraction/repulsion forces
- Face depth (uFaceNormalizedDepth) should trigger clear visual responses
- Make effects strong enough to be clearly visible - subtle effects are hard to notice
- Use smooth interpolation but make changes immediately noticeable

Available tracking uniforms you can use:
- Audio: uAudioLevel, uAudioVoice, uAudioMusic, uAudioNoise, uAudioSpike, uAudioSmoothed
- Face: uFaceDetected, uFaceNoseDepth, uFaceForeheadDepth, uFaceLeftCheekDepth, uFaceRightCheekDepth, uFaceChinDepth, uFaceLeftEyeDepth, uFaceRightEyeDepth, uFaceMouthDepth, uFaceNormalizedDepth (-1 to 1, where -1 is close, 1 is far)
- Hand: uHandDetected, uHandNormalizedDepth (-1 to 1, where -1 is close, 1 is far), uHandPalmX (0 to 1, left to right), uHandPalmY (0 to 1, top to bottom)
- Standard: uGranularity, uColor, uBackground, uIntensity, uTime, resolution (vec2)

CRITICAL GLSL NAMING REQUIREMENTS - FOLLOW EXACTLY:
- Use ONLY standard GLSL function names: clamp(), mix(), step(), smoothstep(), texture2D(), etc.
- NEVER use prefixed function names like "e0Saturate", "e0Resolution", "e0Mix", etc.
- The main function MUST be named exactly "mainImage" - NOT "e0MainImage"
- Use "resolution" for screen resolution - NOT "e0Resolution" 
- Use standard uniform names without any prefixes: "uTime", "uColor", "resolution", etc.
- Do NOT add random prefixes like "e0" to ANY variable or function names
- All shader code must use standard GLSL syntax that compiles without errors

EXAMPLES OF WHAT NOT TO DO:
❌ void e0MainImage() - WRONG, use: void mainImage()
❌ vec2 px = 1.0 / max(e0Resolution, vec2(1.0)); - WRONG, use: vec2 px = 1.0 / max(resolution, vec2(1.0));
❌ float val = e0Mix(a, b, t); - WRONG, use: float val = mix(a, b, t);
❌ color = e0Clamp(color, 0.0, 1.0); - WRONG, use: color = clamp(color, 0.0, 1.0);

Create effects that are visually compelling and make creative use of multiple tracking inputs. Prioritize clear, responsive interactions over subtle effects.

User request: ${prompt}

Return a JSON object with the exact structure expected by our Zod schema.`,
      reasoning: { effort: 'medium' }, // High reasoning for complex shader generation
      text: {
        verbosity: 'low', // Medium verbosity for detailed but not excessive output
        format: {
          type: 'json_schema',
          name: 'shader_generation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              shaderCode: {
                type: 'string',
                description:
                  'Complete GLSL fragment shader code that creatively uses tracking uniforms',
              },
              suggestedName: {
                type: 'string',
                description: 'Short, descriptive name for the effect',
              },
              suggestedDescription: {
                type: 'string',
                description: 'Brief description of what the shader does',
              },
              primaryTrackingMode: {
                type: 'string',
                enum: ['audio', 'face', 'hand', 'mixed'],
                description:
                  'The primary tracking mode this shader is designed for',
              },
              colorPalette: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 5,
                description:
                  'Array of hex color codes representing main colors',
              },
              intensity: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Recommended default intensity level (0.0 to 1.0)',
              },
              customUniforms: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['float', 'vec2', 'vec3', 'vec4', 'bool', 'int'],
                    },
                    defaultValue: {
                      type: 'string',
                      description:
                        'Default value as a string (e.g., "1.0", "[0.5, 0.5]", "true")',
                    },
                    description: { type: 'string' },
                  },
                  required: ['name', 'type', 'defaultValue', 'description'],
                  additionalProperties: false,
                },
                description: 'Optional custom uniforms specific to this shader',
              },
            },
            required: [
              'shaderCode',
              'suggestedName',
              'suggestedDescription',
              'primaryTrackingMode',
              'colorPalette',
              'intensity',
              'customUniforms',
            ],
            additionalProperties: false,
          },
        },
      },
    })

    // Handle potential refusal
    if (response.refusal) {
      return res.status(400).json({
        error: 'Request refused by AI safety system',
        refusal: response.refusal,
      })
    }

    // Handle incomplete response
    if (response.finish_reason === 'length') {
      return res.status(400).json({
        error: 'Response was truncated. Please try a simpler request.',
      })
    }

    // Parse the structured response from GPT-5
    let parsedResponse
    try {
      // GPT-5 Responses API returns output_text which should contain our structured JSON
      parsedResponse = JSON.parse(response.output_text)

      // Fix common GLSL naming issues in the shader code
      if (parsedResponse.shaderCode) {
        parsedResponse.shaderCode = parsedResponse.shaderCode
          // Fix specific known problematic prefixes
          .replace(/e0Resolution/g, 'resolution')
          .replace(/e0Saturate/g, 'saturate') 
          .replace(/e0MainImage/g, 'mainImage')
          .replace(/e0Mix/g, 'mix')
          .replace(/e0Clamp/g, 'clamp')
          .replace(/e0Step/g, 'step')
          .replace(/e0Smoothstep/g, 'smoothstep')
          .replace(/e0Texture2D/g, 'texture2D')
          .replace(/e0Max/g, 'max')
          .replace(/e0Min/g, 'min')
          .replace(/e0Length/g, 'length')
          .replace(/e0Dot/g, 'dot')
          .replace(/e0Cross/g, 'cross')
          .replace(/e0Normalize/g, 'normalize')
          .replace(/e0Abs/g, 'abs')
          .replace(/e0Sin/g, 'sin')
          .replace(/e0Cos/g, 'cos')
          .replace(/e0Fract/g, 'fract')
          .replace(/e0Floor/g, 'floor')
          .replace(/e0Ceil/g, 'ceil')
          // Remove any remaining e0 prefixes as fallback
          .replace(/e0([A-Z][a-zA-Z0-9_]*)/g, (match, funcName) => {
            // Convert e0CamelCase to camelCase (lowercase first letter)
            return funcName.charAt(0).toLowerCase() + funcName.slice(1)
          })
          .replace(/e0([a-z][a-zA-Z0-9_]*)/g, '$1') // Remove e0 from already lowercase functions
      }

      // Fix color palette format issues
      if (
        parsedResponse.colorPalette &&
        Array.isArray(parsedResponse.colorPalette)
      ) {
        parsedResponse.colorPalette = parsedResponse.colorPalette
          .map((color) => {
            if (typeof color === 'string') {
              // Fix malformed hex colors and remove invalid characters
              return color.replace(/[^#0-9A-Fa-f]/g, '').substring(0, 7)
            }
            return color
          })
          .filter((color) => /^#[0-9A-Fa-f]{6}$/.test(color)) // Only keep valid hex colors
      }

      // Validate with our Zod schema
      const validatedResponse = ShaderGenerationResponse.parse(parsedResponse)

      return res.status(200).json(validatedResponse)
    } catch (parseError) {
      console.error('Failed to parse GPT-5 response:', parseError)
      return res.status(500).json({
        error: 'Failed to parse AI response as valid JSON',
        details:
          process.env.NODE_ENV === 'development'
            ? parseError.message
            : undefined,
      })
    }
  } catch (error) {
    console.error('OpenAI API error:', error)

    // Handle different types of errors
    if (error.code === 'invalid_request_error') {
      return res.status(400).json({
        error: 'Invalid request to OpenAI API',
        details: error.message,
      })
    }

    return res.status(500).json({
      error: 'Failed to generate shader. Please try again.',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}
