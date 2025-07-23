import { AsciiContext } from 'components/ascii/context'
import { useContext } from 'react'
import s from './depth-display.module.scss'

export const DepthDisplay = () => {
  const {
    handTracking,
    handTrackingEnabled,
    handControlledGranularity,
    cameraActive,
  } = useContext(AsciiContext)

  // Only show when camera is active and hand tracking is enabled
  if (!cameraActive || !handTrackingEnabled || !handTracking) {
    return null
  }

  const { handDetected, isCalibrated, relativeDepth, granularity } =
    handTracking

  // Show instructions when hand is not detected
  if (!handDetected) {
    return (
      <div className={s.depthDisplay}>
        <div className={s.instructionMessage}>
          Show your hand in front of the camera to begin tracking
        </div>
      </div>
    )
  }

  // Show calibration instructions when hand is detected but not calibrated
  if (!isCalibrated) {
    return (
      <div className={s.depthDisplay}>
        <div className={s.instructionContainer}>
          <div className={s.instructionMessage}>
            Place hand at your preferred distance and tap hand icon to lock the
            current detail.
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
