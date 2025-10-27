import { track } from '@vercel/analytics'
import Link from 'next/link'
import s from './info-button.module.scss'

export function InfoButton() {
  return (
    <Link
      href="/contact"
      className={s.infoButton}
      onClick={() => {
        track('Contact Info', { action: 'click' })
      }}
    >
      INFO
    </Link>
  )
}
