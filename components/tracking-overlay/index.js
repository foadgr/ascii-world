import { AsciiContext } from 'components/ascii/context'
import { useContext } from 'react'
import s from './tracking-overlay.module.scss'

export function TrackingOverlay() {
  const { handTracking, faceTracking, trackingMode, cameraActive } =
    useContext(AsciiContext)

  // Only show when camera is active and we have tracking data
  if (!cameraActive) return null

  // Get the appropriate tracking data
  const trackingData =
    trackingMode === 'hand'
      ? handTracking
      : trackingMode === 'face'
        ? faceTracking
        : null

  if (!trackingData) return null

  const { landmarks, isCalibrated, calibrationDepth } = trackingData

  // Only show when we have landmarks but not yet calibrated, or just calibrated
  if (!landmarks || landmarks.length === 0) return null

  // Calculate bounding box, rotation, and corner depths from landmarks
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  let rotation = 0
  const cornerDepths = {
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
  }
  const centerPoint = { x: 0.5, y: 0.5 }

  if (trackingMode === 'hand' && landmarks.length >= 21) {
    // For hand tracking, use all landmarks to create bounding box
    for (const landmark of landmarks) {
      minX = Math.min(minX, landmark.x)
      maxX = Math.max(maxX, landmark.x)
      minY = Math.min(minY, landmark.y)
      maxY = Math.max(maxY, landmark.y)
    }

    // Calculate hand rotation using wrist to middle finger base vector
    const wrist = landmarks[0]
    const middleFingerBase = landmarks[9]
    const deltaX = middleFingerBase.x - wrist.x
    const deltaY = middleFingerBase.y - wrist.y
    rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Calculate center point for gyroscope (palm center)
    const palmLandmarks = [0, 5, 9, 13, 17] // Wrist and finger bases
    centerPoint.x =
      palmLandmarks.reduce((sum, idx) => sum + landmarks[idx].x, 0) /
      palmLandmarks.length
    centerPoint.y =
      palmLandmarks.reduce((sum, idx) => sum + landmarks[idx].y, 0) /
      palmLandmarks.length

    // Calculate corner depths based on nearby landmarks
    const topLeftLandmarks = [5, 6] // Index finger area
    const topRightLandmarks = [17, 18] // Pinky area
    const bottomLeftLandmarks = [0, 1] // Wrist/thumb area
    const bottomRightLandmarks = [0, 17] // Wrist/pinky base

    cornerDepths.topLeft =
      topLeftLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      topLeftLandmarks.length
    cornerDepths.topRight =
      topRightLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      topRightLandmarks.length
    cornerDepths.bottomLeft =
      bottomLeftLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      bottomLeftLandmarks.length
    cornerDepths.bottomRight =
      bottomRightLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      bottomRightLandmarks.length
  } else if (trackingMode === 'face' && landmarks.length >= 468) {
    // For face tracking, use face outline landmarks for bounding box
    const faceOutlineIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
      378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
      162, 21, 54, 103, 67, 109,
    ]

    for (const index of faceOutlineIndices) {
      if (index < landmarks.length) {
        const landmark = landmarks[index]
        minX = Math.min(minX, landmark.x)
        maxX = Math.max(maxX, landmark.x)
        minY = Math.min(minY, landmark.y)
        maxY = Math.max(maxY, landmark.y)
      }
    }

    // Calculate face rotation using eye line (left eye to right eye)
    const leftEyeCenter = landmarks[33] // Left eye inner corner
    const rightEyeCenter = landmarks[362] // Right eye inner corner
    const deltaX = rightEyeCenter.x - leftEyeCenter.x
    const deltaY = rightEyeCenter.y - leftEyeCenter.y
    rotation = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

    // Calculate center point for gyroscope (nose tip)
    const noseTip = landmarks[1]
    centerPoint.x = noseTip.x
    centerPoint.y = noseTip.y

    // Calculate corner depths based on face regions
    const topLeftLandmarks = [109, 67, 103] // Left temple area
    const topRightLandmarks = [338, 297, 332] // Right temple area
    const bottomLeftLandmarks = [172, 136, 150] // Left jaw area
    const bottomRightLandmarks = [397, 365, 379] // Right jaw area

    cornerDepths.topLeft =
      topLeftLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      topLeftLandmarks.length
    cornerDepths.topRight =
      topRightLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      topRightLandmarks.length
    cornerDepths.bottomLeft =
      bottomLeftLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      bottomLeftLandmarks.length
    cornerDepths.bottomRight =
      bottomRightLandmarks.reduce((sum, idx) => sum + landmarks[idx].z, 0) /
      bottomRightLandmarks.length
  }

  // Add padding to the bounding box
  const padding = 0.05 // 5% padding
  const width = maxX - minX
  const height = maxY - minY

  minX = Math.max(0, minX - padding)
  maxX = Math.min(1, maxX + padding)
  minY = Math.max(0, minY - padding)
  maxY = Math.min(1, maxY + padding)

  // Convert to percentage for CSS positioning
  const left = `${minX * 100}%`
  const top = `${minY * 100}%`
  const boxWidth = `${(maxX - minX) * 100}%`
  const boxHeight = `${(maxY - minY) * 100}%`

  // Calculate depth scaling for corners (closer = bigger)
  const getDepthScale = (depth) => {
    const baseScale = 1.0
    const depthMultiplier = -10 // Negative because MediaPipe Z is inverted
    return Math.max(0.5, Math.min(2.0, baseScale + depth * depthMultiplier))
  }

  return (
    <div className={s.trackingOverlay}>
      <div
        className={`${s.trackingBox} ${isCalibrated ? s.calibrated : s.calibrating}`}
        style={{
          left,
          top,
          width: boxWidth,
          height: boxHeight,
          transform: `rotate(${rotation * 0.5}deg)`, // Reduced rotation multiplier for more subtle effect
          transformOrigin: 'center center',
        }}
      >
        {/* Corner indicators with enhanced depth scaling and individual rotation */}
        <div
          className={s.corner}
          data-corner="top-left"
          style={{
            transform: `scale(${getDepthScale(cornerDepths.topLeft)}) rotate(${rotation * 0.1}deg)`,
            transformOrigin: 'bottom right',
          }}
        />
        <div
          className={s.corner}
          data-corner="top-right"
          style={{
            transform: `scale(${getDepthScale(cornerDepths.topRight)}) rotate(${-rotation * 0.1}deg)`,
            transformOrigin: 'bottom left',
          }}
        />
        <div
          className={s.corner}
          data-corner="bottom-left"
          style={{
            transform: `scale(${getDepthScale(cornerDepths.bottomLeft)}) rotate(${-rotation * 0.1}deg)`,
            transformOrigin: 'top right',
          }}
        />
        <div
          className={s.corner}
          data-corner="bottom-right"
          style={{
            transform: `scale(${getDepthScale(cornerDepths.bottomRight)}) rotate(${rotation * 0.1}deg)`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  )
}
