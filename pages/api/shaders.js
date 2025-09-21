import {
  createShader,
  deleteShader,
  getAllCustomShaders,
  getShader,
  initializeDatabase,
  updateShader,
} from 'lib/database'

export default async function handler(req, res) {
  try {
    // Initialize database on first request
    await initializeDatabase()

    const { method } = req

    switch (method) {
      case 'GET': {
        const { id } = req.query

        if (id) {
          // Get specific shader
          const shader = await getShader(id)
          if (!shader) {
            return res.status(404).json({ error: 'Shader not found' })
          }
          return res.status(200).json(shader)
        } else {
          // Get all custom shaders
          const shaders = await getAllCustomShaders()
          return res.status(200).json(shaders)
        }
      }

      case 'POST': {
        // Create new shader
        const shaderData = req.body

        if (!shaderData.id || !shaderData.name || !shaderData.fragmentShader) {
          return res.status(400).json({
            error: 'Missing required fields: id, name, fragmentShader',
          })
        }

        const createdShader = await createShader(shaderData)
        return res.status(201).json(createdShader)
      }

      case 'PUT': {
        // Update existing shader
        const { id } = req.query
        const updates = req.body

        if (!id) {
          return res.status(400).json({ error: 'Shader ID is required' })
        }

        const updatedShader = await updateShader(id, updates)
        if (!updatedShader) {
          return res.status(404).json({ error: 'Shader not found' })
        }

        return res.status(200).json(updatedShader)
      }

      case 'DELETE': {
        // Delete shader
        const { id } = req.query

        if (!id) {
          return res.status(400).json({ error: 'Shader ID is required' })
        }

        const deleted = await deleteShader(id)
        if (!deleted) {
          return res.status(404).json({ error: 'Shader not found' })
        }

        return res.status(200).json({ message: 'Shader deleted successfully' })
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}
