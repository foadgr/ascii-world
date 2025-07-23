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
  faceFilterMode = false, // New mode for direct landmark-to-pixel mapping
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
  const [landmarkTexture, setLandmarkTexture] = useState(null) // For face filter mode
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

  // Generate a detailed landmark texture for face filter mode using all 468 landmarks
  const generateLandmarkTexture = useCallback((landmarks) => {
    if (!landmarks || landmarks.length < 468) return null

    // Create a 64x64 depth texture (can be adjusted for quality vs performance)
    const textureSize = 64
    const depthData = new Float32Array(textureSize * textureSize)
    
    // Initialize with a base depth (far away)
    depthData.fill(1.0)
    
    // Create a depth map by interpolating landmark depths across UV space
    for (let y = 0; y < textureSize; y++) {
      for (let x = 0; x < textureSize; x++) {
        const u = x / (textureSize - 1)
        const v = y / (textureSize - 1)
        
        // Find the closest landmarks to this UV coordinate
        let closestDepth = 1.0
        let totalWeight = 0
        let weightedDepth = 0
        
        // Sample key landmarks for depth calculation
        const keyLandmarks = [
          // Nose tip and bridge (closest to camera)
          { index: 1, weight: 2.0 },   // nose tip
          { index: 2, weight: 1.5 },   // nose bridge
          { index: 19, weight: 1.5 },  // nose bridge
          { index: 94, weight: 1.0 },  // nose side
          { index: 125, weight: 1.0 }, // nose side
          
          // Eyes (medium depth)
          { index: 33, weight: 1.0 },  // left eye inner
          { index: 133, weight: 1.0 }, // left eye outer
          { index: 362, weight: 1.0 }, // right eye inner
          { index: 263, weight: 1.0 }, // right eye outer
          
          // Cheeks (medium depth)
          { index: 117, weight: 0.8 }, // left cheek
          { index: 346, weight: 0.8 }, // right cheek
          
          // Forehead (further back)
          { index: 10, weight: 0.6 },  // forehead center
          { index: 151, weight: 0.6 }, // forehead
          
          // Chin (medium depth)
          { index: 175, weight: 0.7 }, // chin
          { index: 199, weight: 0.7 }, // chin
        ]
        
        keyLandmarks.forEach(({ index, weight }) => {
          if (landmarks[index]) {
            const landmark = landmarks[index]
            // Convert landmark x,y to UV space (landmarks are in normalized 0-1 range)
            const landmarkU = landmark.x
            const landmarkV = 1.0 - landmark.y // Flip Y coordinate
            
            // Calculate distance from current UV to landmark UV
            const distance = Math.sqrt(
              Math.pow(u - landmarkU, 2) + Math.pow(v - landmarkV, 2)
            )
            
            // Use inverse distance weighting with falloff
            const falloff = Math.exp(-distance * 8.0) // Exponential falloff
            const landmarkWeight = weight * falloff
            
            if (landmarkWeight > 0.01) {
              // Use the Z coordinate (depth) of the landmark
              // Closer landmarks have smaller Z values, further have larger Z values
              const landmarkDepth = landmark.z
              
              weightedDepth += landmarkDepth * landmarkWeight
              totalWeight += landmarkWeight
            }
          }
        })
        
        if (totalWeight > 0) {
          closestDepth = weightedDepth / totalWeight
          // Normalize depth: closer landmarks (smaller z) should give smaller granularity
          // Further landmarks (larger z) should give larger granularity
          closestDepth = Math.max(0.0, Math.min(1.0, closestDepth))
        }
        
        depthData[y * textureSize + x] = closestDepth
      }
    }
    
    return {
      landmarks,
      depthTexture: depthData,
      textureSize,
      landmarkCount: landmarks.length,
    }
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

            // Generate detailed landmark texture for face filter mode (always when enabled)
            let landmarkTextureData = null
            if (faceFilterMode) {
              landmarkTextureData = generateLandmarkTexture(detectedLandmarks)
              setLandmarkTexture(landmarkTextureData)
              console.log('Generated landmark texture with', landmarkTextureData?.landmarks?.length, 'landmarks')
            }

            // Calculate relative depth if calibrated (only for traditional face tracking)
            if (
              isCalibrated &&
              calibrationDepth !== null &&
              calibrationGranularity !== null &&
              !faceFilterMode // Don't use calibration logic in face filter mode
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
                  landmarkTexture: landmarkTextureData, // Add landmark texture for face filter mode
                  faceFilterMode,
                })
              }
            } else {
              // Handle non-calibrated face detection (including face filter mode)
              if (onDepthChange) {
                onDepthChange({
                  relativeDepth: 0,
                  normalizedDepth: 0,
                  granularity: granularityRange.min,
                  faceDetected: true,
                  landmarks: detectedLandmarks,
                  depthMap: faceDepthMap,
                  landmarkTexture: landmarkTextureData, // Include landmark texture even without calibration
                  faceFilterMode,
                })
              }
            }
          } else {
            setFaceDetected(false)
            setLandmarks([])
            setDepthMap(null)
            setLandmarkTexture(null)
            if (onDepthChange) {
              onDepthChange({
                relativeDepth: 0,
                normalizedDepth: 0,
                granularity: granularityRange.min,
                faceDetected: false,
                landmarks: [],
                depthMap: null,
                landmarkTexture: null,
                faceFilterMode,
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
    generateLandmarkTexture,
    isCalibrated,
    calibrationDepth,
    calibrationGranularity,
    granularityRange,
    onDepthChange,
    faceFilterMode,
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
    setLandmarkTexture(null)
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
    landmarkTexture, // Add for face filter mode
    calibrateDepth,
    resetCalibration,
    calibrationDepth,
    calibrationGranularity,
  }
}
