import { AsciiContext } from 'components/ascii/context'
import { useContext } from 'react'
import s from './depth-display.module.scss'

export const DepthDisplay = () => {
  const {
    handTracking,
    faceTracking,
    trackingMode,
    handTrackingEnabled,
    faceTrackingEnabled,
    handControlledGranularity,
    faceControlledGranularity,
    cameraActive,
  } = useContext(AsciiContext)

  // Determine which tracking mode is active and enabled
  const isHandMode =
    trackingMode === 'hand' && handTrackingEnabled && handTracking
  const isFaceMode =
    trackingMode === 'face' && faceTrackingEnabled && faceTracking

  // Only show when camera is active and tracking is enabled
  if (!cameraActive || (!isHandMode && !isFaceMode)) {
    return null
  }

  // Get the appropriate tracking data based on mode
  const trackingData = isHandMode
    ? {
        detected: handTracking.handDetected,
        isCalibrated: handTracking.isCalibrated,
        relativeDepth: handTracking.relativeDepth,
        granularity: handTracking.granularity,
        trackingType: 'hand',
      }
    : {
        detected: faceTracking.faceDetected,
        isCalibrated: faceTracking.isCalibrated,
        relativeDepth: faceTracking.relativeDepth,
        granularity: faceTracking.granularity,
        trackingType: 'face',
      }

  const { detected, isCalibrated, relativeDepth, granularity, trackingType } =
    trackingData

  // Show instructions when tracking target is not detected
  if (!detected) {
    return (
      <div className={s.depthDisplay}>
        <div className={s.instructionMessage}>
          {trackingType === 'hand'
            ? 'Show your hand in front of the camera to begin tracking'
            : 'Show your face in front of the camera to begin tracking'}
        </div>
      </div>
    )
  }

  // Show calibration instructions when tracking target is detected but not calibrated
  if (!isCalibrated) {
    return (
      <div className={s.depthDisplay}>
        <div className={s.instructionContainer}>
          <div className={s.instructionMessage}>
            {trackingType === 'hand'
              ? 'Place hand at your preferred distance and tap hand icon to lock the current detail.'
              : 'Position your face at your preferred distance and tap face icon to lock the current detail.'}
          </div>
          <div className={s.instructionSubtitle}>
            Move closer for max detail, further for min detail.
          </div>
        </div>
      </div>
    )
  }

  // Show depth and granularity metrics when calibrated
  const depthPercent = (relativeDepth * 100).toFixed(1)
  const isAtCalibrationPoint = Math.abs(relativeDepth) < 0.01 // Within 1% of calibration point

  return (
    <div className={s.depthDisplay}>
      <div className={s.depthInfo}>
        <span className={s.depthValue}>
          {relativeDepth > 0 ? '+' : ''}
          {depthPercent}%
          {isAtCalibrationPoint && (
            <span className={s.calibrationMark}> ●</span>
          )}
        </span>
        <span className={s.depthLabel}>depth</span>
      </div>

      <div className={s.depthBar}>
        <div className={s.depthBarTrack}>
          <div className={s.depthBarCenter} />
          <div
            className={s.depthBarFill}
            style={{
              width: `${Math.abs(relativeDepth) * 500}%`,
              left: relativeDepth > 0 ? '50%' : `${50 + relativeDepth * 500}%`,
              backgroundColor: relativeDepth > 0 ? '#4ecdc4' : '#ff6b6b',
            }}
          />
        </div>
      </div>

      <div className={s.granularityInfo}>
        <span className={s.granularityValue}>{granularity}</span>
        <span className={s.granularityLabel}>granularity</span>
      </div>
    </div>
  )
}
