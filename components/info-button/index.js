import { IconInfoCircle } from '@tabler/icons-react'
import { track } from '@vercel/analytics'
import s from './info-button.module.scss'

export function InfoButton() {
  return (
    <a
      href="/contact"
      className={s.infoButton}
      onClick={() => {
        track('Contact Info', { action: 'click' })
      }}
    >
      <IconInfoCircle size={23} />
    </a>
  )
}
