import { useIsTouchDevice } from '@studio-freight/hamo'
import { CustomHead } from 'components/custom-head'
import { Footer } from 'components/footer'

export function Layout({
  seo = {
    title: 'ASCII World - Control your world with ASCII',
    description:
      'An open-source ASCII tool built by @hafezverde to create live ASCII filters on your phone or webcam.',
    image: '',
    keywords: [
      'ascii',
      'art',
      'mediapipe',
      'computer vision',
      'hand tracking',
      'face tracking',
      'generator',
      'converter',
      'text art',
      'character art',
      'webgl',
      'react',
    ],
  },
  children,
  theme = 'light',
  showFooter = true,
}) {
  const isTouchDevice = useIsTouchDevice()
  return (
    <>
      <CustomHead {...seo} />
      <div className={`theme-${theme}`}>
        {children}
        {showFooter && <Footer />}
      </div>
    </>
  )
}
