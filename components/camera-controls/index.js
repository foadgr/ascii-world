import { track } from '@vercel/analytics'
import { Hand, ScanFace } from 'lucide-react'
import { IconCameraSelfie, IconCameraRotate } from '@tabler/icons-react'
import { useEffect } from 'react'
import s from './camera-controls.module.scss'

export function CameraControls({
  cameraActive,
  cameraFacingMode,
  supportsCameraSwitch,
  handTracking,
  faceTracking,
  trackingMode, // 'hand' or 'face'
  onCameraToggle,
  onCameraSwitch,
  onHandTrackingChange,
  onFaceTrackingChange,
  onTrackingModeChange,
  onHandControlledGranularityChange,
  onFaceControlledGranularityChange,
  onCalibrateHandDepth,
  onCalibrateFaceDepth,
  onResetCalibration,
}) {
  // Auto-enable tracking when camera is active based on mode
  useEffect(() => {
    if (cameraActive) {
      if (trackingMode === 'hand') {
        onHandTrackingChange(true)
        onHandControlledGranularityChange(true)
        onFaceTrackingChange(false)
        onFaceControlledGranularityChange(false)
      } else if (trackingMode === 'face') {
        onFaceTrackingChange(true)
        onFaceControlledGranularityChange(true)
        onHandTrackingChange(false)
        onHandControlledGranularityChange(false)
      }
    } else {
      onHandTrackingChange(false)
      onHandControlledGranularityChange(false)
      onFaceTrackingChange(false)
      onFaceControlledGranularityChange(false)
    }
  }, [
    cameraActive,
    trackingMode,
    onHandTrackingChange,
    onFaceTrackingChange,
    onHandControlledGranularityChange,
    onFaceControlledGranularityChange,
  ])

  return (
    <div className={s.buttonGroup}>
      {/* Camera Toggle Button with Calibration Status Dot */}
      <button
        type="button"
        className={`${s.cameraButton} ${cameraActive ? s.active : ''}`}
        onClick={() => {
          track('Camera Toggle', { 
            action: cameraActive ? 'disable' : 'enable' 
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

      {/* Camera Flip Button - Only show on mobile/tablet devices when camera is active */}
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

      {/* Tracking Mode Toggle Buttons */}
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
        </>
      )}
    </div>
  )
}
