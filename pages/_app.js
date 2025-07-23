import { Analytics } from '@vercel/analytics/next'
import dynamic from 'next/dynamic'
import 'resize-observer-polyfill'
import { RealViewport } from '../components/real-viewport'
import '../styles/global.scss'

const Stats = dynamic(
  () => import('../components/stats').then(({ Stats }) => Stats),
  { ssr: false }
)

function MyApp({ Component, pageProps }) {
  return (
    <>
      <RealViewport />
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}

export default MyApp
