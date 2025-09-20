import { shaderRegistry } from 'components/shader-effect/ShaderRegistry'
import { useState } from 'react'
import s from './shader-selector.module.scss'

export const ShaderSelector = ({
  currentShader,
  onShaderChange,
  onCreateShader,
  hidden = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const builtInShaders = shaderRegistry.listBuiltIn()
  const customShaders = shaderRegistry.listCustom()
  const allShaders = shaderRegistry.list()

  const categories = [
    { id: 'all', name: 'All Effects' },
    { id: 'Text Effects', name: 'Text Effects' },
    { id: 'Retro Effects', name: 'Retro Effects' },
    { id: 'Print Effects', name: 'Print Effects' },
    { id: 'Analysis Effects', name: 'Analysis Effects' },
    { id: 'Custom', name: 'Custom' },
  ]

  const filteredShaders =
    selectedCategory === 'all'
      ? allShaders
      : allShaders.filter((shader) => shader.category === selectedCategory)

  const handleShaderSelect = (shaderId) => {
    onShaderChange(shaderId)
    setIsOpen(false)
  }

  if (hidden) return null

  return (
    <div className={s.shaderSelector}>
      <button
        type="button"
        className={s.selectorButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Select Shader Effect"
      >
        <span className={s.currentShader}>
          {currentShader
            ? shaderRegistry.get(currentShader)?.name || 'Unknown'
            : 'ASCII Art'}
        </span>
        <svg
          className={`${s.chevron} ${isOpen ? s.open : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={s.dropdown}>
          <div className={s.header}>
            <h3>Shader Effects</h3>
            <button
              className={s.createButton}
              onClick={() => {
                onCreateShader()
                setIsOpen(false)
              }}
              title="Create Custom Shader"
            >
              + Create Shader
            </button>
          </div>

          <div className={s.categories}>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`${s.categoryButton} ${selectedCategory === category.id ? s.active : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className={s.shaderList}>
            {filteredShaders.length > 0 ? (
              filteredShaders.map((shader) => (
                <div
                  key={shader.id}
                  className={`${s.shaderItem} ${currentShader === shader.id ? s.current : ''}`}
                  onClick={() => handleShaderSelect(shader.id)}
                >
                  <div className={s.shaderInfo}>
                    <div className={s.shaderName}>{shader.name}</div>
                    <div className={s.shaderDescription}>
                      {shader.description}
                    </div>
                    {shader.isCustom && (
                      <div className={s.customBadge}>Custom</div>
                    )}
                  </div>
                  {shader.isCustom && (
                    <button
                      className={s.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete shader "${shader.name}"?`)) {
                          shaderRegistry.remove(shader.id)
                          if (currentShader === shader.id) {
                            onShaderChange('ascii') // Fall back to ASCII
                          }
                          // Force re-render by closing and opening
                          setIsOpen(false)
                          setTimeout(() => setIsOpen(true), 50)
                        }
                      }}
                      title="Delete Shader"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className={s.emptyState}>No shaders in this category</div>
            )}
          </div>

          <div className={s.footer}>
            <small>
              {builtInShaders.length} built-in • {customShaders.length} custom
            </small>
          </div>
        </div>
      )}
    </div>
  )
}
