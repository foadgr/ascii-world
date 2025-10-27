import { track } from '@vercel/analytics'
import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
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
  {
    id: 'bust',
    name: 'Bust',
    path: '/bust.glb',
  },
  {
    id: 'darkroom',
    name: 'Darkroom Move',
    path: '/darkroom-move.glb',
  },
  {
    id: 'dragonfly',
    name: 'Dragonfly',
    path: '/dragonfly.glb',
  },
]

// Hook to detect if we're on desktop
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  return isDesktop
}

export function ModelSelector({ currentModel, onModelChange, hidden = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const isDesktop = useIsDesktop()

  // Auto-open drawer when component becomes visible on mobile
  useEffect(() => {
    if (!hidden && !isDesktop) {
      setIsOpen(true)
    } else if (hidden) {
      setIsOpen(false)
    }
  }, [hidden, isDesktop])

  const handleModelSelect = (model) => {
    track('Model Selection', {
      action: 'select_model',
      modelId: model.id,
      modelName: model.name,
    })
    onModelChange(model.path)
    setIsOpen(false) // Close drawer after selection
  }

  if (hidden) return null

  const modelList = (
    <>
      {models.map((model) => (
        <button
          key={model.id}
          type="button"
          className={`${s.modelButton} ${currentModel === model.path ? s.active : ''}`}
          onClick={() => handleModelSelect(model)}
          title={model.name}
        >
          {model.name.toUpperCase()}
        </button>
      ))}
    </>
  )

  return isDesktop ? (
    // Desktop: Just show model list (no trigger, controlled by UtilityMenu)
    <div className={s.container}>
      {modelList}
    </div>
  ) : (
    // Mobile: Drawer
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          className={s.triggerMobile}
          onClick={() => {
            track('Model Selector', { action: 'toggle' })
          }}
          title="Toggle 3D models"
          aria-label="Toggle 3D models"
        >
          3D
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className={s.overlay} />
        <Drawer.Content className={s.drawerContent}>
          <div className={s.drawerHeader}>
            <div className={s.handle} />
            <Drawer.Title className={s.drawerTitle}>3D MODELS</Drawer.Title>
          </div>
          <div className={s.drawerBody}>{modelList}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
