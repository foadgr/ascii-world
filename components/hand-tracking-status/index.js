import { AsciiContext } from 'components/ascii/context'
import { useContext } from 'react'
import s from './hand-tracking-status.module.scss'

export const HandTrackingStatus = () => {
  const { handTracking, handTrackingEnabled, handControlledGranularity } =
    useContext(AsciiContext)

  if (!handTrackingEnabled || !handTracking) return null

  const {
    handDetected,
    isCalibrated,
    relativeDepth,
    granularity,
    landmarks,
    isInitialized,
  } = handTracking

  // Calculate granularity percentage (assuming range is 4-32)
  const granularityRange = { min: 4, max: 32 }
  const granularityPercent =
    ((granularity - granularityRange.min) /
      (granularityRange.max - granularityRange.min)) *
    100
  const isAtCalibrationPoint = Math.abs(relativeDepth) < 0.01 // Within 1% of calibration point

  // Check if we're at the extreme ranges (INVERTED SCALE)
  const isAtMaxGranularity = relativeDepth <= -0.0 // -3% or closer = MAX granularity
  const isAtMinGranularity = relativeDepth >= 0.2 // +10% or further = MIN granularity

  const depthPercent = (relativeDepth * 100).toFixed(1)

  return (
    <div className={s.status}>
      <div className={s.indicator}>
        <div
          className={`${s.dot} ${isInitialized ? s.calibrated : s.notCalibrated}`}
        />
        <span className={s.label}>
          {isInitialized ? 'MediaPipe Ready' : 'Initializing...'}
        </span>
      </div>

      <div className={s.indicator}>
        <div
          className={`${s.dot} ${handDetected ? s.detected : s.notDetected}`}
        />
        <span className={s.label}>
          {handDetected
            ? `Hand Detected (${landmarks?.length || 0} landmarks)`
            : 'No Hand'}
        </span>
      </div>

      {handDetected && (
        <>
          <div className={s.indicator}>
            <div
              className={`${s.dot} ${isCalibrated ? s.calibrated : s.notCalibrated}`}
            />
            <span className={s.label}>
              {isCalibrated ? 'Calibrated' : 'Not Calibrated'}
            </span>
          </div>

          {isCalibrated && handControlledGranularity && (
            <div className={s.metrics}>
              <div className={s.metric}>
                <span className={s.metricLabel}>Depth:</span>
                <span className={s.metricValue}>
                  {relativeDepth > 0 ? '+' : ''}
                  {depthPercent}%
                  {isAtCalibrationPoint && (
                    <span className={s.calibrationIndicator}> (50%)</span>
                  )}
                  {isAtMaxGranularity && (
                    <span className={s.extremeIndicator}> MAX</span>
                  )}
                  {isAtMinGranularity && (
                    <span className={s.extremeIndicator}> MIN</span>
                  )}
                </span>
              </div>
              <div className={s.depthBar}>
                <div className={s.depthBarTrack}>
                  <div className={s.depthBarCenter} />
                  <div
                    className={s.depthBarFill}
                    style={{
                      width: `${Math.abs(relativeDepth) * 500}%`, // Increased multiplier for more sensitive visual
                      left:
                        relativeDepth < 0
                          ? `${50 + relativeDepth * 500}%`
                          : '50%',
                      backgroundColor:
                        relativeDepth < 0 ? '#ff6b6b' : '#4ecdc4',
                    }}
                  />
                </div>
                <div className={s.depthLabels}>
                  <span>-3% (Max Detail)</span>
                  <span>0% (50%)</span>
                  <span>+10% (Min Detail)</span>
                </div>
              </div>
              <div className={s.metric}>
                <span className={s.metricLabel}>Granularity:</span>
                <span className={s.metricValue}>
                  {granularity} ({granularityPercent.toFixed(0)}%)
                  {isAtCalibrationPoint && (
                    <span className={s.calibrationIndicator}> ✓</span>
                  )}
                  {isAtMaxGranularity && (
                    <span className={s.extremeIndicator}> ⬆</span>
                  )}
                  {isAtMinGranularity && (
                    <span className={s.extremeIndicator}> ⬇</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {!isCalibrated && (
            <div className={s.instruction}>
              Place your hand at your preferred distance and click
              &quot;calibrate hand depth&quot; to set 50% granularity point.
              <br />
              <small>
                Move closer (-3%) for max detail, further (+10%) for min detail.
              </small>
            </div>
          )}
        </>
      )}

      {isInitialized && !handDetected && (
        <div className={s.instruction}>
          Show your hand in front of the camera to begin tracking
        </div>
      )}
    </div>
  )
}
