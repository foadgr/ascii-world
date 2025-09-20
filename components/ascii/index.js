import { OrbitControls, useAspect } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { DepthDisplay } from 'components/depth-display'
import { FontEditor } from 'components/font-editor'
import { ShaderCreator } from 'components/shader-creator/index'
import { FlexibleShaderEffect } from 'components/shader-effect/FlexibleShaderEffect'
import { ShaderSelector } from 'components/shader-selector/index'
import { useAudioTracking } from 'hooks/use-audio-tracking'
import { useFaceTracking } from 'hooks/use-face-tracking'
import { useHandTracking } from 'hooks/use-hand-tracking'
import { supportsCameraSwitch } from 'lib/device'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
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
import { CameraControls } from '../camera-controls'
import { ColorControls } from '../color-controls'
import { ControlPanel } from '../control-panel'
import { InfoButton } from '../info-button'
import { IntroModal } from '../intro-modal'
import { ModelSelector } from '../model-selector'
import { TrackingOverlay } from '../tracking-overlay'
import { UploadButton } from '../upload-button'
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
  const [asset, setAsset] = useState('/cutest-penguin-astronaut.glb')
  const [mixer, setMixer] = useState()
  const [model, setModel] = useState()
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraVideo, setCameraVideo] = useState(null)
  const [skiaReady, setSkiaReady] = useState(false)
  const {
    cameraActive,
    cameraFacingMode,
    handTrackingEnabled,
    handControlledGranularity,
    faceTrackingEnabled,
    faceControlledGranularity,
    audioTrackingEnabled,
    audioControlledGranularity,
    audioSensitivity,
    audioAdjustmentVector,
    granularity,
    set,
  } = useContext(AsciiContext)

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
    granularityRange: { min: 1, max: 50 },
    currentGranularity: granularity, // Pass current granularity for calibration
    onDepthChange: (data) => {
      if (handControlledGranularity && data.handDetected) {
        set({ granularity: data.granularity })
      }
    },
  })

  // Face tracking integration
  const faceTrackingHook = useFaceTracking({
    videoElement: cameraVideo,
    enabled: faceTrackingEnabled && cameraActive,
    granularityRange: { min: 1, max: 50 },
    currentGranularity: granularity,
    onDepthChange: (data) => {
      if (faceControlledGranularity && data.faceDetected) {
        set({ granularity: data.granularity })
      }
    },
  })

  // Audio tracking integration
  const audioTrackingHook = useAudioTracking({
    enabled: audioTrackingEnabled,
    sensitivity: audioSensitivity,
    adjustmentVector: audioAdjustmentVector,
    onAudioChange: (data) => {
      if (audioControlledGranularity) {
        // Use enhanced level that includes spike detection for more elastic response
        const level = data.currentLevel // This is the enhanced level with spikes

        let mappedGranularity

        if (level <= 0.005) {
          // Background/quiet sounds: stay at minimum granularity
          mappedGranularity = 1
        } else if (level >= 0.5) {
          // High threshold for maximum granularity
          mappedGranularity = 50
        } else {
          // Very conservative mapping - whispers should only reach low granularity
          const normalizedLevel = (level - 0.005) / (0.5 - 0.005)
          let curve = normalizedLevel ** 4.0 // Very steep curve - need loud sounds for high granularity

          // More conservative spike boost
          if (data.isSpike) {
            curve = Math.min(1, curve * 1.5) // Reduced spike boost
          }

          // Minimal content type boost
          if (data.contentType === 'voice') {
            curve = Math.min(1, curve * 1.05) // Very slight voice boost
          } else if (data.contentType === 'music') {
            curve = Math.min(1, curve * 1.1) // Slight music boost
          }

          mappedGranularity = Math.round(1 + curve * 49) // 1-50 range
        }

        set({ granularity: mappedGranularity })
      }
    },
  })

  useFrame((state, delta) => {
    mixer?.update(delta)
  })

  // Camera stream management
  const startCamera = useCallback(
    async (facingMode = cameraFacingMode) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: facingMode,
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
        // If the preferred camera fails, try the other one
        if (facingMode !== 'user') {
          console.log('Falling back to front camera')
          startCamera('user')
        }
      }
    },
    [cameraFacingMode]
  )

  const cameraStreamRef = useRef(cameraStream)
  const cameraVideoRef = useRef(cameraVideo)

  // Update refs when state changes
  useEffect(() => {
    cameraStreamRef.current = cameraStream
  }, [cameraStream])

  useEffect(() => {
    cameraVideoRef.current = cameraVideo
  }, [cameraVideo])

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) {
        track.stop()
      }
      setCameraStream(null)
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
      setCameraVideo(null)
    }
    setTexture(null)
  }, [])

  // React to camera active state changes
  useEffect(() => {
    if (cameraActive) {
      startCamera()
    } else {
      stopCamera()
      // Restore default penguin model when camera is turned off
      setTimeout(() => {
        console.log('Camera turned off, restoring penguin model')
        // Clear asset first, then set it to force a reload
        setAsset(null)
        setTimeout(() => {
          setAsset('/cutest-penguin-astronaut.glb')
        }, 50)
      }, 100) // Small delay to ensure camera cleanup is complete
    }
  }, [cameraActive, startCamera, stopCamera])

  // React to camera facing mode changes
  useEffect(() => {
    if (cameraActive && cameraFacingMode) {
      stopCamera()
      // Small delay to ensure camera is properly stopped
      setTimeout(() => {
        startCamera(cameraFacingMode)
      }, 100)
    }
  }, [cameraActive, cameraFacingMode, startCamera, stopCamera])

  // Share hand tracking state with context
  useEffect(() => {
    set({
      handTracking: {
        ...handTracking,
        isEnabled: handTrackingEnabled,
      },
    })
  }, [handTracking, handTrackingEnabled, set])

  // Share face tracking state with context
  useEffect(() => {
    set({
      faceTracking: {
        ...faceTrackingHook,
        isEnabled: faceTrackingEnabled,
      },
    })
  }, [faceTrackingHook, faceTrackingEnabled, set])

  // Share audio tracking state with context
  useEffect(() => {
    set({
      audioTracking: {
        ...audioTrackingHook,
        isEnabled: audioTrackingEnabled,
      },
    })
  }, [audioTrackingHook, audioTrackingEnabled, set])

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
  }, [asset, stopCamera])

  const [texture, setTexture] = useState()

  useEffect(() => {
    if (model) setTexture(null)
  }, [model])

  useEffect(() => {
    if (texture && !cameraVideo) setModel(null)
  }, [texture, cameraVideo])

  useEffect(() => {
    if (!asset) return
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

      // Ensure video plays on desktop by handling play promise
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Video autoplay failed, trying manual play:', error)
          // Create a user interaction to enable autoplay
          const enableAutoplay = () => {
            video.play()
            document.removeEventListener('click', enableAutoplay)
            document.removeEventListener('touchstart', enableAutoplay)
          }
          document.addEventListener('click', enableAutoplay)
          document.addEventListener('touchstart', enableAutoplay)
        })
      }
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
  }, [asset, stopCamera])

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

  // Handle file uploads
  const handleFileUpload = useCallback((fileData, filename) => {
    const isFont =
      filename.endsWith('.ttf') ||
      filename.endsWith('.otf') ||
      filename.endsWith('.woff') ||
      filename.endsWith('.woff2')

    if (isFont) {
      const fontName = 'CustomFont'
      const fontFace = `
        @font-face {
          font-family: '${fontName}';
          src: url(${fileData});
        }
      `
      const styleElement = document.createElement('style')
      styleElement.innerHTML = fontFace
      document.head.appendChild(styleElement)
    } else {
      setAsset(fileData)
    }
  }, [])

  // Register upload function and asset setter with context on mount
  useEffect(() => {
    set({
      uploadFunction: handleFileUpload,
      setAssetFunction: setAsset,
      currentAsset: asset,
    })
  }, [set, handleFileUpload, asset])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

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
            <group scale={1000}>
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
  }, [gl, set])

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
    trackingMode,
    faceTracking,
    handTracking,
    audioTracking,
    currentShader = 'ascii',
    shaderConfig = {},
  } = useContext(AsciiContext)

  // Create shader configuration for ASCII effect
  const asciiConfig = {
    charactersTexture,
    charactersLimit,
    fillPixels,
    greyscale,
    invert,
    matrix,
    ...shaderConfig,
  }

  return (
    <EffectComposer>
      <FlexibleShaderEffect
        shaderId={currentShader}
        shaderConfig={asciiConfig}
        granularity={granularity * viewport.dpr}
        color={color}
        background={background}
        time={time}
        trackingMode={trackingMode}
        faceTracking={faceTracking}
        handTracking={handTracking}
        audioTracking={audioTracking}
        granularityRange={{ min: 1, max: 50 }}
      />
    </EffectComposer>
  )
}

