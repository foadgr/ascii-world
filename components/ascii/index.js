import { OrbitControls, useAspect } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { ASCIIEffect } from 'components/ascii-effect/index'
import { FontEditor } from 'components/font-editor'
import { HandTrackingStatus } from 'components/hand-tracking-status'
import { useHandTracking } from 'hooks/use-hand-tracking'
import { button, useControls } from 'leva'
import { text } from 'lib/leva/text'
import { useContext, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  AnimationMixer,
  Group,
  MeshBasicMaterial,
  MeshNormalMaterial,
  TextureLoader,
  VideoTexture,
} from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import tunnel from 'tunnel-rat'
import s from './ascii.module.scss'
import { AsciiContext } from './context'

const ui = tunnel()

// Initialize DRACOLoader as a singleton
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath(
  'https://cdn.jsdelivr.net/npm/three@0.175.0/examples/jsm/libs/draco/'
)

// Initialize GLTFLoader as a singleton
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

// Hand landmark connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
  [0, 17], // Palm base
]

// Create Skia paint objects for drawing
const createSkiaPaints = async () => {
  try {
    // Only load CanvasKit in browser environment
    if (typeof window === 'undefined') {
      return { landmarkPaint: null, connectionPaint: null, CanvasKit: null }
    }

    // Load CanvasKit from external CDN to avoid webpack bundling
    if (!window.CanvasKitInit) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/canvaskit-wasm@0.40.0/bin/canvaskit.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    const CanvasKit = await window.CanvasKitInit({
      locateFile: (file) => {
        return `https://unpkg.com/canvaskit-wasm@0.40.0/bin/${file}`
      },
    })

    const landmarkPaint = new CanvasKit.Paint()
    landmarkPaint.setAntiAlias(true)
    landmarkPaint.setColor(CanvasKit.Color(0, 255, 136, 1.0)) // #00ff88
    landmarkPaint.setStyle(CanvasKit.PaintStyle.Fill)

    const connectionPaint = new CanvasKit.Paint()
    connectionPaint.setAntiAlias(true)
    connectionPaint.setColor(CanvasKit.Color(255, 255, 255, 1.0)) // #ffffff
    connectionPaint.setStrokeWidth(2)
    connectionPaint.setStyle(CanvasKit.PaintStyle.Stroke)

    return { landmarkPaint, connectionPaint, CanvasKit }
  } catch (error) {
    console.warn('CanvasKit not available for hand landmark drawing:', error)
    return { landmarkPaint: null, connectionPaint: null, CanvasKit: null }
  }
}

// Initialize Skia asynchronously
let skiaInitialized = false
let skiaPaints = { landmarkPaint: null, connectionPaint: null, CanvasKit: null }

const initializeSkia = async () => {
  if (!skiaInitialized) {
    skiaPaints = await createSkiaPaints()
    skiaInitialized = true
  }
  return skiaPaints
}

