import { track } from '@vercel/analytics'
import { useCallback, useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import s from './color-controls.module.scss'

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

// Draggable modal for desktop
const DraggableModal = ({ open, onOpenChange, children }) => {
  const [position, setPosition] = useState({
    x: window.innerWidth - 340,
    y: 100,
  }) // Initial position on the right, will be updated
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Keep modal within viewport bounds
      const maxX = window.innerWidth - 320 // modal width
      const maxY = window.innerHeight - 200 // modal height

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      // Set initial position above the color button on the right
      setPosition({ x: window.innerWidth - 340, y: window.innerHeight - 280 })
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <>
      <div
        className={s.modalOverlay}
        onClick={() => onOpenChange(false)}
        onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div
        className={s.modalContent}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'auto',
        }}
      >
        <div
          className={s.modalHeader}
          onMouseDown={handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          <h2 className={s.modalTitle}>color controls</h2>
          <button
            type="button"
            className={s.closeButton}
            onClick={() => onOpenChange(false)}
          >
            ×
          </button>
        </div>
        <div className={s.modalBody}>{children}</div>
      </div>
    </>
  )
}

const ColorModeSelector = ({ setColor, onSetColorChange, hasAiPalette }) => (
  <div className={s.colorModeSelector}>
    <span className={s.colorModeLabel}>color mode:</span>
    <div className={s.colorModeOptions}>
      <label className={s.colorModeOption}>
        <input
          type="radio"
          name="colorMode"
          checked={!setColor}
          onChange={() => onSetColorChange(false)}
          className={s.colorModeRadio}
        />
        <span>{hasAiPalette ? 'ai palette' : 'default'}</span>
      </label>
      <label className={s.colorModeOption}>
        <input
          type="radio"
          name="colorMode"
          checked={setColor}
          onChange={() => onSetColorChange(true)}
          className={s.colorModeRadio}
        />
        <span>custom</span>
      </label>
    </div>
  </div>
)

const ColorInput = ({ label, value, onChange }) => {
  const id = `color-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className={s.control}>
      <label className={s.label} htmlFor={id}>
        {label}:
      </label>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={s.colorInput}
      />
    </div>
  )
}

const AIPalettePreview = ({ palette, onColorSelect }) => {
  if (!palette || palette.length === 0) return null

  return (
    <div className={s.aiPalettePreview}>
      <div className={s.paletteLabel}>AI Generated Palette:</div>
      <div className={s.paletteColors}>
        {palette.map((color, index) => (
          <button
            key={index}
            className={s.paletteColor}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect && onColorSelect(color, index)}
            title={`Color ${index + 1}: ${color}`}
          />
        ))}
      </div>
    </div>
  )
}

const ColorButton = ({ setColor, color, background, aiPalette }) => {
  if (aiPalette && aiPalette.length > 0) {
    // AI mode - show the AI-generated color palette
    const gradientStops = aiPalette
      .map((color, index) => {
        const percentage = (index / (aiPalette.length - 1)) * 100
        return `${color} ${percentage}%`
      })
      .join(', ')

    return (
      <div className={s.colorButton}>
        <div
          className={s.aiPalette}
          style={{
            background: `linear-gradient(135deg, ${gradientStops})`,
          }}
        />
      </div>
    )
  }

  if (!setColor) {
    // Default mode - show gradient representing real life colors
    return (
      <div className={s.colorButton}>
        <div className={s.defaultGradient} />
      </div>
    )
  }

  // Custom mode - show half foreground, half background
  return (
    <div className={s.colorButton}>
      <div
        className={s.splitColor}
        style={{
          background: `linear-gradient(135deg, ${color} 50%, ${background} 50%)`,
        }}
      />
    </div>
  )
}

export function ColorControls({
  setColor,
  color,
  background,
  onSetColorChange,
  onColorChange,
  onBackgroundChange,
  aiPalette,
  onAiColorSelect,
  hidden = false,
}) {
  const [open, setOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const hasAiPalette = aiPalette && aiPalette.length > 0

  return (
    <>
      {/* Floating Color Button */}
      {!hidden && !open && (
        <button
          type="button"
          className={s.trigger}
          onClick={() => {
            track('Color Panel', { action: 'open' })
            setOpen(true)
          }}
          aria-label="Open color controls"
        >
          <ColorButton
            setColor={setColor}
            color={color}
            background={background}
            aiPalette={hasAiPalette && !setColor ? aiPalette : null}
          />
        </button>
      )}

      {isDesktop ? (
        <DraggableModal open={open} onOpenChange={setOpen}>
          <div className={s.controls}>
            <ColorModeSelector
              setColor={setColor}
              onSetColorChange={onSetColorChange}
              hasAiPalette={hasAiPalette}
            />

            {/* Show AI palette when available and not in custom mode */}
            {hasAiPalette && !setColor && (
              <AIPalettePreview
                palette={aiPalette}
                onColorSelect={onAiColorSelect}
              />
            )}

            <div className={s.colorControls}>
              {setColor && (
                <ColorInput
                  label="foreground"
                  value={color}
                  onChange={onColorChange}
                />
              )}
              <ColorInput
                label="background"
                value={background}
                onChange={onBackgroundChange}
              />
            </div>
          </div>
        </DraggableModal>
      ) : (
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className={s.overlay} />
            <Drawer.Content className={s.content}>
              <div className={s.header}>
                <Drawer.Title className={s.title}>color controls</Drawer.Title>
                <div className={s.handle} />
              </div>

              <div className={s.controls}>
                <ColorModeSelector
                  setColor={setColor}
                  onSetColorChange={onSetColorChange}
                  hasAiPalette={hasAiPalette}
                />

                {/* Show AI palette when available and not in custom mode */}
                {hasAiPalette && !setColor && (
                  <AIPalettePreview
                    palette={aiPalette}
                    onColorSelect={onAiColorSelect}
                  />
                )}

                <div className={s.colorControls}>
                  {setColor && (
                    <ColorInput
                      label="foreground"
                      value={color}
                      onChange={onColorChange}
                    />
                  )}
                  <ColorInput
                    label="background"
                    value={background}
                    onChange={onBackgroundChange}
                  />
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  )
}
