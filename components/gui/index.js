import Logo from 'assets/svg/logo.svg'
import Panel from 'assets/svg/panel.svg'
import cn from 'clsx'
import levaTheme from 'config/leva'
import { Leva } from 'leva'
import { useStore } from 'lib/store'
import s from './gui.module.scss'

export function GUI() {
  const gui = useStore((state) => state.gui)
  const setGui = useStore((state) => state.setGui)

  return (
    <div className={cn(s.gui, gui && s.open)}>
      <button
        type="button"
        className={s.toggle}
        onClick={() => {
          setGui(!gui)
        }}
      >
        <Panel />
      </button>
      <header className={s.title}>
        <Logo />
        <h1>ASCII_WORLD_TOOL</h1>
      </header>
      <div className={s.main}>
        <div className={s.leva}>
          <Leva
            isRoot
            fill
            flat
            titleBar={false}
            theme={levaTheme}
            hideCopyButton
            neverHide
            collapsed={false}
          />
        </div>
        <div className={s.description}>
          <p>
            the ASCII World ascii tool is an open-source ASCII tool built by{' '}
            <a href="https://x.com/hafezverde">hafezverde</a> to create live
            ASCII filters on your phone or webcam using{' '}
            <a
              href="https://ai.google.dev/edge/mediapipe/solutions/guide"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI MediaPipe
            </a>
            ,{' '}
            <a
              href="https://threejs.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Three.js
            </a>
            , and{' '}
            <a
              href="https://github.com/pmndrs/react-three-fiber"
              target="_blank"
              rel="noopener noreferrer"
            >
              React-Three-Fiber
            </a>
            .
          </p>
          <br />
          <p>
            DRAG AND DROP ANY FILE
            <br /> .glb, .mp4, .mov, .webm, .png, .webp, .avif
          </p>
          <br />
          <p>
            Learn more about{' '}
            <a
              href="https://github.com/pmndrs/drei"
              target="_blank"
              rel="noopener noreferrer"
            >
              React-Three-Fiber
            </a>
            ,{' '}
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API"
              target="_blank"
              rel="noopener noreferrer"
            >
              WebGL
            </a>
            , or{' '}
            <a
              href="https://www.khronos.org/webgl/"
              target="_blank"
              rel="noopener noreferrer"
            >
              WebGL specification
            </a>
            .
          </p>
        </div>
        <div className={s.links}>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://x.com/hafezverde"
          >
            X
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://x.com/hafezverde"
          >
            X
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker"
          >
            hand tracking docs
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://threejs.org/examples/"
          >
            three.js examples
          </a>
        </div>
      </div>
    </div>
  )
}
