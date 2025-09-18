import { AsciiContext } from 'components/ascii/context'
import { useContext } from 'react'
import s from './depth-display.module.scss'

export const DepthDisplay = () => {
  const {
    handTracking,
    faceTracking,
    audioTracking,
    trackingMode,
    handTrackingEnabled,
    faceTrackingEnabled,
    audioTrackingEnabled,
    handControlledGranularity,
    faceControlledGranularity,
    audioControlledGranularity,
    cameraActive,
  } = useContext(AsciiContext)

  // Determine which tracking mode is active and enabled
  const isHandMode =
    trackingMode === 'hand' && handTrackingEnabled && handTracking
  const isFaceMode =
    trackingMode === 'face' && faceTrackingEnabled && faceTracking
  const isAudioMode =
    trackingMode === 'audio' && audioTrackingEnabled && audioTracking

  // Show for camera-based tracking (hand/face) or audio tracking
  const shouldShow = (cameraActive && (isHandMode || isFaceMode)) || isAudioMode

  if (!shouldShow) {
    return null
  }

  // Determine if we should use bottom positioning
  const useBottomPosition = cameraActive || isAudioMode

  // Get the appropriate tracking data based on mode
  const trackingData = isHandMode
    ? {
        detected: handTracking.handDetected,
        isCalibrated: handTracking.isCalibrated,
        relativeDepth: handTracking.relativeDepth,
        granularity: handTracking.granularity,
        trackingType: 'hand',
      }
    : isFaceMode
      ? {
          detected: faceTracking.faceDetected,
          isCalibrated: faceTracking.isCalibrated,
          relativeDepth: faceTracking.relativeDepth,
          granularity: faceTracking.granularity,
          trackingType: 'face',
        }
      : {
          detected:
            audioTracking?.audioDetected ||
            audioTracking?.currentAudioLevel > 0,
          isCalibrated: audioTracking?.isCalibrated,
          relativeDepth: 0, // Audio doesn't have depth
          granularity: audioTracking?.granularity || 1,
          trackingType: 'audio',
        }

  const { detected, isCalibrated, relativeDepth, granularity, trackingType } =
    trackingData

  // Show instructions when tracking target is not detected
  if (!detected) {
    // For hand and face tracking, don't show any text instructions
    if (trackingType === 'hand' || trackingType === 'face') {
      return null
    }
    
    // Only show instructions for audio tracking
    return (
      <div
        className={`${s.depthDisplay} ${useBottomPosition ? s.bottomPosition : ''}`}
      >
        <div className={s.instructionMessage}>
          <span className={s.desktopText}>Make noise</span>
          <span className={s.mobileText}>Make noise</span>
        </div>
      </div>
    )
  }

  // Show minimal calibration status for hand/face (no visual indicators here - they're on the video)
  if (!isCalibrated && trackingType !== 'audio') {
    return null // No UI needed - corner indicators are on the video feed
  }

  // Show audio calibration instructions (audio still uses manual calibration)
  if (!isCalibrated && trackingType === 'audio') {
    return (
      <div
        className={`${s.depthDisplay} ${useBottomPosition ? s.bottomPosition : ''}`}
      >
        <div className={s.instructionContainer}>
          <div className={s.instructionMessage}>
            <span className={s.desktopText}>
              Set volume, tap music icon to lock
            </span>
            <span className={s.mobileText}>Set volume, tap music</span>
          </div>
          <div className={s.instructionSubtitle}>
            <span className={s.desktopText}>Louder = max detail</span>
            <span className={s.mobileText}>Louder = max</span>
          </div>
        </div>
      </div>
    )
  }

  // Show depth and granularity metrics when calibrated
  const depthPercent = (relativeDepth * 100).toFixed(1)
  const isAtCalibrationPoint = Math.abs(relativeDepth) < 0.01 // Within 1% of calibration point

  // For hand/face tracking, depth and granularity info is now shown via the gyroscope
  // Only show basic info for audio tracking
  if (trackingType === 'audio') {
    return (
      <div
        className={`${s.depthDisplay} ${useBottomPosition ? s.bottomPosition : ''}`}
      >
        <div className={s.granularityInfo}>
          <span className={s.granularityValue}>{granularity}</span>
          <span className={s.granularityLabel}>volume level</span>
        </div>
      </div>
    )
  }

  // For hand/face tracking, show minimal status or nothing when calibrated
  return null
}