const Scene = () => {
  const ref = useRef()
  const [asset, setAsset] = useState('/darkroom-move.glb')
  const [mixer, setMixer] = useState()
  const [model, setModel] = useState()
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraVideo, setCameraVideo] = useState(null)
  const [skiaReady, setSkiaReady] = useState(false)
  const { cameraActive, handTrackingEnabled, handControlledGranularity, set } =
    useContext(AsciiContext)

  // Initialize CanvasKit when component mounts
  useEffect(() => {
    const setupSkia = async () => {
      try {
        await initializeSkia()
        setSkiaReady(true)
      } catch (error) {
        console.warn('Failed to initialize CanvasKit:', error)
      }
    }

    if (typeof window !== 'undefined') {
      setupSkia()
    }
  }, [])

  // Hand tracking integration
  const handTracking = useHandTracking({
    videoElement: cameraVideo,
    enabled: handTrackingEnabled && cameraActive && skiaReady,
    granularityRange: { min: 4, max: 32 },
    onDepthChange: (data) => {
      if (handControlledGranularity && data.handDetected) {
        set({ granularity: data.granularity })
      }
    },
  })

  useFrame((state, delta) => {
    mixer?.update(delta)
  })

  // Camera stream management
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.autoplay = true

      video.onloadedmetadata = () => {
        video.play()
        setCameraVideo(video)
        setTexture(new VideoTexture(video))
        // Clear other content when camera starts
        setModel(null)
      }

      setCameraStream(stream)
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      for (const track of cameraStream.getTracks()) {
        track.stop()
      }
      setCameraStream(null)
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null
      setCameraVideo(null)
    }
    setTexture(null)
  }

  // React to camera active state changes
  useEffect(() => {
    if (cameraActive) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [cameraActive])

  // Share hand tracking state with context
  useEffect(() => {
    set({
      handTracking: {
        ...handTracking,
        isEnabled: handTrackingEnabled,
      },
    })
  }, [handTracking, handTrackingEnabled, set])

  useEffect(() => {
    if (!asset) return
    const src = asset

    if (
      src.startsWith('data:application/octet-stream;base64') ||
      src.includes('.glb')
    ) {
      const group = new Group()

      gltfLoader.load(
        src,
        ({ scene, animations }) => {
          const mixer = new AnimationMixer(scene)
          setMixer(mixer)
          const clips = animations

          for (const clip of clips) {
            const action = mixer.clipAction(clip)
            action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY)
            action.clampWhenFinished = true
            action.play()
          }

          group.add(scene)
          scene.traverse((mesh) => {
            if (
              Object.keys(mesh.userData)
                .map((v) => v.toLowerCase())
                .includes('occlude')
            ) {
              mesh.material = new MeshBasicMaterial({ color: '#000000' })
            } else {
              mesh.material = new MeshNormalMaterial()
            }
          })
          setModel(group)
          // Stop camera when loading other assets
          stopCamera()
        },
        undefined,
        (error) => {
          console.error('Error loading GLTF:', error)
        }
      )
    }
  }, [asset])

  const [texture, setTexture] = useState()

  useEffect(() => {
    if (model) setTexture(null)
  }, [model])

  useEffect(() => {
    if (texture && !cameraVideo) setModel(null)
  }, [texture, cameraVideo])

  useEffect(() => {
    const src = asset

    if (
      src.startsWith('data:video') ||
      src.includes('.mp4') ||
      src.includes('.webm') ||
      src.includes('.mov')
    ) {
      // Stop camera when loading video files
      stopCamera()

      const video = document.createElement('video')

      function onLoad() {
        setTexture(new VideoTexture(video))
      }

      video.addEventListener('loadedmetadata', onLoad, { once: true })

      video.src = src
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true
      video.loop = true
      video.autoplay = true
      video.play()
    } else if (
      src.startsWith('data:image') ||
      src.includes('.jpg') ||
      src.includes('.png') ||
      src.includes('.jpeg')
    ) {
      // Stop camera when loading images
      stopCamera()

      new TextureLoader().load(src, (texture) => {
        setTexture(texture)
      })
    }
  }, [asset])

  const { viewport, camera } = useThree()

  const dimensions = (() => {
    if (!texture) return null
    try {
      if (texture.isVideoTexture && texture.image) {
        return [texture.image.videoWidth, texture.image.videoHeight]
      }
      if (texture.image) {
        return [texture.image.naturalWidth, texture.image.naturalHeight]
      }
    } catch (error) {
      console.warn('Could not get texture dimensions:', error)
    }
    return null
  })()

  const scale = useAspect(
    dimensions?.[0] || viewport.width, // Pixel-width
    dimensions?.[1] || viewport.height, // Pixel-height
    1 // Optional scaling factor
  )

  const { fit } = useContext(AsciiContext)

  const [drag, setDrag] = useState(false)
  const dropzone = useRef()

  useEffect(() => {
    function onDragEnter(e) {
      setDrag(true)
    }

    function onDragLeave(e) {
      if (e.srcElement !== dropzone.current) return
      setDrag(false)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
    }
  }, [])

  useEffect(() => {
    if (texture) {
      camera.position.set(0, 0, 5)
      camera.rotation.set(0, 0, 0)
      camera.zoom = 1
    } else {
      camera.position.set(500, 250, 500)
    }

    camera.updateProjectionMatrix()
  }, [camera, texture])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <>
      <ui.In>
        {drag && (
          <div
            ref={dropzone}
            className={s.dropzone}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)

              const filename = e.dataTransfer.files[0].name
              const isFont =
                filename.endsWith('.ttf') ||
                filename.endsWith('.otf') ||
                filename.endsWith('.woff') ||
                filename.endsWith('.woff2')

              const reader = new FileReader()
              reader.addEventListener(
                'load',
                (event) => {
                  if (isFont) {
                    const fontData = event.target.result
                    const fontName = 'CustomFont'

                    const fontFace = `
                    @font-face {
                      font-family: '${fontName}';
                      src: url(${fontData});
                    }
                  `

                    const styleElement = document.createElement('style')
                    styleElement.innerHTML = fontFace

                    document.head.appendChild(styleElement)
                  } else {
                    setAsset(reader.result)
                  }
                },
                false
              )

              if (e.dataTransfer.files[0]) {
                reader.readAsDataURL(e.dataTransfer.files[0])
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
            }}
          />
        )}
      </ui.In>

      <group ref={ref}>
        {model && (
          <>
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.05}
              // Touch-friendly settings
              enableZoom={true}
              enablePan={true}
              enableRotate={true}
              // Touch sensitivity
              rotateSpeed={0.7}
              zoomSpeed={0.8}
              panSpeed={0.8}
            />
            <group scale={200}>
              <primitive object={model} />
            </group>
          </>
        )}

        {texture && (
          <mesh scale={fit ? scale : [viewport.width, viewport.height, 1]}>
            <planeGeometry />
            <meshBasicMaterial map={texture} />
          </mesh>
        )}
      </group>
    </>
  )
}

