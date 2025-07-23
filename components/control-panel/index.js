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
  const [position, setPosition] = useState({ x: 50, y: 50 })
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
      const maxX = window.innerWidth - 500 // modal width
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
        <div className={s.modalBody}>{children}</div>
      </div>
    </>
  )
}

const Slider = ({ label, value, onChange, min, max, step = 1 }) => {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className={s.control}>
      <label className={s.label} htmlFor={id}>
        {label}: <span className={s.value}>{value}</span>
      </label>
      <input
        id={id}
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
}

const Toggle = ({ label, value, onChange, disabled = false }) => (
  <div className={s.control}>
    <label className={s.toggleLabel}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className={s.checkbox}
      />
      <span className={disabled ? s.disabled : ''}>{label}</span>
    </label>
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

const TextInput = ({ label, value, onChange }) => {
  const id = `text-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className={s.control}>
      <label className={s.label} htmlFor={id}>
        {label}:
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={s.textInput}
      />
    </div>
  )
}

const Button = ({ children, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${s.button} ${disabled ? s.disabled : ''}`}
  >
    {children}
  </button>
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
            <Settings2 size={18} />
          </button>

          <DraggableModal open={open} onOpenChange={handleOpenChange}>
            <div className={s.controls}>
              {/* Visual Controls Section */}
              <div className={s.section}>
                <h3 className={s.sectionTitle}>visual settings</h3>

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
              onClick={() => track('Control Panel', { action: 'open' })}
            >
              <Settings2 size={18} />
            </button>
          </Drawer.Trigger>

          <Drawer.Portal>
            <Drawer.Overlay className={s.overlay} />
            <Drawer.Content className={s.content}>
              <div className={s.header}>
                <Drawer.Title className={s.title}>world controls</Drawer.Title>
                <div className={s.handle} />
              </div>

              <div className={s.controls}>
                {/* Visual Controls Section */}
                <div className={s.section}>
                  <h3 className={s.sectionTitle}>visual settings</h3>

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
