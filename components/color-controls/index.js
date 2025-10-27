import { track } from '@vercel/analytics'
import { useEffect, useState } from 'react'
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const isDesktop = useIsDesktop()

  const handleToggle = () => {
    const newValue = !setColor
    track('Color Mode', {
      action: 'toggle',
      mode: newValue ? 'custom' : 'color',
    })
    onSetColorChange(newValue)

    // Show pickers when switching to custom
    if (newValue) {
      if (isDesktop) {
        setShowPickers(true)
      } else {
        setIsDrawerOpen(true)
      }
    } else {
      setShowPickers(false)
      setIsDrawerOpen(false)
    }
  }

  if (hidden) return null

  return isDesktop ? (
    // Desktop: Original inline layout
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
            <label htmlFor="fg-color" className={s.label}>
              FG
            </label>
            <input
              id="fg-color"
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className={s.colorInput}
            />
          </div>
          <div className={s.pickerGroup}>
            <label htmlFor="bg-color" className={s.label}>
              BG
            </label>
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
  ) : (
    // Mobile: Drawer with large circular color pickers
    <div className={s.container}>
      <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Trigger asChild>
          <button
            type="button"
            className={s.trigger}
            onClick={handleToggle}
            aria-label={`Color mode: ${setColor ? 'custom' : 'color'}`}
          >
            {setColor ? 'CUSTOM' : 'COLOR'}
          </button>
        </Drawer.Trigger>
        {setColor && (
          <Drawer.Portal>
            <Drawer.Overlay className={s.overlay} />
            <Drawer.Content className={s.drawerContent}>
              <div className={s.drawerHeader}>
                <div className={s.handle} />
                <Drawer.Title className={s.drawerTitle}>CUSTOM COLORS</Drawer.Title>
              </div>
              <div className={s.drawerBody}>
                {/* Foreground Color Picker */}
                <div className={s.colorPickerWrapper}>
                  <label htmlFor="fg-color-mobile" className={s.circleLabel}>
                    FG
                  </label>
                  <input
                    id="fg-color-mobile"
                    type="color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    className={s.circleColorInput}
                  />
                </div>
                {/* Background Color Picker */}
                <div className={s.colorPickerWrapper}>
                  <label htmlFor="bg-color-mobile" className={s.circleLabel}>
                    BG
                  </label>
                  <input
                    id="bg-color-mobile"
                    type="color"
                    value={background}
                    onChange={(e) => onBackgroundChange(e.target.value)}
                    className={s.circleColorInput}
                  />
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        )}
      </Drawer.Root>
    </div>
  )
}
