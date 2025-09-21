import { openai } from '@ai-sdk/openai'
import {
  streamText,
  stepCountIs,
  convertToCoreMessages,
  NoSuchToolError,
  InvalidToolInputError,
  TypeValidationError,
} from 'ai'
import { shaderTools } from '../../lib/shader-tools'

export const runtime = 'edge'

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Debug: Check if API key is available
  console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY)

  try {
    const { messages } = await req.json()
    console.log('Received messages:', messages)

    // Convert incoming UI messages to core model messages safely
    const coreMessages = convertToCoreMessages(Array.isArray(messages) ? messages : [])

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 })
    }

    const result = streamText({
      model: openai('gpt-4o'),
      tools: shaderTools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(5), // Enable multi-step calls
      messages: [
        {
          role: 'system',
          content: `You are an expert GLSL shader programmer helping create custom visual effects.

When the user describes a visual effect they want, you should:
1. Call generateShader with at least { effect }. Name/description/category are optional; infer good defaults.
2. Then call registerAndApplyShader with the returned shader data to register and apply it to the canvas.
3. Finally, explain briefly what the shader does and how to tweak controls.

Available tools:
- generateShader: Create a complete shader with metadata and controls based on the user's description
- registerAndApplyShader: Register the generated shader and apply it to the canvas automatically

Always use both tools in sequence to create and apply shaders. Be conversational and helpful while creating amazing visual effects!`,
        },
        ...coreMessages,
      ],
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('Step finished:', { text, toolCalls: toolCalls.length, toolResults: toolResults.length, finishReason })
      },
    })

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error('AI stream error:', error)
        if (NoSuchToolError.isInstance(error)) {
          return 'The model tried to call an unknown tool. Please retry.'
        }
        if (InvalidToolInputError.isInstance(error) || TypeValidationError.isInstance(error)) {
          return 'The model called a tool with invalid inputs. I will try to fix and retry.'
        }
        return `An unknown error occurred while generating the shader: ${error?.message || 'unknown'}`
      },
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
