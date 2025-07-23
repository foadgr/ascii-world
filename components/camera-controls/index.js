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
      {/* Camera Toggle Button */}
      <button
        type="button"
        className={`${s.cameraButton} ${cameraActive ? s.active : ''}`}
        onClick={onCameraToggle}
      >
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
        {/* camera */}
      </button>

      {/* Calibrate/Reset Button - Only show when hand is detected */}
      {cameraActive && handTracking?.handDetected && (
        <button
          type="button"
          className={s.calibrateButton}
          onClick={
            handTracking?.isCalibrated
              ? onResetCalibration
              : onCalibrateHandDepth
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
            <title>{handTracking?.isCalibrated ? 'Reset' : 'Calibrate'}</title>
            {handTracking?.isCalibrated ? (
              // Reset icon
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            ) : (
              // Calibrate icon (target/crosshair)
              <>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M6 12h12" />
              </>
            )}
          </svg>
          {handTracking?.isCalibrated ? 'reset' : 'calibrate'}
        </button>
      )}
    </div>
  )
}
