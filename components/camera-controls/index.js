import { Hand } from 'lucide-react'
import { useEffect } from 'react'
import s from './camera-controls.module.scss'

export function CameraControls({
  cameraActive,
  handTracking,
  onCameraToggle,
  onHandTrackingChange,
  onHandControlledGranularityChange,
  onCalibrateHandDepth,
  onResetCalibration,
}) {
  // Auto-enable hand tracking when camera is active
  useEffect(() => {
    if (cameraActive) {
      onHandTrackingChange(true)
      onHandControlledGranularityChange(true)
    } else {
      onHandTrackingChange(false)
      onHandControlledGranularityChange(false)
    }
  }, [cameraActive, onHandTrackingChange, onHandControlledGranularityChange])

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
          {cameraActive && handTracking && (
            <div
              className={`${s.statusDot} ${
                handTracking.isCalibrated ? s.calibrated : s.notCalibrated
              }`}
            />
          )}
        </div>
      </button>

      {/* Hand Detection/Calibration Button */}
      {cameraActive && (
        <button
          type="button"
          className={`${s.handButton} ${
            !handTracking?.handDetected 
              ? s.notDetected 
              : handTracking?.isCalibrated 
                ? s.detected 
                : s.uncalibrated
          }`}
          onClick={
            handTracking?.handDetected && !handTracking?.isCalibrated
              ? onCalibrateHandDepth
              : handTracking?.isCalibrated
                ? onResetCalibration
                : undefined
          }
          disabled={!handTracking?.handDetected}
          title={
            !handTracking?.handDetected 
              ? 'No hand detected' 
              : handTracking?.isCalibrated 
                ? 'Hand calibrated - click to reset'
                : 'Hand detected - click to calibrate'
          }
        >
          <Hand size={18} />
        </button>
      )}
    </div>
  )
}
