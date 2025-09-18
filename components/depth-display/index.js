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

  // No additional instructions needed for audio when not calibrated
  if (!isCalibrated && trackingType === 'audio') {
    return null // Only "Make noise" is shown when audio is not detected
  }

  // No additional information needed when calibrated - keep it clean
  return null
}
