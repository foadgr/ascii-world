import { shaderRegistry } from '../../components/shader-effect/ShaderRegistry'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      name,
      description,
      fragmentShader,
      uniforms = {},
      controls = [],
    } = req.body

    if (!name || !description || !fragmentShader) {
      return res.status(400).json({
        error: 'Missing required fields: name, description, fragmentShader',
      })
    }

    // Import the shader into the registry
    const shaderId = shaderRegistry.importFromLLM(
      name,
      description,
      fragmentShader,
      uniforms,
      controls
    )

    res.status(200).json({
      success: true,
      shaderId,
      message: 'Shader registered successfully',
    })
  } catch (error) {
    console.error('Error registering shader:', error)
    res.status(500).json({ error: 'Failed to register shader' })
  }
}
