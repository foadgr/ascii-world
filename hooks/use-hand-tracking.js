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
  granularityRange = { min: 1, max: 50 },
  currentGranularity = null, // Add current granularity prop
}) => {
  const handsRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [calibrationDepth, setCalibrationDepth] = useState(null)
  const [calibrationGranularity, setCalibrationGranularity] = useState(null) // Store calibration granularity
  const [currentDepth, setCurrentDepth] = useState(0)
  const [relativeDepth, setRelativeDepth] = useState(0)
  const [granularity, setGranularity] = useState(granularityRange.min)
  const [landmarks, setLandmarks] = useState([])
  const animationFrameRef = useRef()
  const frameCountRef = useRef(0) // Process every other frame
  const lastUpdateRef = useRef(0) // Throttle updates

  // Auto-calibration state
  const [autoCalibrationTimer, setAutoCalibrationTimer] = useState(null)
  const [stabilizationBuffer, setStabilizationBuffer] = useState([])
  const stabilizationTimeRef = useRef(0)
  const STABILIZATION_DURATION = 2000 // 2 seconds of stable detection
  const BUFFER_SIZE = 10 // Track last 10 depth readings

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

  // Auto-calibration logic
  const handleAutoCalibration = useCallback(
    (depth) => {
      if (isCalibrated) return // Already calibrated

      // Add current depth to stabilization buffer
      const newBuffer = [...stabilizationBuffer, depth].slice(-BUFFER_SIZE)
      setStabilizationBuffer(newBuffer)

      // Check if we have enough readings and they're stable
      if (newBuffer.length >= BUFFER_SIZE) {
        const avgDepth =
          newBuffer.reduce((sum, d) => sum + d, 0) / newBuffer.length
        const variance =
          newBuffer.reduce((sum, d) => sum + (d - avgDepth) ** 2, 0) /
          newBuffer.length
        const stabilityThreshold = 0.001 // Very stable readings required

        if (variance < stabilityThreshold) {
          // Start stabilization timer if not already started
          if (!autoCalibrationTimer) {
            const startTime = Date.now()
            stabilizationTimeRef.current = startTime
            setAutoCalibrationTimer(startTime)
          } else {
            // Check if enough time has passed
            const elapsed = Date.now() - stabilizationTimeRef.current
            if (elapsed >= STABILIZATION_DURATION) {
              // Auto-calibrate!
              const granularityToUse = currentGranularity || granularity
              setCalibrationDepth(avgDepth)
              setCalibrationGranularity(granularityToUse)
              setIsCalibrated(true)
              setAutoCalibrationTimer(null)
              console.log(
                'Hand auto-calibrated at:',
                avgDepth,
                'with granularity:',
                granularityToUse
              )
            }
          }
        } else {
          // Reset timer if hand movement detected
          setAutoCalibrationTimer(null)
          stabilizationTimeRef.current = 0
        }
      }
    },
    [
      isCalibrated,
      stabilizationBuffer,
      autoCalibrationTimer,
      currentGranularity,
      granularity,
    ]
  )

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!enabled) return

    const setupHandLandmarker = async () => {
      try {
        console.log('Initializing MediaPipe for hand tracking...')

        const mp = await initializeMediaPipe()
        if (!mp) {
          console.error('Failed to initialize MediaPipe')
          return
        }

        const { HandLandmarker, FilesetResolver } = mp

        console.log('Loading MediaPipe vision tasks...')
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
          minHandDetectionConfidence: 0.5, // Reduced from 0.7 for faster processing
          minHandPresenceConfidence: 0.3, // Reduced from 0.5 for faster processing
          minTrackingConfidence: 0.3, // Reduced from 0.5 for faster processing
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

    const processFrame = async (timestamp) => {
      // Frame rate limiting - process every other frame (30fps instead of 60fps)
      frameCountRef.current++
      if (frameCountRef.current % 2 !== 0) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
        return
      }

      // Throttle updates to prevent excessive processing
      if (timestamp - lastUpdateRef.current < 16) {
        // Max 60fps
        animationFrameRef.current = requestAnimationFrame(processFrame)
        return
      }
      lastUpdateRef.current = timestamp

      if (videoElement.readyState >= 2 && handsRef.current) {
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
            // Only update depth if it changed significantly to prevent excessive re-renders
            if (Math.abs(currentDepth - depth) > 0.005) {
              setCurrentDepth(depth)
            }

            // Trigger auto-calibration check
            handleAutoCalibration(depth)

            // Calculate relative depth if calibrated
            if (
              isCalibrated &&
              calibrationDepth !== null &&
              calibrationGranularity !== null
            ) {
              // Invert the calculation: calibration is the reference plane (0)
              // Hand further away (behind plane) = negative depth
              // Hand closer (in front of plane) = positive depth
              const relative = calibrationDepth - depth
              // Only update relative depth if it changed significantly
              if (Math.abs(relativeDepth - relative) > 0.01) {
                setRelativeDepth(relative)
              }

              // Map relative depth to granularity
              // At +8% depth (closer): granularity = MAXIMUM
              // At 0% depth (calibrated): granularity = calibrationGranularity (preserve user's choice)
              // At -5% depth (further): granularity = MINIMUM

              // Define the depth range that maps to full granularity range
              const maxDepthForMaxGranularity = 0.08 // +8% = max granularity (closer)
              const minDepthForMinGranularity = -0.05 // -5% = min granularity (further)

              // Calculate granularity based on depth position within this range
              let mappedGranularity

              if (relative >= maxDepthForMaxGranularity) {
                // Closer than +8% = maximum granularity
                mappedGranularity = granularityRange.max
              } else if (relative <= minDepthForMinGranularity) {
                // Further than -5% = minimum granularity
                mappedGranularity = granularityRange.min
              } else {
                // Calculate how much range we have above and below the calibration point
                const totalDepthRange =
                  maxDepthForMaxGranularity - minDepthForMinGranularity // 0.18 total range
                const depthPosition =
                  (relative - minDepthForMinGranularity) / totalDepthRange // 0 to 1
                const calibrationPosition =
                  (0 - minDepthForMinGranularity) / totalDepthRange // Where calibration sits in range (around 0.56)

                if (depthPosition > calibrationPosition) {
                  // Closer than calibration: interpolate from calibration granularity to max
                  const t =
                    (depthPosition - calibrationPosition) /
                    (1 - calibrationPosition)
                  mappedGranularity =
                    calibrationGranularity +
                    t * (granularityRange.max - calibrationGranularity)
                } else {
                  // Further than calibration: interpolate from min to calibration granularity
                  const t = depthPosition / calibrationPosition
                  mappedGranularity =
                    granularityRange.min +
                    t * (calibrationGranularity - granularityRange.min)
                }
              }

              const newGranularity = Math.round(
                Math.max(
                  granularityRange.min,
                  Math.min(granularityRange.max, mappedGranularity)
                )
              )
              // Only update granularity if it changed to prevent excessive re-renders
              if (granularity !== newGranularity) {
                setGranularity(newGranularity)
              }

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
            // Reset auto-calibration when hand is lost
            setAutoCalibrationTimer(null)
            setStabilizationBuffer([])
            stabilizationTimeRef.current = 0
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
      if (handsRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
      }
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
    handleAutoCalibration,
    isCalibrated,
    calibrationDepth,
    granularityRange,
    onDepthChange,
    calibrationGranularity,
  ])

  // Calibration function
  const calibrateDepth = useCallback(() => {
    if (handDetected && currentDepth !== 0) {
      const granularityToUse = currentGranularity || granularity
      setCalibrationDepth(currentDepth)
      setCalibrationGranularity(granularityToUse)
      setIsCalibrated(true)
      console.log(
        'Hand depth calibrated at:',
        currentDepth,
        'with granularity:',
        granularityToUse
      )
      return true
    }
    return false
  }, [handDetected, currentDepth, currentGranularity, granularity])

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setIsCalibrated(false)
    setCalibrationDepth(null)
    setCalibrationGranularity(null)
    setRelativeDepth(0)
    setGranularity(granularityRange.min)
    // Reset auto-calibration state
    setAutoCalibrationTimer(null)
    setStabilizationBuffer([])
    stabilizationTimeRef.current = 0
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
    calibrationGranularity,
  }
}
