import { useCallback, useEffect, useRef, useState } from 'react'

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
]

// MediaPipe hands for web uses different import pattern
let HandLandmarker = null
let FilesetResolver = null

const initializeMediaPipe = async () => {
  if (typeof window === 'undefined') return null

  try {
    // Dynamic import for MediaPipe hands
    const vision = await import('@mediapipe/tasks-vision')
    HandLandmarker = vision.HandLandmarker
    FilesetResolver = vision.FilesetResolver
    return { HandLandmarker, FilesetResolver }
  } catch (error) {
    console.error('Failed to load MediaPipe:', error)
    return null
  }
}

export const useHandTracking = ({
  videoElement,
  enabled = false,
  onDepthChange,
  granularityRange = { min: 4, max: 32 },
}) => {
  const handsRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [calibrationDepth, setCalibrationDepth] = useState(null)
  const [currentDepth, setCurrentDepth] = useState(0)
  const [relativeDepth, setRelativeDepth] = useState(0)
  const [granularity, setGranularity] = useState(granularityRange.min)
  const [landmarks, setLandmarks] = useState([])
  const animationFrameRef = useRef()

  // Calculate hand span (thumb tip to pinky tip distance)
  const calculateHandSpan = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 21) return 0

    const thumbTip = landmarks[4] // Thumb tip
    const pinkyTip = landmarks[20] // Pinky tip

    const dx = thumbTip.x - pinkyTip.x
    const dy = thumbTip.y - pinkyTip.y
    const dz = thumbTip.z - pinkyTip.z

    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }, [])

  // Calculate palm center depth (average z of palm landmarks)
  const calculatePalmDepth = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 21) return 0

    // Use palm landmarks: wrist (0), base of fingers (1, 5, 9, 13, 17)
    const palmIndices = [0, 1, 5, 9, 13, 17]
    const palmDepth = palmIndices.reduce(
      (sum, index) => sum + landmarks[index].z,
      0
    )
    return palmDepth / palmIndices.length
  }, [])

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!enabled) return

    const setupHandLandmarker = async () => {
      try {
        const mp = await initializeMediaPipe()
        if (!mp) {
          console.error('Failed to initialize MediaPipe')
          return
        }

        const { HandLandmarker, FilesetResolver } = mp

        // Initialize the task
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        )

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        handsRef.current = handLandmarker
        setIsInitialized(true)
        console.log('HandLandmarker initialized successfully')
      } catch (error) {
        console.error('Error setting up HandLandmarker:', error)
      }
    }

    setupHandLandmarker()

    return () => {
      if (handsRef.current) {
        handsRef.current.close()
        handsRef.current = null
        setIsInitialized(false)
      }
    }
  }, [enabled])

  // Process video frames
  useEffect(() => {
    if (!isInitialized || !videoElement || !handsRef.current) return

    const processFrame = async () => {
      if (videoElement.readyState >= 2) {
        // HAVE_CURRENT_DATA
        try {
          const results = await handsRef.current.detectForVideo(
            videoElement,
            Date.now()
          )

          if (results.landmarks && results.landmarks.length > 0) {
            const detectedLandmarks = results.landmarks[0]
            setHandDetected(true)
            setLandmarks(detectedLandmarks)

            // Calculate depth using palm center depth (more stable than hand span)
            const depth = calculatePalmDepth(detectedLandmarks)
            setCurrentDepth(depth)

            // Calculate relative depth if calibrated
            if (isCalibrated && calibrationDepth !== null) {
              const relative = depth - calibrationDepth
              setRelativeDepth(relative)

              // Map relative depth to granularity with high sensitivity (INVERTED)
              // At -3% depth (closer): granularity = MAXIMUM (32) - more detail when closer
              // At 0% depth (calibrated): granularity = 50% (18)
              // At +10% depth (further): granularity = MINIMUM (4) - less detail when further

              // Define the depth range that maps to full granularity range
              const minDepthForMaxGranularity = -0.08 // -3% = max granularity
              const maxDepthForMinGranularity = 0.1 // +10% = min granularity

              // Calculate granularity based on depth position within this range
              let mappedGranularity

              if (relative <= minDepthForMaxGranularity) {
                // Closer than -3% = maximum granularity
                mappedGranularity = granularityRange.max
              } else if (relative >= maxDepthForMinGranularity) {
                // Further than +10% = minimum granularity
                mappedGranularity = granularityRange.min
              } else {
                // Linear interpolation between the range (INVERTED)
                const depthRange =
                  maxDepthForMinGranularity - minDepthForMaxGranularity // 0.13 total range
                const depthPosition =
                  (relative - minDepthForMaxGranularity) / depthRange // 0 to 1

                // Map depth position to granularity range (INVERTED: 0 = max, 1 = min)
                mappedGranularity =
                  granularityRange.max -
                  depthPosition * (granularityRange.max - granularityRange.min)
              }

              const newGranularity = Math.round(
                Math.max(
                  granularityRange.min,
                  Math.min(granularityRange.max, mappedGranularity)
                )
              )
              setGranularity(newGranularity)

              // Calculate normalized depth for display (-1 to +1 for the status bar)
              const normalizedDepth = Math.max(
                -1,
                Math.min(1, relative / 0.065)
              ) // Use middle of range for normalization

              if (onDepthChange) {
                onDepthChange({
                  relativeDepth: relative,
                  normalizedDepth,
                  granularity: newGranularity,
                  handDetected: true,
                  landmarks: detectedLandmarks,
                })
              }
            }
          } else {
            setHandDetected(false)
            setLandmarks([])
            if (onDepthChange) {
              onDepthChange({
                relativeDepth: 0,
                normalizedDepth: 0,
                granularity: granularityRange.min,
                handDetected: false,
                landmarks: [],
              })
            }
          }
        } catch (error) {
          console.warn('Hand tracking frame processing error:', error)
        }
      }
      animationFrameRef.current = requestAnimationFrame(processFrame)
    }

    processFrame()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [
    isInitialized,
    videoElement,
    calculatePalmDepth,
    isCalibrated,
    calibrationDepth,
    granularityRange,
    onDepthChange,
  ])

  // Calibration function
  const calibrateDepth = useCallback(() => {
    if (handDetected && currentDepth !== 0) {
      setCalibrationDepth(currentDepth)
      setIsCalibrated(true)
      console.log('Hand depth calibrated at:', currentDepth)
      return true
    }
    return false
  }, [handDetected, currentDepth])

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setIsCalibrated(false)
    setCalibrationDepth(null)
    setRelativeDepth(0)
    setGranularity(granularityRange.min)
  }, [granularityRange.min])

  return {
    isInitialized,
    handDetected,
    isCalibrated,
    currentDepth,
    relativeDepth,
    granularity,
    landmarks,
    calibrateDepth,
    resetCalibration,
    calibrationDepth,
  }
}
