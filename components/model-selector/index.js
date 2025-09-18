import { IconCube } from '@tabler/icons-react'
import { track } from '@vercel/analytics'
import { useState } from 'react'
import s from './model-selector.module.scss'

const models = [
  {
    id: 'penguin',
    name: 'Penguin Astronaut',
    path: '/cutest-penguin-astronaut.glb',
  },
  {
    id: 'rivian',
    name: 'Rivian R1S',
    path: '/rivian-r1s.glb',
  },
  {
    id: 'meta',
    name: 'Meta',
    path: '/meta.glb',
  },
]

export function ModelSelector({ currentModel, onModelChange, hidden = false }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleModelSelect = (model) => {
    track('Model Selection', {
      action: 'select_model',
      modelId: model.id,
      modelName: model.name,
    })
    onModelChange(model.path)
    setIsOpen(false)
  }

  if (hidden) return null

  return (
    <div className={s.container}>
      {/* Trigger Button */}
      <button
        type="button"
        className={s.trigger}
        onClick={() => {
          track('Model Selector', { action: 'open' })
          setIsOpen(!isOpen)
        }}
        title="Choose 3D model"
        aria-label="Choose 3D model"
      >
        <IconCube size={23} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className={s.overlay}
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close model selector"
          />
          <div className={s.dropdown}>
            <div className={s.header}>
              <span className={s.title}>Choose Model</span>
            </div>
            <div className={s.modelList}>
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`${s.modelItem} ${currentModel === model.path ? s.active : ''}`}
                  onClick={() => handleModelSelect(model)}
                >
                  <span className={s.modelName}>{model.name}</span>
                  {currentModel === model.path && (
                    <span className={s.activeIndicator}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
