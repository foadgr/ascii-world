import { Pool } from 'pg'

let pool = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    })
  }
  return pool
}

export async function query(text, params) {
  const pool = getPool()
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', {
      text: text.substring(0, 100),
      duration,
      rows: res.rowCount,
    })
    return res
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Initialize database schema
export async function initializeDatabase() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS custom_shaders (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'Custom',
        fragment_shader TEXT NOT NULL,
        uniforms JSONB DEFAULT '{}',
        controls JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_custom_shaders_category ON custom_shaders(category);
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_custom_shaders_created_at ON custom_shaders(created_at);
    `)

    console.log('Database schema initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database schema:', error)
    throw error
  }
}

// CRUD operations for custom shaders
export async function createShader(shaderData) {
  const {
    id,
    name,
    description,
    category = 'Custom',
    fragmentShader,
    uniforms = {},
    controls = [],
    metadata = {},
  } = shaderData

  const result = await query(
    `INSERT INTO custom_shaders 
     (id, name, description, category, fragment_shader, uniforms, controls, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      name,
      description,
      category,
      fragmentShader,
      JSON.stringify(uniforms),
      JSON.stringify(controls),
      JSON.stringify(metadata),
    ]
  )

  return result.rows[0]
}

export async function getShader(id) {
  const result = await query('SELECT * FROM custom_shaders WHERE id = $1', [id])

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    fragmentShader: row.fragment_shader,
    uniforms: row.uniforms,
    controls: row.controls,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isCustom: true,
    builtIn: false,
  }
}

export async function getAllCustomShaders() {
  const result = await query(
    'SELECT * FROM custom_shaders ORDER BY created_at DESC'
  )

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    fragmentShader: row.fragment_shader,
    uniforms: row.uniforms,
    controls: row.controls,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isCustom: true,
    builtIn: false,
  }))
}

export async function updateShader(id, updates) {
  const setParts = []
  const values = []
  let paramIndex = 1

  Object.entries(updates).forEach(([key, value]) => {
    const dbKey = key === 'fragmentShader' ? 'fragment_shader' : key
    setParts.push(`${dbKey} = $${paramIndex}`)
    values.push(typeof value === 'object' ? JSON.stringify(value) : value)
    paramIndex++
  })

  values.push(id)

  const result = await query(
    `UPDATE custom_shaders 
     SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    fragmentShader: row.fragment_shader,
    uniforms: row.uniforms,
    controls: row.controls,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isCustom: true,
    builtIn: false,
  }
}

export async function deleteShader(id) {
  const result = await query(
    'DELETE FROM custom_shaders WHERE id = $1 RETURNING *',
    [id]
  )

  return result.rows.length > 0
}
