import { useIsTouchDevice } from '@studio-freight/hamo'
import { CustomHead } from 'components/custom-head'

export function Layout({
  seo = {
    title: 'ASCII World - Control the ASCII World',
    description:
      'ASCII World is a tool that allows you to control the ASCII World.',
    image: '',
    keywords: ['ascii', 'world', 'control', 'webgl', 'react-three-fiber'],
  },
  children,
  theme = 'light',
}) {
  const isTouchDevice = useIsTouchDevice()
  return (
    <>
      <CustomHead {...seo} />
      <div className={`theme-${theme}`}>{children}</div>
    </>
  )
}
