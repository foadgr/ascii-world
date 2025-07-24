import { Link } from 'components/link'
import s from './footer.module.scss'

export const Footer = () => {
  return (
    <footer className={s.footer}>
      <div className="layout-block">
        <div className={s.content}>
          <div className={s.section}>
            <h3>ASCII World</h3>
            <p>
              Transform your world into ASCII art with hand and face tracking
            </p>
            <div className={s.projectLinks}>
              <Link href="/">Home</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          <div className={s.section}>
            <h3>Technologies</h3>
            <div className={s.techLinks}>
              <Link href="https://ai.google.dev/edge/mediapipe/solutions/guide">
                Google AI MediaPipe
              </Link>
              <Link href="https://threejs.org/">Three.js</Link>
              <Link href="https://github.com/pmndrs/react-three-fiber">
                React-Three-Fiber
              </Link>
              <Link href="https://react.dev/">React</Link>
              <Link href="https://www.khronos.org/webgl/">WebGL</Link>
            </div>
          </div>

          <div className={s.section}>
            <h3>Learn & Explore</h3>
            <div className={s.resourceLinks}>
              <Link href="https://github.com/pmndrs/drei">
                React-Three-Fiber
              </Link>
              <Link href="https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia">
                Camera API
              </Link>
              <Link href="https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker">
                Hand Tracking
              </Link>
              <Link href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker">
                Face Detection
              </Link>
              <Link href="https://threejs.org/docs/">WebGL Documentation</Link>
            </div>
          </div>


        </div>

        <div className={s.bottom}>
          <p>
            Built with ❤️ by{' '}
            <Link href="https://x.com/hafezverde">@hafezverde</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