function Postprocessing() {
  const { gl, viewport } = useThree()
  const { set } = useContext(AsciiContext)

  useEffect(() => {
    set({ canvas: gl.domElement })
  }, [gl])

  const {
    charactersTexture,
    granularity,
    charactersLimit,
    fillPixels,
    color,
    greyscale,
    invert,
    matrix,
    time,
    background,
    fit,
  } = useContext(AsciiContext)

  return (
    <EffectComposer>
      <ASCIIEffect
        charactersTexture={charactersTexture}
        granularity={granularity * viewport.dpr}
        charactersLimit={charactersLimit}
        fillPixels={fillPixels}
        color={color}
        fit={fit}
        greyscale={greyscale}
        invert={invert}
        matrix={matrix}
        time={time}
        background={background}
      />
    </EffectComposer>
  )
}

function Inner() {
  return (
    <>
      <div className={s.ascii}>
        <HandTrackingStatus />
        <div className={s.canvas}>
          <Canvas
            flat
            linear
            orthographic
            camera={{ position: [0, 0, 500], near: 0.1, far: 10000 }}
            resize={{ debounce: 100 }}
            gl={{
              antialias: false,
              alpha: true,
              depth: true,
              stencil: false,
              powerPreference: 'high-performance',
              // Mobile optimizations
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false,
            }}
            // Better performance on mobile
            frameloop="demand"
            dpr={[1, 2]} // Limit pixel ratio on mobile
          >
            <Scene />
            <Postprocessing />
          </Canvas>
        </div>
      </div>
      <FontEditor />
      <ui.Out />
    </>
  )
}

const DEFAULT = {
  characters: ' *,    ./O#DE',
  granularity: 4,
  charactersLimit: 25,
  fontSize: 87,
  fillPixels: false,
  setColor: true,
  color: '#E30613',
  background: '#6a3a3a',
  greyscale: false,
  invert: false,
  matrix: false,
  setTime: false,
  time: 0,
  fit: true,
  cameraActive: false,
  handTrackingEnabled: false,
  handControlledGranularity: false,
}

