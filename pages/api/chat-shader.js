import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Debug: Check if API key is available
  console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY)
  console.log(
    'API key starts with:',
    process.env.OPENAI_API_KEY?.substring(0, 10)
  )

  try {
    const { messages } = req.body
    console.log('Received messages:', messages)

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      system: `You are an expert GLSL shader programmer helping create custom visual effects.

When the user describes a visual effect they want, you should:

1. First acknowledge their request and explain what you'll create
2. Generate a complete, working GLSL fragment shader with these requirements:
   - Use the exact function signature: void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
   - Available base uniforms: uGranularity (float), uColor (vec3), uBackground (vec3), resolution (vec2), uTime (float)
   - Sample input using: texture2D(inputBuffer, uv)
   - Add custom uniforms as needed for controls
   - Make it compatible with hand/face/audio tracking via granularity
3. Suggest appropriate controls for the effect
4. Provide the final shader in a clear format

Available effect categories: Text Effects, Retro Effects, Print Effects, Analysis Effects

Examples of control types:
- range: for sliders (need min, max, step, default)
- boolean: for toggles (need default)
- text: for text inputs (need default)

Keep responses concise but helpful. Focus on creating visually interesting effects that can be controlled through tracking.`,
    })

    return result.toAIStreamResponse()
  } catch (error) {
    console.error('Error in chat-shader:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
