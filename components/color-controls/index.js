import { track } from '@vercel/analytics'
import { useState } from 'react'
import s from './color-controls.module.scss'

export function ColorControls({
  setColor,
  color,
  background,
  onSetColorChange,
  onColorChange,
  onBackgroundChange,
  hidden = false,
}) {
  const [showPickers, setShowPickers] = useState(false)

  const handleToggle = () => {
    const newValue = !setColor
    track('Color Mode', {
      action: 'toggle',
      mode: newValue ? 'custom' : 'color',
    })
    onSetColorChange(newValue)

    // Show pickers when switching to custom
    if (newValue) {
      setShowPickers(true)
    } else {
      setShowPickers(false)
    }
  }

  if (hidden) return null

  return (
    <div className={s.container}>
      <button
        type="button"
        className={s.trigger}
        onClick={handleToggle}
        aria-label={`Color mode: ${setColor ? 'custom' : 'color'}`}
      >
        {setColor ? 'CUSTOM' : 'COLOR'}
      </button>

      {setColor && showPickers && (
        <div className={s.pickers}>
          <div className={s.pickerGroup}>
            <label htmlFor="fg-color" className={s.label}>FG</label>
            <input
              id="fg-color"
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className={s.colorInput}
            />
          </div>
          <div className={s.pickerGroup}>
            <label htmlFor="bg-color" className={s.label}>BG</label>
            <input
              id="bg-color"
              type="color"
              value={background}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className={s.colorInput}
            />
          </div>
        </div>
      )}
    </div>
  )
}
