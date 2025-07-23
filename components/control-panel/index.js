import { track } from '@vercel/analytics'
import { Settings2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import s from './control-panel.module.scss'

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
  const [position, setPosition] = useState({ x: 20, y: 80 }) // Initial position, will be updated
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
      const maxX = window.innerWidth - 420 // modal width
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
      // Set initial position below the control panel button on the right
      setPosition({ x: window.innerWidth - 420, y: 100 })
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
          <h2 className={s.modalTitle}>world controls</h2>
          <button
            type="button"
            className={s.closeButton}
            onClick={() => onOpenChange(false)}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

// Input components
const TextInput = ({ label, value, onChange }) => (
  <div className={s.inputGroup}>
    <label htmlFor={`text-${label}`} className={s.label}>
      {label}
    </label>
    <input
      id={`text-${label}`}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={s.textInput}
    />
  </div>
)

const Slider = ({ label, value, onChange, min, max, step }) => (
  <div className={s.inputGroup}>
    <label htmlFor={`slider-${label}`} className={s.label}>
      {label}: {value}
    </label>
    <input
      id={`slider-${label}`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={s.slider}
    />
  </div>
)

const Toggle = ({ label, value, onChange }) => (
  <div className={s.toggleGroup}>
    <label className={s.toggleLabel}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className={s.toggleInput}
      />
      <span className={s.toggleSlider} />
      {label}
    </label>
  </div>
)

export function ControlPanel({
  // Visual controls
  characters,
  granularity,
  charactersLimit,
  fontSize,
  fillPixels,
  fit,
  greyscale,
  invert,
  matrix,
  setTime,
  time,

  // Handlers
  onCharactersChange,
  onGranularityChange,
  onCharactersLimitChange,
  onFontSizeChange,
  onFillPixelsChange,
  onFitChange,
  onGreyscaleChange,
  onInvertChange,
  onMatrixChange,
  onSetTimeChange,
  onTimeChange,
  onOpenChange,
}) {
  const [open, setOpen] = useState(false)
  const isDesktop = useIsDesktop()

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <>
      {isDesktop ? (
        <>
          <button
            type="button"
            className={s.trigger}
            onClick={() => {
              track('Control Panel', { action: 'open' })
              handleOpenChange(true)
            }}
          >
            <Settings2 size={23} />
          </button>

          <DraggableModal open={open} onOpenChange={handleOpenChange}>
            <div className={s.controls}>
              {/* Visual Controls Section */}
              <div className={s.section}>
                <TextInput
                  label="characters"
                  value={characters}
                  onChange={onCharactersChange}
                />

                <Slider
                  label="granularity"
                  value={granularity}
                  onChange={onGranularityChange}
                  min={1}
                  max={50}
                  step={1}
                />

                <Slider
                  label="char limit"
                  value={charactersLimit}
                  onChange={onCharactersLimitChange}
                  min={1}
                  max={48}
                  step={1}
                />

                <Slider
                  label="font size"
                  value={fontSize}
                  onChange={onFontSizeChange}
                  min={1}
                  max={128}
                  step={1}
                />

                <div className={s.toggleGrid}>
                  <Toggle
                    label="fill pixels"
                    value={fillPixels}
                    onChange={onFillPixelsChange}
                  />

                  <Toggle label="fit" value={fit} onChange={onFitChange} />

                  <Toggle
                    label="greyscale"
                    value={greyscale}
                    onChange={onGreyscaleChange}
                  />

                  <Toggle
                    label="invert"
                    value={invert}
                    onChange={onInvertChange}
                  />
                </div>

                <Toggle
                  label="matrix mode"
                  value={matrix}
                  onChange={onMatrixChange}
                />

                {matrix && (
                  <Toggle
                    label="set time"
                    value={setTime}
                    onChange={onSetTimeChange}
                  />
                )}

                {setTime && (
                  <Slider
                    label="time"
                    value={time}
                    onChange={onTimeChange}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                )}
              </div>
            </div>
          </DraggableModal>
        </>
      ) : (
        <Drawer.Root open={open} onOpenChange={handleOpenChange}>
          <Drawer.Trigger asChild>
            <button
              type="button"
              className={s.trigger}
              onClick={() => {
                track('Control Panel', { action: 'open' })
              }}
            >
              <Settings2 size={23} />
            </button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className={s.overlay} />
            <Drawer.Content className={s.content}>
              <div className={s.header}>
                <div className={s.handle} />
                <Drawer.Title className={s.title}>world controls</Drawer.Title>
              </div>

              <div className={s.controls}>
                <div className={s.section}>
                  <TextInput
                    label="characters"
                    value={characters}
                    onChange={onCharactersChange}
                  />

                  <Slider
                    label="granularity"
                    value={granularity}
                    onChange={onGranularityChange}
                    min={1}
                    max={50}
                    step={1}
                  />

                  <Slider
                    label="char limit"
                    value={charactersLimit}
                    onChange={onCharactersLimitChange}
                    min={1}
                    max={48}
                    step={1}
                  />

                  <Slider
                    label="font size"
                    value={fontSize}
                    onChange={onFontSizeChange}
                    min={1}
                    max={128}
                    step={1}
                  />

                  <div className={s.toggleGrid}>
                    <Toggle
                      label="fill pixels"
                      value={fillPixels}
                      onChange={onFillPixelsChange}
                    />

                    <Toggle label="fit" value={fit} onChange={onFitChange} />

                    <Toggle
                      label="greyscale"
                      value={greyscale}
                      onChange={onGreyscaleChange}
                    />

                    <Toggle
                      label="invert"
                      value={invert}
                      onChange={onInvertChange}
                    />
                  </div>

                  <Toggle
                    label="matrix mode"
                    value={matrix}
                    onChange={onMatrixChange}
                  />

                  {matrix && (
                    <Toggle
                      label="set time"
                      value={setTime}
                      onChange={onSetTimeChange}
                    />
                  )}

                  {setTime && (
                    <Slider
                      label="time"
                      value={time}
                      onChange={onTimeChange}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  )}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  )
}