function Inner() {
  const {
    uploadFunctionRef,
    currentAsset,
    setAssetFunction,
    currentShader,
    setCurrentShader,
    shaderConfig,
    setShaderConfig,
  } = useContext(AsciiContext)

  const [isShaderCreatorOpen, setIsShaderCreatorOpen] = useState(false)

  const handleShaderChange = (shaderId) => {
    setCurrentShader(shaderId)
  }

  const handleCreateShader = () => {
    setIsShaderCreatorOpen(true)
  }

  const handleShaderCreated = (shaderId) => {
    setCurrentShader(shaderId)
  }

  return (
    <>
      <div className={s.ascii}>
        <DepthDisplay />
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
          <TrackingOverlay />
        </div>
      </div>
      <FontEditor />
      <ModelSelector
        currentModel={currentAsset}
        onModelChange={(modelPath) => {
          if (setAssetFunction?.current) {
            setAssetFunction.current(modelPath)
          }
        }}
      />
      <div className={s.shaderSelectorContainer}>
        <ShaderSelector
          currentShader={currentShader}
          onShaderChange={handleShaderChange}
          onCreateShader={handleCreateShader}
        />
      </div>
      <ShaderCreator
        isOpen={isShaderCreatorOpen}
        onClose={() => setIsShaderCreatorOpen(false)}
        onShaderCreated={handleShaderCreated}
      />
      <UploadButton
        onFileSelect={(fileData, filename) => {
          if (uploadFunctionRef?.current) {
            uploadFunctionRef.current(fileData, filename)
          }
        }}
      />
      <ui.Out />
    </>
  )
}

