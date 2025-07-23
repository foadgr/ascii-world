import { IconBrandX } from '@tabler/icons-react'
import { isMobileOrTablet, supportsCameraSwitch } from 'lib/device'
import { useCallback, useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import s from './intro-modal.module.scss'

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
  const [position, setPosition] = useState({ x: '50%', y: '50%' })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Keep modal within viewport bounds
      const maxX = window.innerWidth - 600 // modal width
      const maxY = window.innerHeight - 400 // modal height

      setPosition({
        x: `${Math.max(0, Math.min(newX, maxX))}px`,
        y: `${Math.max(0, Math.min(newY, maxY))}px`,
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
          left: position.x,
          top: position.y,
          transform: position.x === '50%' ? 'translate(-50%, -50%)' : 'none',
          cursor: isDragging ? 'grabbing' : 'auto',
        }}
      >
        <div
          className={s.modalHeader}
          onMouseDown={handleMouseDown}
          style={{ cursor: 'grab' }}
        >
          <h2 className={s.modalTitle}>Welcome to ASCII World</h2>
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

export function IntroModal() {
  const [open, setOpen] = useState(false)
  const [hasSeenIntro, setHasSeenIntro] = useState(false)
  const isDesktop = useIsDesktop()
  const isMobile = isMobileOrTablet()
  const canSwitchCamera = supportsCameraSwitch()

  // Check if user has seen intro before
  useEffect(() => {
    const seen = localStorage.getItem('ascii-world-intro-seen')
    if (!seen) {
      setOpen(true)
    } else {
      setHasSeenIntro(true)
    }
  }, [])

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen)
    if (!newOpen) {
      localStorage.setItem('ascii-world-intro-seen', 'true')
      setHasSeenIntro(true)
    }
  }

  const steps = [
    {
      number: 1,
      title: 'Start your camera',
      description: 'Tap the camera icon to begin',
    },
    {
      number: 2,
      title: 'Choose tracking mode',
      description: 'Select either hand or face tracking',
    },
    {
      number: 3,
      title: 'Calibrate your distance',
      description:
        'When you toggle tracking on, tap the orange icon to lock in your current position',
    },
    {
      number: 4,
      title: 'Control the detail',
      description:
        'Move closer to the camera for maximum detail, or further away for minimum detail',
    },
  ]

  if (isMobile && canSwitchCamera) {
    steps.push({
      number: 5,
      title: 'Switch cameras',
      description:
        'Use the camera switch button to toggle between front and back cameras',
    })
  }

  const modalContent = (
    <div className={s.content}>
      <div className={s.intro}>
        <h3 className={s.subtitle}>Transform your world into ASCII art</h3>
        <p className={s.description}>
          A free project built by{' '}
          <a
            href="https://x.com/hafezverde"
            target="_blank"
            rel="noopener noreferrer"
            className={s.creditLink}
          >
            @hafezverde <IconBrandX size={14} className={s.xIcon} />
          </a>
        </p>
      </div>

      <div className={s.steps}>
        <h4 className={s.stepsTitle}>How to get started:</h4>
        {steps.map((step) => (
          <div key={step.number} className={s.step}>
            <div className={s.stepNumber}>{step.number}</div>
            <div className={s.stepContent}>
              <h5 className={s.stepTitle}>{step.title}</h5>
              <p className={s.stepDescription}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={s.startButton}
        onClick={() => handleOpenChange(false)}
      >
        Let's create some ASCII art!
      </button>
    </div>
  )

  return (
    <>
      {isDesktop ? (
        <DraggableModal open={open} onOpenChange={handleOpenChange}>
          {modalContent}
        </DraggableModal>
      ) : (
        <Drawer.Root open={open} onOpenChange={handleOpenChange}>
          <Drawer.Portal>
            <Drawer.Overlay className={s.overlay} />
            <Drawer.Content className={s.drawerContent}>
              <div className={s.drawerHeader}>
                <div className={s.handle} />
                <Drawer.Title className={s.drawerTitle}>
                  Welcome to ASCII World
                </Drawer.Title>
              </div>
              {modalContent}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  )
}
