import { animated, useSpring } from '@react-spring/web'
import cn from 'clsx'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import s from './cursor.module.scss'

const Cursor = () => {
  const cursor = useRef()
  const [state, setState] = useState('default')
  const [isGrab, setIsGrab] = useState(false)
  const [isPointer, setIsPointer] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const router = useRouter()

  const [styles, api] = useSpring(() => ({
    x: 0,
    y: 0,
  }))

  const onMouseMove = useCallback(
    ({ clientX, clientY }) => {
      api.start({
        config: {
          duration: 0,
        },
        x: clientX - 16,
        y: clientY - 16,
      })

      if (!hasMoved) {
        setHasMoved(true)
      }
    },
    [api, hasMoved]
  )

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove, false)

    return () => {
      window.removeEventListener('mousemove', onMouseMove, false)
    }
  }, [onMouseMove])

  const onMouseEnter = useCallback(() => {
    setIsPointer(true)
  }, [])

  const onMouseLeave = useCallback(() => {
    setIsPointer(false)
  }, [])

  const onMouseEnterGrab = useCallback(() => {
    setIsGrab(true)
  }, [])

  const onMouseLeaveGrab = useCallback(() => {
    setIsGrab(false)
  }, [])

  useEffect(() => {
    const elements = [
      '[data-cursor="link"]',
      '[data-cursor="pointer"]',
      'button',
      'a',
    ]

    for (const selector of elements) {
      const element = document.querySelector(selector)
      if (element) {
        element.addEventListener('mouseenter', onMouseEnter, false)
        element.addEventListener('mouseleave', onMouseLeave, false)
      }
    }

    return () => {
      for (const selector of elements) {
        const element = document.querySelector(selector)
        if (element) {
          element.removeEventListener('mouseenter', onMouseEnter, false)
          element.removeEventListener('mouseleave', onMouseLeave, false)
        }
      }
    }
  }, [onMouseEnter, onMouseLeave])

  useEffect(() => {
    const elements = ['[data-cursor="text"]', 'input', 'textarea']

    for (const selector of elements) {
      const element = document.querySelector(selector)
      if (element) {
        element.addEventListener('mouseenter', onMouseEnterGrab, false)
        element.addEventListener('mouseleave', onMouseLeaveGrab, false)
      }
    }

    return () => {
      for (const selector of elements) {
        const element = document.querySelector(selector)
        if (element) {
          element.removeEventListener('mouseenter', onMouseEnterGrab, false)
          element.removeEventListener('mouseleave', onMouseLeaveGrab, false)
        }
      }
    }
  }, [onMouseEnterGrab, onMouseLeaveGrab])

  useEffect(() => {
    document.documentElement.classList.add('has-custom-cursor')

    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [])

  return (
    <div style={{ opacity: hasMoved ? 1 : 0 }} className={s.container}>
      <animated.div ref={cursor} style={styles}>
        <div
          className={cn(s.cursor, isGrab && s.grab, isPointer && s.pointer)}
        />
      </animated.div>
    </div>
  )
}

export { Cursor }
