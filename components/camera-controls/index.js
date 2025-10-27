import { track } from '@vercel/analytics'
import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import s from './camera-controls.module.scss'

// Hook to detect if we're on desktop
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  return isDesktop
}

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const isDesktop = useIsDesktop()

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

  const handleModeSelect = (mode) => {
    if (mode === 'flip' && supportsCameraSwitch) {
      onCameraSwitch()
    } else if (mode === 'hand') {
      onTrackingModeChange('hand')
    } else if (mode === 'face') {
      onTrackingModeChange('face')
    }
    setIsDrawerOpen(false)
  }

  return isDesktop ? (
    // Desktop: Original horizontal layout
    <div className={s.buttonGroup}>
      {/* Camera Buttons Container - Vertical layout */}
      <div className={s.cameraButtonsContainer}>
        {/* Camera Toggle Button */}
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
          CAMERA
        </button>

        {/* Camera Flip Button */}
        {cameraActive && supportsCameraSwitch && (
          <button
            type="button"
            className={s.flipButton}
            onClick={onCameraSwitch}
            title={`Switch to ${cameraFacingMode === 'user' ? 'back' : 'front'} camera`}
          >
            FLIP
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
            HAND
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
            SELFIE
          </button>
        </>
      )}

      {/* Audio Tracking Button - Always available (doesn't need camera) */}
      <button
        type="button"
        className={`${s.trackingButton} ${s.audioButton} ${
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
        AUDIO
      </button>
    </div>
  ) : (
    // Mobile: CAMERA button with drawer for FLIP, HAND, FACE
    <>
      <div className={s.mobileButtonGroup}>
        <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <Drawer.Trigger asChild>
            <button
              type="button"
              className={`${s.cameraButton} ${cameraActive ? s.active : ''}`}
              onClick={() => {
                if (cameraActive) {
                  setIsDrawerOpen(true)
                } else {
                  track('Camera Toggle', { action: 'enable' })
                  onCameraToggle()
                }
              }}
            >
              CAMERA
            </button>
          </Drawer.Trigger>
          {cameraActive && (
            <Drawer.Portal>
              <Drawer.Overlay className={s.overlay} />
              <Drawer.Content className={s.drawerContent}>
                <div className={s.drawerHeader}>
                  <div className={s.handle} />
                  <Drawer.Title className={s.drawerTitle}>CAMERA CONTROLS</Drawer.Title>
                </div>
                <div className={s.drawerBody}>
                  {/* FLIP button - only show if camera switching supported */}
                  {supportsCameraSwitch && (
                    <button
                      type="button"
                      className={s.circleButton}
                      onClick={() => handleModeSelect('flip')}
                    >
                      FLIP
                    </button>
                  )}
                  {/* HAND button */}
                  <button
                    type="button"
                    className={`${s.circleButton} ${trackingMode === 'hand' ? s.active : ''}`}
                    onClick={() => handleModeSelect('hand')}
                  >
                    HAND
                  </button>
                  {/* FACE button */}
                  <button
                    type="button"
                    className={`${s.circleButton} ${trackingMode === 'face' ? s.active : ''}`}
                    onClick={() => handleModeSelect('face')}
                  >
                    FACE
                  </button>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          )}
        </Drawer.Root>

        {/* Audio Tracking Button - Always available on mobile */}
        <button
          type="button"
          className={`${s.trackingButton} ${s.audioButton} ${
            trackingMode === 'audio' ? s.active : ''
          }`}
          style={{
            color:
              trackingMode === 'audio' && audioTracking?.audioDetected
                ? '#ff8c00'
                : undefined,
          }}
          onClick={() => {
            if (trackingMode === 'audio') {
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
              track('Audio Tracking', { action: 'enable' })
              onTrackingModeChange('audio')
            }
          }}
        >
          AUDIO
        </button>
      </div>
    </>
  )
}
