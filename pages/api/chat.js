import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

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

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 })
    }

    const result = streamText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: `You are an expert GLSL shader programmer helping create custom visual effects.

When the user describes a visual effect they want, you should:
1. First acknowledge their request and explain what you'll create
2. Generate a complete, working GLSL fragment shader
3. Explain what the shader does and how it works

Be conversational and helpful while creating amazing visual effects!`,
        },
        ...messages
          .filter((msg) => msg?.role && msg?.parts)
          .map((msg) => ({
            role: msg.role,
            content: msg.parts?.find((p) => p.type === 'text')?.text || '',
          })),
      ],
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Error in chat:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