const DEFAULT = {
  characters: ' *,    ./O#DE',
  granularity: 1,
  charactersLimit: 16,
  fontSize: 100,
  fillPixels: false,
  setColor: false,
  color: '#E30613',
  background: '#000000',
  greyscale: false,
  invert: false,
  matrix: false,
  setTime: false,
  time: 0,
  fit: true,
  cameraActive: false,
  handTrackingEnabled: false,
  handControlledGranularity: false,
  faceTrackingEnabled: false,
  faceControlledGranularity: false,
  audioTrackingEnabled: false,
  audioControlledGranularity: false,
  trackingMode: 'hand', // 'hand', 'face', or 'audio'
  cameraFacingMode: 'user', // Add default facing mode
}

export function ASCII({ children }) {
  const [isClient, setIsClient] = useState(false)
  const sceneRef = useRef()

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const [charactersTexture, setCharactersTexture] = useState(null)
  const [canvas, setCanvas] = useState()
  const [cameraActive, setCameraActive] = useState(DEFAULT.cameraActive)
  const [cameraFacingMode, setCameraFacingMode] = useState(
    DEFAULT.cameraFacingMode
  )
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(
    DEFAULT.handTrackingEnabled
  )
  const [handControlledGranularity, setHandControlledGranularity] = useState(
    DEFAULT.handControlledGranularity
  )
  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(
    DEFAULT.faceTrackingEnabled
  )
  const [faceControlledGranularity, setFaceControlledGranularity] = useState(
    DEFAULT.faceControlledGranularity
  )
  const [audioTrackingEnabled, setAudioTrackingEnabled] = useState(
    DEFAULT.audioTrackingEnabled
  )
  const [audioControlledGranularity, setAudioControlledGranularity] = useState(
    DEFAULT.audioControlledGranularity
  )
  const [audioSensitivity, setAudioSensitivity] = useState(1.0) // Default sensitivity
  const [audioAdjustmentVector, setAudioAdjustmentVector] = useState({
    voice: 1.0, // Emphasize voice frequencies
    music: 1.0, // Emphasize music frequencies
    noise: 0.3, // Reduce noise frequencies
  })
  const [trackingMode, setTrackingMode] = useState(DEFAULT.trackingMode)
  const [handTracking, setHandTracking] = useState(null)
  const [faceTracking, setFaceTracking] = useState(null)
  const [audioTracking, setAudioTracking] = useState(null)

  // Shader system state
  const [currentShader, setCurrentShader] = useState('ascii')
  const [shaderConfig, setShaderConfig] = useState({})

  // Control states
  const [characters, setCharacters] = useState(DEFAULT.characters)
  const [granularity, setGranularity] = useState(DEFAULT.granularity)
  const [charactersLimit, setCharactersLimit] = useState(
    DEFAULT.charactersLimit
  )
  const [fontSize, setFontSize] = useState(DEFAULT.fontSize)
  const [fillPixels, setFillPixels] = useState(DEFAULT.fillPixels)
  const [enableColor, setEnableColor] = useState(DEFAULT.setColor)
  const [color, setColor] = useState(DEFAULT.color)
  const [fit, setFit] = useState(DEFAULT.fit)
  const [greyscale, setGreyscale] = useState(DEFAULT.greyscale)
  const [invert, setInvert] = useState(DEFAULT.invert)
  const [matrix, setMatrix] = useState(DEFAULT.matrix)
  const [enableTime, setEnableTime] = useState(DEFAULT.setTime)
  const [time, setTime] = useState(DEFAULT.time)
  const [background, setBackground] = useState(DEFAULT.background)
  const [controlPanelOpen, setControlPanelOpen] = useState(false)

  // Handler functions for control panel
  const handleCameraToggle = () => {
    setCameraActive(!cameraActive)
  }

  const handleCameraSwitch = () => {
    if (!supportsCameraSwitch()) return

    const newFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user'
    setCameraFacingMode(newFacingMode)
  }

  const handleCalibrateHandDepth = () => {
    if (handTracking?.calibrateDepth()) {
      console.log('Hand depth calibrated!')
    }
  }

  const handleCalibrateFaceDepth = () => {
    if (faceTracking?.calibrateDepth()) {
      console.log('Face depth calibrated!')
    }
  }

  const handleCalibrateAudio = () => {
    if (audioTracking?.calibrateAudio()) {
      console.log('Audio level calibrated!')
    }
  }

  const handleResetCalibration = () => {
    if (trackingMode === 'hand') {
      handTracking?.resetCalibration()
      console.log('Hand calibration reset')
    } else if (trackingMode === 'face') {
      faceTracking?.resetCalibration()
      console.log('Face calibration reset')
    } else if (trackingMode === 'audio') {
      audioTracking?.resetCalibration()
      console.log('Audio calibration reset')
    }
  }

  const handleTrackingModeChange = (mode) => {
    setTrackingMode(mode)
    // Reset any existing calibrations when switching modes
    handTracking?.resetCalibration()
    faceTracking?.resetCalibration()
    audioTracking?.resetCalibration()
  }

  // Create refs to hold functions from Scene component
  const uploadFunctionRef = useRef()
  const setAssetFunctionRef = useRef()
  const [currentAsset, setCurrentAsset] = useState(
    '/cutest-penguin-astronaut.glb'
  )

  function set({
    charactersTexture,
    canvas,
    handTracking,
    faceTracking,
    audioTracking,
    granularity: newGranularity,
    uploadFunction,
    setAssetFunction,
    currentAsset: newAsset,
    ...props
  }) {
    if (charactersTexture) setCharactersTexture(charactersTexture)
    if (canvas) setCanvas(canvas)
    if (handTracking) setHandTracking(handTracking)
    if (faceTracking) setFaceTracking(faceTracking)
    if (audioTracking) setAudioTracking(audioTracking)
    if (newGranularity !== undefined) setGranularity(newGranularity)
    if (uploadFunction) uploadFunctionRef.current = uploadFunction
    if (setAssetFunction) setAssetFunctionRef.current = setAssetFunction
    if (newAsset !== undefined) setCurrentAsset(newAsset)
    // Handle other props if needed
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
          color: enableColor ? color : undefined,
          fit,
          greyscale,
          invert,
          matrix,
          time: enableTime ? time : undefined,
          background,
          cameraActive,
          cameraFacingMode,
          handTrackingEnabled,
          handControlledGranularity,
          faceTrackingEnabled,
          faceControlledGranularity,
          audioTrackingEnabled,
          audioControlledGranularity,
          audioSensitivity,
          audioAdjustmentVector,
          trackingMode,
          handTracking,
          faceTracking,
          audioTracking,
          uploadFunctionRef,
          setAssetFunction: setAssetFunctionRef,
          currentAsset,
          currentShader,
          setCurrentShader,
          shaderConfig,
          setShaderConfig,
          set,
        }}
      >
        <Inner />
        <ControlPanel
          // Visual controls
          characters={characters}
          granularity={granularity}
          charactersLimit={charactersLimit}
          fontSize={fontSize}
          fillPixels={fillPixels}
          fit={fit}
          greyscale={greyscale}
          invert={invert}
          matrix={matrix}
          setTime={enableTime}
          time={time}
          // Audio tracking
          trackingMode={trackingMode}
          audioSensitivity={audioSensitivity}
          audioAdjustmentVector={audioAdjustmentVector}
          // Handlers
          onCharactersChange={setCharacters}
          onGranularityChange={setGranularity}
          onCharactersLimitChange={setCharactersLimit}
          onFontSizeChange={setFontSize}
          onFillPixelsChange={setFillPixels}
          onFitChange={setFit}
          onGreyscaleChange={setGreyscale}
          onInvertChange={setInvert}
          onMatrixChange={setMatrix}
          onSetTimeChange={setEnableTime}
          onTimeChange={setTime}
          onAudioSensitivityChange={setAudioSensitivity}
          onAudioAdjustmentVectorChange={setAudioAdjustmentVector}
          onOpenChange={setControlPanelOpen}
        />
        <ColorControls
          setColor={enableColor}
          color={color}
          background={background}
          onSetColorChange={setEnableColor}
          onColorChange={setColor}
          onBackgroundChange={setBackground}
          hidden={controlPanelOpen}
        />
        <CameraControls
          // Camera & Tracking
          cameraActive={cameraActive}
          handTracking={handTracking}
          faceTracking={faceTracking}
          audioTracking={audioTracking}
          trackingMode={trackingMode}
          cameraFacingMode={cameraFacingMode}
          supportsCameraSwitch={supportsCameraSwitch()}
          // Camera Handlers
          onCameraToggle={handleCameraToggle}
          onCameraSwitch={handleCameraSwitch}
          onHandTrackingChange={setHandTrackingEnabled}
          onFaceTrackingChange={setFaceTrackingEnabled}
          onAudioTrackingChange={setAudioTrackingEnabled}
          onTrackingModeChange={handleTrackingModeChange}
          onHandControlledGranularityChange={setHandControlledGranularity}
          onFaceControlledGranularityChange={setFaceControlledGranularity}
          onAudioControlledGranularityChange={setAudioControlledGranularity}
          onCalibrateHandDepth={handleCalibrateHandDepth}
          onCalibrateFaceDepth={handleCalibrateFaceDepth}
          onCalibrateAudio={handleCalibrateAudio}
          onResetCalibration={handleResetCalibration}
        />
        <InfoButton />
        <IntroModal />
      </AsciiContext.Provider>
    </>
  )
}
