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

    // Create a simplified depth map based on facial regions
    const regions = {
      nose: [1, 2, 5, 6, 19, 20], // Nose tip area
      forehead: [9, 10, 151, 337, 299, 333], // Forehead area
      cheeks: [116, 117, 118, 119, 120, 345, 346, 347, 348, 349], // Cheek areas
      chin: [18, 175, 199, 200, 398, 399], // Chin area
    }

    const regionDepths = {}
    for (const [region, indices] of Object.entries(regions)) {
      const avgDepth =
        indices.reduce((sum, idx) => sum + landmarks[idx].z, 0) / indices.length
      regionDepths[region] = avgDepth
    }

    return regionDepths
  }, [])

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    if (!enabled) return

    const setupFaceLandmarker = async () => {
      try {
        const mp = await initializeMediaPipe()
        if (!mp) {
          console.error('Failed to initialize MediaPipe')
          return
        }

        const { FaceLandmarker, FilesetResolver } = mp

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
          minFaceDetectionConfidence: 0.7,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
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

    const processFrame = async () => {
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
            setCurrentDepth(depth)

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
              setRelativeDepth(relative)

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
              setGranularity(newGranularity)

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
    isCalibrated,
    calibrationDepth,
    calibrationGranularity,
    granularityRange,
    onDepthChange,
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
