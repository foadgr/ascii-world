import { openai } from '@ai-sdk/openai'
import { streamObject } from 'ai'
import { shaderRegistry } from '../../components/shader-effect/ShaderRegistry'

// Schema for the expected shader structure
const shaderSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Name of the shader effect',
    },
    description: {
      type: 'string',
      description: 'Brief description of what the shader does',
    },
    category: {
      type: 'string',
      enum: [
        'Text Effects',
        'Retro Effects',
        'Print Effects',
        'Analysis Effects',
        'Custom',
      ],
      description: 'Category for organizing the shader',
    },
    fragmentShader: {
      type: 'string',
      description: 'Complete GLSL fragment shader code',
    },
    uniforms: {
      type: 'object',
      description: 'Uniform definitions with types and defaults',
      additionalProperties: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          default: {},
        },
      },
    },
    controls: {
      type: 'array',
      description: 'UI controls for the shader parameters',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['range', 'boolean', 'text'],
          },
          min: { type: 'number' },
          max: { type: 'number' },
          step: { type: 'number' },
          default: {},
          label: { type: 'string' },
        },
        required: ['name', 'type', 'label'],
      },
    },
  },
  required: ['name', 'description', 'category', 'fragmentShader'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if request was aborted
    if (req.destroyed) {
      return res.status(499).json({ error: 'Request aborted' })
    }

    let shaderPrompt
    try {
      const { prompt } = req.body
      shaderPrompt = prompt
    } catch (error) {
      if (error instanceof SyntaxError) {
        return res.status(400).json({ error: 'Invalid JSON in request body' })
      }
      throw error
    }

    if (!shaderPrompt) {
      return res.status(400).json({ error: 'Shader prompt is required' })
    }

    const { partialObjectStream } = streamObject({
      model: openai('gpt-4o'),
      schema: shaderSchema,
      prompt: `
        Create a custom GLSL fragment shader based on this description: "${shaderPrompt}"
        
        Requirements:
        - Write complete, working GLSL fragment shader code
        - The shader MUST use the mainImage function signature: void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
        - Available uniforms: uGranularity (float), uColor (vec3), uBackground (vec3), resolution (vec2)
        - You can add custom uniforms as needed
        - Sample the input using: texture2D(inputBuffer, uv)
        - Create appropriate UI controls for any custom parameters
        - Choose the most suitable category
        - Make the effect visually interesting and technically sound
        
        Examples of existing shaders for reference:
        - Pixelation: Uses granularity to create pixel art effect
        - Halftone: Creates newspaper-style dot patterns
        - Dithering: Reduces colors with ordered dithering patterns
        - Edge Detection: Uses Sobel operators for edge finding
        
        Make sure the shader is original and matches the requested description.
      `,
      system:
        'You are an expert GLSL shader programmer. Create technically accurate, visually appealing fragment shaders with proper UI controls.',
    })

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    try {
      for await (const partialObject of partialObjectStream) {
        // Check if request was aborted during streaming
        if (req.destroyed) {
          res.end()
          return
        }

        try {
          const chunk = `data: ${JSON.stringify(partialObject)}\n\n`
          res.write(chunk)
        } catch (error) {
          console.error('Error encoding chunk:', error)
          // Continue streaming instead of breaking
        }
      }
      res.end()
    } catch (error) {
      if (error?.name === 'AbortError' || req.destroyed) {
        res.end()
      } else {
        console.error('Streaming error:', error)
        res.end()
      }
    }
  } catch (error) {
    console.error('Error in generate-shader:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
