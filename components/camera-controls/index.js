import {
  IconCameraRotate,
  IconCameraSelfie,
  IconMusic,
} from '@tabler/icons-react'
import { track } from '@vercel/analytics'
import { Hand, ScanFace } from 'lucide-react'
import { useEffect } from 'react'
import s from './camera-controls.module.scss'

export function CameraControls({
  cameraActive,
  cameraFacingMode,
  supportsCameraSwitch,
  handTracking,
  faceTracking,
  audioTracking,
  trackingMode, // 'hand', 'face', or 'audio'
  onCameraToggle,
  onCameraSwitch,
  onHandTrackingChange,
  onFaceTrackingChange,
  onAudioTrackingChange,
  onTrackingModeChange,
  onHandControlledGranularityChange,
  onFaceControlledGranularityChange,
  onAudioControlledGranularityChange,
  onCalibrateHandDepth,
  onCalibrateFaceDepth,
  onCalibrateAudio,
  onResetCalibration,
}) {
  // Auto-enable tracking based on mode and camera state
  useEffect(() => {
    if (cameraActive) {
      if (trackingMode === 'hand') {
        onHandTrackingChange(true)
        onHandControlledGranularityChange(true)
        onFaceTrackingChange(false)
        onFaceControlledGranularityChange(false)
        onAudioTrackingChange(false)
        onAudioControlledGranularityChange(false)
      } else if (trackingMode === 'face') {
        onFaceTrackingChange(true)
        onFaceControlledGranularityChange(true)
        onHandTrackingChange(false)
        onHandControlledGranularityChange(false)
        onAudioTrackingChange(false)
        onAudioControlledGranularityChange(false)
      } else if (trackingMode === 'audio') {
        onAudioTrackingChange(true)
        onAudioControlledGranularityChange(true)
        onHandTrackingChange(false)
        onHandControlledGranularityChange(false)
        onFaceTrackingChange(false)
        onFaceControlledGranularityChange(false)
      } else if (trackingMode === 'mixed') {
        // Mixed mode - enable all tracking (no granularity control)
        onHandTrackingChange(true)
        onFaceTrackingChange(true)
        onAudioTrackingChange(true)
        onHandControlledGranularityChange(false)
        onFaceControlledGranularityChange(false)
        onAudioControlledGranularityChange(false)
      }
    } else {
      // Camera is off - only disable camera-dependent tracking
      onHandTrackingChange(false)
      onHandControlledGranularityChange(false)
      onFaceTrackingChange(false)
      onFaceControlledGranularityChange(false)

      // Keep audio tracking if it's selected (audio doesn't need camera)
      if (trackingMode === 'audio') {
        onAudioTrackingChange(true)
        onAudioControlledGranularityChange(true)
      } else {
        onAudioTrackingChange(false)
        onAudioControlledGranularityChange(false)
      }
    }
  }, [
    cameraActive,
    trackingMode,
    onHandTrackingChange,
    onFaceTrackingChange,
    onAudioTrackingChange,
    onHandControlledGranularityChange,
    onFaceControlledGranularityChange,
    onAudioControlledGranularityChange,
  ])

  return (
    <div className={s.buttonGroup}>
      {/* Camera Buttons Container - Vertical layout */}
      <div className={s.cameraButtonsContainer}>
        {/* Camera Toggle Button with Calibration Status Dot */}
        <button
          type="button"
          className={`${s.cameraButton} ${cameraActive ? s.active : ''}`}
          onClick={() => {
            track('Camera Toggle', {
              action: cameraActive ? 'disable' : 'enable',
            })
            onCameraToggle()
          }}
        >
          <div className={s.cameraIconContainer}>
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <title>Camera</title>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </button>

        {/* Camera Flip Button - Below camera toggle for mobile space efficiency */}
        {cameraActive && supportsCameraSwitch && (
          <button
            type="button"
            className={s.flipButton}
            onClick={onCameraSwitch}
            title={`Switch to ${cameraFacingMode === 'user' ? 'back' : 'front'} camera`}
          >
            {cameraFacingMode === 'user' ? (
              <IconCameraRotate size={23} />
            ) : (
              <IconCameraSelfie size={23} />
            )}
          </button>
        )}
      </div>

      {/* Camera-dependent tracking buttons (Hand & Face) */}
      {cameraActive && (
        <>
          {/* Hand Tracking Button */}
          <button
            type="button"
            className={`${s.trackingButton} ${
              trackingMode === 'hand' ? s.active : ''
            } ${
              trackingMode === 'hand' && !handTracking?.handDetected
                ? s.notDetected
                : trackingMode === 'hand' && handTracking?.isCalibrated
                  ? s.detected
                  : trackingMode === 'hand'
                    ? s.uncalibrated
                    : ''
            }`}
            onClick={() => {
              if (trackingMode === 'hand') {
                // If already in hand mode, handle calibration
                if (handTracking?.handDetected && !handTracking?.isCalibrated) {
                  track('Hand Calibrate', { action: 'calibrate_depth' })
                  onCalibrateHandDepth()
                } else if (handTracking?.isCalibrated) {
                  track('Hand Reset', { action: 'reset_calibration' })
                  onResetCalibration()
                }
              } else {
                // Switch to hand tracking mode
                track('Hand Tracking', { action: 'enable' })
                onTrackingModeChange('hand')
              }
            }}
            title={
              trackingMode !== 'hand'
                ? 'Switch to hand tracking'
                : !handTracking?.handDetected
                  ? 'No hand detected'
                  : handTracking?.isCalibrated
                    ? 'Hand calibrated - click to reset'
                    : 'Hand detected - click to calibrate'
            }
          >
            <Hand size={23} />
          </button>

          {/* Face Tracking Button */}
          <button
            type="button"
            className={`${s.trackingButton} ${
              trackingMode === 'face' ? s.active : ''
            } ${
              trackingMode === 'face' && !faceTracking?.faceDetected
                ? s.notDetected
                : trackingMode === 'face' && faceTracking?.isCalibrated
                  ? s.detected
                  : trackingMode === 'face'
                    ? s.uncalibrated
                    : ''
            }`}
            onClick={() => {
              if (trackingMode === 'face') {
                // If already in face mode, handle calibration
                if (faceTracking?.faceDetected && !faceTracking?.isCalibrated) {
                  track('Face Calibrate', { action: 'calibrate_depth' })
                  onCalibrateFaceDepth()
                } else if (faceTracking?.isCalibrated) {
                  track('Face Reset', { action: 'reset_calibration' })
                  onResetCalibration()
                }
              } else {
                // Switch to face tracking mode
                track('Face Tracking', { action: 'enable' })
                onTrackingModeChange('face')
              }
            }}
            title={
              trackingMode !== 'face'
                ? 'Switch to face tracking'
                : !faceTracking?.faceDetected
                  ? 'No face detected'
                  : faceTracking?.isCalibrated
                    ? 'Face calibrated - click to reset'
                    : 'Face detected - click to calibrate'
            }
          >
            <ScanFace size={23} />
          </button>

          {/* Mixed Mode Button - Enable all tracking */}
          <button
            type="button"
            className={`${s.trackingButton} ${
              trackingMode === 'mixed' ? s.active : ''
            } ${trackingMode === 'mixed' ? s.detected : ''}`}
            onClick={() => {
              track('Mixed Tracking', { action: 'enable' })
              onTrackingModeChange('mixed')
            }}
            title={
              trackingMode !== 'mixed'
                ? 'Switch to mixed tracking (hand + face + audio)'
                : 'Mixed tracking active'
            }
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>∞</div>
          </button>
        </>
      )}

      {/* Audio Tracking Button - Always available (doesn't need camera) */}
      <button
        type="button"
        className={`${s.trackingButton} ${
          trackingMode === 'audio' ? s.active : ''
        } ${
          trackingMode === 'audio' && !audioTracking?.audioDetected
            ? s.notDetected
            : trackingMode === 'audio' && audioTracking?.isCalibrated
              ? s.detected
              : trackingMode === 'audio'
                ? s.uncalibrated
                : ''
        }`}
        style={{
          color:
            trackingMode === 'audio' && audioTracking?.audioDetected
              ? '#ff8c00'
              : undefined,
        }}
        onClick={() => {
          if (trackingMode === 'audio') {
            // If already in audio mode, handle calibration
            if (
              audioTracking?.currentAudioLevel > 0 &&
              !audioTracking?.isCalibrated
            ) {
              track('Audio Calibrate', { action: 'calibrate_audio' })
              onCalibrateAudio()
            } else if (audioTracking?.isCalibrated) {
              track('Audio Reset', { action: 'reset_calibration' })
              onResetCalibration()
            }
          } else {
            // Switch to audio tracking mode
            track('Audio Tracking', { action: 'enable' })
            onTrackingModeChange('audio')
          }
        }}
        title={
          trackingMode !== 'audio'
            ? 'Switch to audio tracking'
            : !audioTracking?.audioDetected
              ? 'No audio detected'
              : audioTracking?.isCalibrated
                ? 'Audio calibrated - click to reset'
                : 'Audio detected - click to calibrate'
        }
      >
        <IconMusic size={23} />
      </button>
    </div>
  )
}
