import { Hand, RotateCcw, ScanFace } from 'lucide-react'
import { useEffect } from 'react'
import s from './camera-controls.module.scss'

export function CameraControls({
  cameraActive,
  cameraFacingMode,
  supportsCameraSwitch,
  handTracking,
  faceTracking,
  trackingMode, // 'hand' or 'face'
  faceFilterMode = false, // New prop for face filter mode
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
  onFaceFilterModeChange,
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
        onClick={onCameraToggle}
      >
        <div className={s.cameraIconContainer}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <title>Camera</title>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {/* Calibration Status Dot */}
          {cameraActive && (
            <div
              className={`${s.statusDot} ${
                (trackingMode === 'hand' && handTracking?.isCalibrated) ||
                (trackingMode === 'face' && faceTracking?.isCalibrated)
                  ? s.calibrated
                  : s.notCalibrated
              }`}
            />
          )}
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
          <RotateCcw size={18} />
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
                  onCalibrateHandDepth()
                } else if (handTracking?.isCalibrated) {
                  onResetCalibration()
                }
              } else {
                // Switch to hand tracking mode
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
            <Hand size={18} />
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
                  onCalibrateFaceDepth()
                } else if (faceTracking?.isCalibrated) {
                  onResetCalibration()
                }
              } else {
                // Switch to face tracking mode
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
            <ScanFace size={18} />
          </button>
          
          {/* Face Filter Mode Button - Only show when face tracking is active */}
          {trackingMode === 'face' && faceTracking?.faceDetected && (
            <button
              type="button"
              className={`${s.filterButton} ${faceFilterMode ? s.active : ''}`}
              onClick={() => onFaceFilterModeChange(!faceFilterMode)}
              title={
                faceFilterMode
                  ? 'Disable face filter mode (enable world controls)'
                  : 'Enable face filter mode (face controls granularity)'
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <title>Face Filter</title>
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  )
}
