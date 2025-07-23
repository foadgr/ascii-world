import cn from 'clsx'
import { useRef } from 'react'
import s from './marquee.module.scss'

export function Marquee({ className, children, repeat = 3 }) {
  const keyRef = useRef(Math.random().toString(36).substr(2, 9))

  return (
    <div
      className={cn(className, s.marquee)}
      style={{
        '--repeat': repeat,
      }}
    >
      {Array.from({ length: repeat }, (_, i) => (
        <div key={`marquee-${keyRef.current}-${i}`} className={s.inner}>
          {children}
        </div>
      ))}
    </div>
  )
}
