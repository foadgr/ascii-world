import { track } from '@vercel/analytics'
import Link from 'next/link'
import { useState } from 'react'
import s from './utility-menu.module.scss'

export function UtilityMenu({
  onChatOpen,
  onUploadClick,
  on3DToggle,
  hidden = false,
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    track('Utility Menu', { action: 'toggle' })
    setIsOpen(!isOpen)
  }

  const handleChatClick = () => {
    track('Shader Chat', { action: 'open' })
    onChatOpen()
  }

  const handle3DClick = () => {
    track('3D Models', { action: 'toggle' })
    on3DToggle()
  }

  if (hidden) return null

  return (
    <div className={s.container}>
      <button
        type="button"
        className={s.trigger}
        onClick={handleToggle}
        title="Toggle utility menu"
        aria-label="Toggle utility menu"
      >
        {isOpen ? '−' : '+'}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className={s.utilityButton}
            onClick={handle3DClick}
            title="Toggle 3D models"
          >
            3D
          </button>

          <button
            type="button"
            className={s.utilityButton}
            onClick={handleChatClick}
            title="Chat to create shader"
          >
            CHAT
          </button>

          <button
            type="button"
            className={s.utilityButton}
            onClick={() => {
              track('Upload Button', { action: 'click' })
              onUploadClick()
            }}
            title="Upload file"
          >
            UPLOAD
          </button>

          <Link
            href="/contact"
            className={s.utilityButton}
            onClick={() => {
              track('Contact Info', { action: 'click' })
            }}
          >
            INFO
          </Link>
        </>
      )}
    </div>
  )
}
