import { useCallback, useEffect, useRef, useState } from 'react'

// MediaPipe face landmarks for web uses different import pattern
let FaceLandmarker = null
let FilesetResolver = null

const initializeMediaPipe = async () => {
  if (typeof window === 'undefined') return null

  try {
    // Dynamic import for MediaPipe faces
    const vision = await import('@mediapipe/tasks-vision')
    FaceLandmarker = vision.FaceLandmarker
    FilesetResolver = vision.FilesetResolver
    return { FaceLandmarker, FilesetResolver }
  } catch (error) {
    console.error('Failed to load MediaPipe:', error)
    return null
  }
}

export const useFaceTracking = ({
  videoElement,
  enabled = false,
  onDepthChange,
  granularityRange = { min: 1, max: 50 },
  currentGranularity = null,
}) => {
  const faceLandmarkerRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [calibrationDepth, setCalibrationDepth] = useState(null)
  const [calibrationGranularity, setCalibrationGranularity] = useState(null)
  const [currentDepth, setCurrentDepth] = useState(0)
  const [relativeDepth, setRelativeDepth] = useState(0)
  const [granularity, setGranularity] = useState(granularityRange.min)
  const [landmarks, setLandmarks] = useState([])
  const [depthMap, setDepthMap] = useState(null)
  const animationFrameRef = useRef()
  const frameCountRef = useRef(0) // Process every other frame
  const lastUpdateRef = useRef(0) // Throttle updates

  // Auto-calibration state
  const [autoCalibrationTimer, setAutoCalibrationTimer] = useState(null)
  const [stabilizationBuffer, setStabilizationBuffer] = useState([])
  const stabilizationTimeRef = useRef(0)
  const STABILIZATION_DURATION = 2000 // 2 seconds of stable detection
  const BUFFER_SIZE = 10 // Track last 10 depth readings

  // Calculate average face depth from nose and surrounding landmarks
  const calculateFaceDepth = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 468) return 0

    // Use nose tip and surrounding points for stable depth measurement
    const noseIndices = [1, 2, 5, 6, 19, 20] // Central nose landmarks
    const noseDepth = noseIndices.reduce(
      (sum, index) => sum + landmarks[index].z,
      0
    )
    return noseDepth / noseIndices.length
  }, [])

  // Generate depth map from face landmarks for shader use
  const generateDepthMap = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 468) return null

    // Create a much more detailed depth map using specific MediaPipe landmark regions
    // Reference: https://github.com/google/mediapipe/blob/master/docs/solutions/face_mesh.md

    const regions = {
      // Central nose area (tip and bridge)
      noseTip: [
        1, 2, 5, 6, 19, 20, 94, 125, 141, 235, 236, 237, 238, 239, 240, 241,
        242,
      ],

      // Forehead region (more detailed mapping)
      forehead: [
        9, 10, 151, 337, 299, 333, 298, 301, 284, 251, 389, 356, 454, 323, 361,
        340,
      ],

      // Left and right cheek regions
      leftCheek: [
        116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192,
        147,
      ],
      rightCheek: [
        345, 346, 347, 348, 349, 350, 355, 371, 266, 425, 426, 427, 436, 416,
        376,
      ],

      // Chin and jaw area
      chin: [
        18, 175, 199, 200, 398, 399, 172, 136, 150, 149, 176, 148, 152, 377,
        400, 378, 379, 365,
      ],

      // Eye regions for more detail
      leftEye: [
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161,
        246,
      ],
      rightEye: [
        362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385,
        384, 398,
      ],

      // Mouth area
      mouth: [
        61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318, 78, 191, 80,
        81, 82,
      ],

      // Temple regions
      leftTemple: [
        21, 54, 103, 67, 109, 10, 151, 9, 162, 127, 234, 93, 132, 58, 172, 136,
      ],
      rightTemple: [
        251, 284, 332, 297, 338, 299, 333, 298, 301, 368, 264, 356, 454, 323,
        361, 340,
      ],
    }

    const regionDepths = {}

    // Calculate average depth for each region
    for (const [region, indices] of Object.entries(regions)) {
      // Filter valid indices and calculate depth
      const validLandmarks = indices.filter((idx) => idx < landmarks.length)
      if (validLandmarks.length > 0) {
        const avgDepth =
          validLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
          validLandmarks.length
        regionDepths[region] = avgDepth
      } else {
        regionDepths[region] = 0.0
      }
    }

    // Also include the original 4 regions for backward compatibility
    regionDepths.nose = regionDepths.noseTip
    // forehead and chin already exist in regions, no need to reassign
    regionDepths.cheeks = (regionDepths.leftCheek + regionDepths.rightCheek) / 2

    return regionDepths
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
                'Face auto-calibrated at:',
                avgDepth,
                'with granularity:',
                granularityToUse
              )
            }
          }
        } else {
          // Reset timer if face movement detected
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

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    if (!enabled) return

    const setupFaceLandmarker = async () => {
      try {
        console.log('Initializing MediaPipe for face tracking...')

        const mp = await initializeMediaPipe()
        if (!mp) {
          console.error('Failed to initialize MediaPipe')
          return
        }

        const { FaceLandmarker, FilesetResolver } = mp

        console.log('Loading MediaPipe vision tasks...')
        // Initialize the task
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        )

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.6, // Restored for camera stability
          minFacePresenceConfidence: 0.4, // Restored for camera stability
          minTrackingConfidence: 0.4, // Restored for camera stability
          outputFaceBlendshapes: false, // We only need landmarks for depth
          outputFacialTransformationMatrixes: false,
        })

        faceLandmarkerRef.current = faceLandmarker
        setIsInitialized(true)
        console.log('FaceLandmarker initialized successfully')
      } catch (error) {
        console.error('Error setting up FaceLandmarker:', error)
      }
    }

    setupFaceLandmarker()

    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close()
        faceLandmarkerRef.current = null
        setIsInitialized(false)
      }
    }
  }, [enabled])

  // Process video frames
  useEffect(() => {
    if (!isInitialized || !videoElement || !faceLandmarkerRef.current) return

    const processFrame = async (timestamp) => {
      // Lighter frame rate limiting - process every 3rd frame for better stability
      frameCountRef.current++
      if (frameCountRef.current % 3 !== 0) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
        return
      }

      // More permissive throttling for camera stability
      if (timestamp - lastUpdateRef.current < 12) {
        // Max ~83fps
        animationFrameRef.current = requestAnimationFrame(processFrame)
        return
      }
      lastUpdateRef.current = timestamp

      if (videoElement.readyState >= 2) {
        // HAVE_CURRENT_DATA
        try {
          const results = await faceLandmarkerRef.current.detectForVideo(
            videoElement,
            Date.now()
          )

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const detectedLandmarks = results.faceLandmarks[0]
            setFaceDetected(true)
            setLandmarks(detectedLandmarks)

            // Calculate depth using face center depth
            const depth = calculateFaceDepth(detectedLandmarks)
            // Update depth with more responsive threshold for better tracking
            if (Math.abs(currentDepth - depth) > 0.003) {
              setCurrentDepth(depth)
            }

            // Trigger auto-calibration check
            handleAutoCalibration(depth)

            // Generate depth map for different face regions
            const faceDepthMap = generateDepthMap(detectedLandmarks)
            setDepthMap(faceDepthMap)

            // Calculate relative depth if calibrated
            if (
              isCalibrated &&
              calibrationDepth !== null &&
              calibrationGranularity !== null
            ) {
              // Similar logic to hand tracking but for face
              const relative = calibrationDepth - depth
              // Update relative depth with balanced threshold
              if (Math.abs(relativeDepth - relative) > 0.007) {
                setRelativeDepth(relative)
              }

              // Map depth to granularity (closer face = smaller characters = higher granularity)
              const maxDepthForMaxGranularity = 0.05 // +5% closer = max granularity
              const minDepthForMinGranularity = -0.03 // -3% further = min granularity

              let mappedGranularity

              if (relative >= maxDepthForMaxGranularity) {
                mappedGranularity = granularityRange.max
              } else if (relative <= minDepthForMinGranularity) {
                mappedGranularity = granularityRange.min
              } else {
                const totalDepthRange =
                  maxDepthForMaxGranularity - minDepthForMinGranularity
                const depthPosition =
                  (relative - minDepthForMinGranularity) / totalDepthRange
                const calibrationPosition =
                  (0 - minDepthForMinGranularity) / totalDepthRange

                if (depthPosition > calibrationPosition) {
                  const t =
                    (depthPosition - calibrationPosition) /
                    (1 - calibrationPosition)
                  mappedGranularity =
                    calibrationGranularity +
                    t * (granularityRange.max - calibrationGranularity)
                } else {
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

              const normalizedDepth = Math.max(-1, Math.min(1, relative / 0.04))

              if (onDepthChange) {
                onDepthChange({
                  relativeDepth: relative,
                  normalizedDepth,
                  granularity: newGranularity,
                  faceDetected: true,
                  landmarks: detectedLandmarks,
                  depthMap: faceDepthMap,
                })
              }
            }
          } else {
            setFaceDetected(false)
            setLandmarks([])
            setDepthMap(null)
            // Reset auto-calibration when face is lost
            setAutoCalibrationTimer(null)
            setStabilizationBuffer([])
            stabilizationTimeRef.current = 0
            if (onDepthChange) {
              onDepthChange({
                relativeDepth: 0,
                normalizedDepth: 0,
                granularity: granularityRange.min,
                faceDetected: false,
                landmarks: [],
                depthMap: null,
              })
            }
          }
        } catch (error) {
          console.warn('Face tracking frame processing error:', error)
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
    calculateFaceDepth,
    generateDepthMap,
    handleAutoCalibration,
    isCalibrated,
    calibrationDepth,
    calibrationGranularity,
    granularityRange,
    onDepthChange,
    currentDepth,
    granularity,
    relativeDepth,
  ])

  // Calibration function
  const calibrateDepth = useCallback(() => {
    if (faceDetected && currentDepth !== 0) {
      const granularityToUse = currentGranularity || granularity
      setCalibrationDepth(currentDepth)
      setCalibrationGranularity(granularityToUse)
      setIsCalibrated(true)
      console.log(
        'Face depth calibrated at:',
        currentDepth,
        'with granularity:',
        granularityToUse
      )
      return true
    }
    return false
  }, [faceDetected, currentDepth, currentGranularity, granularity])

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setIsCalibrated(false)
    setCalibrationDepth(null)
    setCalibrationGranularity(null)
    setRelativeDepth(0)
    setGranularity(granularityRange.min)
    setDepthMap(null)
    // Reset auto-calibration state
    setAutoCalibrationTimer(null)
    setStabilizationBuffer([])
    stabilizationTimeRef.current = 0
  }, [granularityRange.min])

  return {
    isInitialized,
    faceDetected,
    isCalibrated,
    currentDepth,
    relativeDepth,
    granularity,
    landmarks,
    depthMap,
    calibrateDepth,
    resetCalibration,
    calibrationDepth,
    calibrationGranularity,
  }
}