export function ASCII({ children }) {
  const [isClient, setIsClient] = useState(false)
  const initialUrlParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  )
  const sceneRef = useRef()

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const [charactersTexture, setCharactersTexture] = useState(null)
  const [canvas, setCanvas] = useState()
  const [cameraActive, setCameraActive] = useState(DEFAULT.cameraActive)
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(
    DEFAULT.handTrackingEnabled
  )
  const [handControlledGranularity, setHandControlledGranularity] = useState(
    DEFAULT.handControlledGranularity
  )
  const [handTracking, setHandTracking] = useState(null)

  const [
    {
      characters,
      granularity,
      charactersLimit,
      fontSize,
      fillPixels,
      setColor,
      color,
      fit,
      greyscale,
      invert,
      matrix,
      setTime,
      time,
      background,
    },
    _set,
  ] = useControls(
    () => ({
      characters: text(
        initialUrlParams.get('characters') || DEFAULT.characters
      ),
      granularity: {
        min: 4,
        max: 32,
        value: initialUrlParams.get('granularity') || DEFAULT.granularity,
        step: 1,
        label: 'granularity',
      },
      charactersLimit: {
        min: 1,
        max: 48,
        value:
          initialUrlParams.get('charactersLimit') || DEFAULT.charactersLimit,
        step: 1,
        label: 'charLimit',
      },
      fontSize: {
        min: 1,
        max: 128,
        value: initialUrlParams.get('fontSize') || DEFAULT.fontSize,
        step: 1,
        label: 'font size',
      },
      greyscale: {
        value:
          initialUrlParams.get('greyscale') === 'true' || DEFAULT.greyscale,
      },
      invert: {
        value: initialUrlParams.get('invert') === 'true' || DEFAULT.invert,
      },
      fillPixels: {
        value:
          initialUrlParams.get('fillPixels') === 'true' || DEFAULT.fillPixels,
        label: 'fill pixels',
      },
      fit: {
        value: initialUrlParams.get('fit') || DEFAULT.fit,
      },
      matrix: {
        value: initialUrlParams.get('matrix') === 'true' || DEFAULT.matrix,
      },
      setTime: {
        value: !!initialUrlParams.get('time') || DEFAULT.setTime,
        label: 'set time',
        render: (get) => get('matrix') === true,
      },
      time: {
        min: 0,
        value: Number.parseFloat(initialUrlParams.get('time')) || DEFAULT.time,
        max: 1,
        step: 0.01,
        render: (get) => get('setTime') === true,
      },
      setColor: {
        value: !!initialUrlParams.get('color') || DEFAULT.setColor,
        label: 'set color',
      },
      color: {
        value: initialUrlParams.get('color')
          ? `#${initialUrlParams.get('color')}`
          : DEFAULT.color,
        label: 'color',
        render: (get) => get('setColor') === true,
      },
      background: {
        value: initialUrlParams.get('background')
          ? `#${initialUrlParams.get('background')}`
          : DEFAULT.background,
        label: 'background',
      },
    }),
    []
  )

  useControls(
    'Camera & Hand Tracking',
    () => ({
      [cameraActive ? 'stop camera' : 'start camera']: button(
        () => {
          setCameraActive(!cameraActive)
        },
        { disabled: false }
      ),
      'hand tracking': {
        value: handTrackingEnabled,
        onChange: setHandTrackingEnabled,
        disabled: !cameraActive,
      },
      'hand controls granularity': {
        value: handControlledGranularity,
        onChange: setHandControlledGranularity,
        disabled: !handTrackingEnabled || !cameraActive,
      },
      ...(handTracking?.handDetected && {
        'calibrate hand depth': button(
          () => {
            if (handTracking?.calibrateDepth()) {
              console.log('Hand depth calibrated!')
            }
          },
          {
            disabled: !handTracking?.handDetected,
          }
        ),
        'reset calibration': button(
          () => {
            handTracking?.resetCalibration()
            console.log('Hand calibration reset')
          },
          {
            disabled: !handTracking?.isCalibrated,
          }
        ),
      }),
      screenshot: button(() => {
        if (canvas) {
          const a = document.createElement('a')
          a.download = 'ASCII'

          requestAnimationFrame(() => {
            a.href = canvas.toDataURL('image/png;base64')
            a.click()
          })
        }
      }),
    }),
    [
      canvas,
      cameraActive,
      handTrackingEnabled,
      handControlledGranularity,
      handTracking,
    ]
  )

  const UrlParams = (() => {
    if (typeof window === 'undefined') return new URLSearchParams()

    const params = new URLSearchParams()
    params.set('characters', characters)
    params.set('granularity', granularity)
    params.set('charactersLimit', charactersLimit)
    params.set('fontSize', fontSize)
    params.set('matrix', matrix === true)
    params.set('invert', invert === true)
    params.set('greyscale', greyscale === true)
    params.set('fillPixels', fillPixels === true)
    if (setTime) {
      params.set('time', time)
    } else {
      params.delete('time')
    }

    if (setColor) {
      params.set('color', color.replace('#', ''))
    } else {
      params.delete('color')
    }

    params.set('background', background.replace('#', ''))
    return params
  })()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.origin}?${UrlParams.toString()}`
      window.history.replaceState({}, null, url)
    }
  }, [UrlParams])

  function set({ charactersTexture, canvas, handTracking, ...props }) {
    if (charactersTexture) setCharactersTexture(charactersTexture)
    if (canvas) setCanvas(canvas)
    if (handTracking) setHandTracking(handTracking)
    _set(props)
  }

  // Only render on client side to avoid SSR issues
  if (!isClient) {
    return <div>Loading...</div>
  }

  return (
    <>
      {/* <p className={s.instruction}>
      Drag and drop any file (.glb, .mp4, .mov, .webm, .png, .jpg, .webp,
      .avif)
    </p> */}
      <AsciiContext.Provider
        value={{
          characters: characters.toUpperCase(),
          granularity,
          charactersTexture,
          charactersLimit,
          fontSize,
          fillPixels,
          color: setColor ? color : undefined,
          fit,
          greyscale,
          invert,
          matrix,
          time: setTime ? time : undefined,
          background,
          cameraActive,
          handTrackingEnabled,
          handControlledGranularity,
          handTracking,
          set,
        }}
      >
        <Inner />
      </AsciiContext.Provider>
    </>
  )
}
