import { useCallback, useEffect, useRef, useState } from 'react'

export const useAudioTracking = ({
  enabled = false,
  onAudioChange,
  audioThreshold = 0.02, // Base threshold - will be adjusted by sensitivity
  sensitivity = 1.0, // Sensitivity multiplier (0.1 = less sensitive, 2.0 = more sensitive)
  adjustmentVector = { voice: 1.0, music: 1.0, noise: 0.3 }, // Frequency band adjustments
}) => {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const microphoneRef = useRef(null)
  const animationFrameRef = useRef()
  const dataArrayRef = useRef(null)
  const frameCountRef = useRef(0) // Process every other frame
  const lastUpdateRef = useRef(0) // Throttle updates

  const [isInitialized, setIsInitialized] = useState(false)
  const [audioDetected, setAudioDetected] = useState(false)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [calibrationLevel, setCalibrationLevel] = useState(null)
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0)
  const [relativeAudio, setRelativeAudio] = useState(0)
  const [audioIntensity, setAudioIntensity] = useState(0) // 0-100 for UI display
  const [smoothedAudioLevel, setSmoothedAudioLevel] = useState(0) // For elastic effect
  const [lastAudioLevel, setLastAudioLevel] = useState(0) // For spike detection

  // Batch state updates to reduce re-renders
  const updateState = useCallback(
    (updates) => {
      if (
        updates.currentAudioLevel !== undefined &&
        Math.abs(currentAudioLevel - updates.currentAudioLevel) > 0.005
      ) {
        setCurrentAudioLevel(updates.currentAudioLevel)
      }
      if (
        updates.smoothedAudioLevel !== undefined &&
        Math.abs(smoothedAudioLevel - updates.smoothedAudioLevel) > 0.005
      ) {
        setSmoothedAudioLevel(updates.smoothedAudioLevel)
      }
      if (
        updates.lastAudioLevel !== undefined &&
        Math.abs(lastAudioLevel - updates.lastAudioLevel) > 0.005
      ) {
        setLastAudioLevel(updates.lastAudioLevel)
      }
      if (
        updates.audioDetected !== undefined &&
        audioDetected !== updates.audioDetected
      ) {
        setAudioDetected(updates.audioDetected)
      }
    },
    [currentAudioLevel, smoothedAudioLevel, lastAudioLevel, audioDetected]
  )

  // Smart audio analysis with frequency band detection
  const analyzeAudioContent = useCallback(
    (frequencyData) => {
      if (!frequencyData)
        return {
          level: 0,
          voiceLevel: 0,
          musicLevel: 0,
          noiseLevel: 0,
          contentType: 'none',
        }

      const sampleRate = 44100 // Typical sample rate
      const nyquist = sampleRate / 2
      const binSize = nyquist / frequencyData.length

      // Define frequency ranges
      const voiceRange = { min: 85, max: 2000 } // Human voice intelligibility range
      const musicRange = { min: 60, max: 8000 } // Music content range (broader)
      const noiseRange = { min: 8000, max: 20000 } // High frequency noise

      // Convert frequency ranges to bin indices
      const voiceBins = {
        start: Math.floor(voiceRange.min / binSize),
        end: Math.floor(voiceRange.max / binSize),
      }
      const musicBins = {
        start: Math.floor(musicRange.min / binSize),
        end: Math.floor(musicRange.max / binSize),
      }
      const noiseBins = {
        start: Math.floor(noiseRange.min / binSize),
        end: Math.floor(noiseRange.max / binSize),
      }

      // Calculate energy in each frequency band
      let voiceEnergy = 0
      let musicEnergy = 0
      let noiseEnergy = 0
      let totalEnergy = 0

      // Voice energy (85-2000Hz)
      for (
        let i = voiceBins.start;
        i < Math.min(voiceBins.end, frequencyData.length);
        i++
      ) {
        voiceEnergy += frequencyData[i] * frequencyData[i]
      }

      // Music energy (60-8000Hz) - includes voice range but broader
      for (
        let i = musicBins.start;
        i < Math.min(musicBins.end, frequencyData.length);
        i++
      ) {
        musicEnergy += frequencyData[i] * frequencyData[i]
      }

      // Noise energy (8000-20000Hz)
      for (
        let i = noiseBins.start;
        i < Math.min(noiseBins.end, frequencyData.length);
        i++
      ) {
        noiseEnergy += frequencyData[i] * frequencyData[i]
      }

      // Total energy for normalization
      for (let i = 0; i < frequencyData.length; i++) {
        totalEnergy += frequencyData[i] * frequencyData[i]
      }

      // Normalize to 0-1 range
      const normalize = (energy) => Math.sqrt(energy) / 255
      const voiceLevel = normalize(voiceEnergy)
      const musicLevel = normalize(musicEnergy)
      const noiseLevel = normalize(noiseEnergy)
      const overallLevel = normalize(totalEnergy / frequencyData.length)

      // Apply adjustment vector to emphasize/de-emphasize different content types
      const adjustedVoice = voiceLevel * adjustmentVector.voice
      const adjustedMusic = musicLevel * adjustmentVector.music
      const adjustedNoise = noiseLevel * adjustmentVector.noise

      // Calculate weighted level (emphasizing voice/music over noise) - extremely conservative
      const baseLevel =
        Math.max(adjustedVoice, adjustedMusic) * 0.1 - adjustedNoise * 0.2
      // Apply sensitivity scaling - at 0.1 sensitivity, divide by 10!
      const finalLevel = Math.max(0, Math.min(1, baseLevel / sensitivity))

      // Determine content type based on dominant frequency content - higher thresholds
      let contentType = 'none'
      if (voiceLevel > 0.08 && voiceLevel > musicLevel * 0.7) {
        contentType = 'voice'
      } else if (musicLevel > 0.1) {
        contentType = 'music'
      } else if (noiseLevel > 0.15) {
        contentType = 'noise'
      }

      return {
        level: finalLevel,
        voiceLevel: adjustedVoice,
        musicLevel: adjustedMusic,
        noiseLevel: adjustedNoise,
        contentType,
        rawLevel: overallLevel,
      }
    },
    [adjustmentVector, sensitivity]
  )

  // Initialize Web Audio API
  useEffect(() => {
    if (!enabled) return

    const setupAudioContext = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })

        // Create audio context
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext
        const audioContext = new AudioContextClass()

        // Create analyser node
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 512 // Reduced from 1024 for better performance
        analyser.smoothingTimeConstant = 0.8 // Smooth out rapid changes

        // Connect microphone to analyser
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        // Create data array for frequency data
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        audioContextRef.current = audioContext
        analyserRef.current = analyser
        microphoneRef.current = stream
        dataArrayRef.current = dataArray

        setIsInitialized(true)
        console.log('Audio tracking initialized successfully')
      } catch (error) {
        console.error('Error setting up audio tracking:', error)
      }
    }

    setupAudioContext()

    return () => {
      // Cleanup
      if (microphoneRef.current) {
        for (const track of microphoneRef.current.getTracks()) {
          track.stop()
        }
        microphoneRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      analyserRef.current = null
      dataArrayRef.current = null
      setIsInitialized(false)
    }
  }, [enabled])

  // Process audio frames
  useEffect(() => {
    if (!isInitialized || !analyserRef.current || !dataArrayRef.current) return

    const processAudioFrame = (timestamp) => {
      // Balanced frame rate limiting for audio processing
      frameCountRef.current++
      if (frameCountRef.current % 2 !== 0) {
        animationFrameRef.current = requestAnimationFrame(processAudioFrame)
        return
      }

      // Balanced throttling for audio responsiveness
      if (timestamp - lastUpdateRef.current < 14) {
        // Max ~71fps for audio responsiveness
        animationFrameRef.current = requestAnimationFrame(processAudioFrame)
        return
      }
      lastUpdateRef.current = timestamp

      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      // Analyze audio content with smart filtering
      const analysis = analyzeAudioContent(dataArrayRef.current)
      const audioLevel = analysis.level

      // Create elastic effect: detect spikes and enhance them
      const audioLevelChange = audioLevel - lastAudioLevel
      // Use sensitivity to adjust spike detection threshold
      const spikeThreshold = 0.005 / sensitivity // More sensitive = lower threshold
      const isSpike = audioLevelChange > spikeThreshold

      // Smooth the audio level for baseline, but spike for sudden changes
      const smoothingFactor = 0.9 // Higher smoothing for more contrast
      const newSmoothedLevel =
        smoothedAudioLevel * smoothingFactor +
        audioLevel * (1 - smoothingFactor)

      // Calculate enhanced level that spikes on sudden audio increases
      let enhancedLevel = audioLevel
      if (isSpike) {
        // Apply sensitivity to spike amplification
        const spikeFactor = 5.0 * sensitivity // Scale amplification with sensitivity
        enhancedLevel = audioLevel + audioLevelChange * spikeFactor
        enhancedLevel = Math.min(1, enhancedLevel) // Cap at 1
      }

      // Balanced state updates for audio responsiveness
      const stateUpdates = {}
      if (Math.abs(currentAudioLevel - audioLevel) > 0.003) {
        stateUpdates.currentAudioLevel = audioLevel
      }
      if (Math.abs(smoothedAudioLevel - newSmoothedLevel) > 0.003) {
        stateUpdates.smoothedAudioLevel = newSmoothedLevel
      }
      if (Math.abs(lastAudioLevel - audioLevel) > 0.003) {
        stateUpdates.lastAudioLevel = audioLevel
      }

      // Detect if audio is above threshold (adjusted by sensitivity)
      const adjustedThreshold = audioThreshold * (2.0 / sensitivity) // At min sensitivity (0.1), threshold is 20x higher!
      const isAudioDetected = enhancedLevel > adjustedThreshold
      if (audioDetected !== isAudioDetected) {
        stateUpdates.audioDetected = isAudioDetected
      }

      // Only update state if there are changes
      if (Object.keys(stateUpdates).length > 0) {
        updateState(stateUpdates)
      }

      // Calculate relative audio and intensity if calibrated
      if (isCalibrated && calibrationLevel !== null) {
        const relative = enhancedLevel - calibrationLevel

        // Map to intensity (0-100) for UI display using enhanced level
        const intensity = Math.max(
          0,
          Math.min(100, (enhancedLevel / (calibrationLevel * 2)) * 100)
        )

        // Batch intensity updates
        const intensityUpdates = {}
        if (Math.abs(relativeAudio - relative) > 0.01) {
          intensityUpdates.relativeAudio = relative
        }
        if (Math.abs(audioIntensity - intensity) > 2) {
          // Use 2% threshold for intensity to reduce updates
          intensityUpdates.audioIntensity = intensity
        }

        // Only update state if there are changes
        if (Object.keys(intensityUpdates).length > 0) {
          if (intensityUpdates.relativeAudio !== undefined) {
            setRelativeAudio(intensityUpdates.relativeAudio)
          }
          if (intensityUpdates.audioIntensity !== undefined) {
            setAudioIntensity(intensityUpdates.audioIntensity)
          }
        }

        if (onAudioChange) {
          onAudioChange({
            audioDetected: isAudioDetected,
            currentLevel: enhancedLevel, // Use enhanced level for spiky response
            relativeLevel: relative,
            intensity,
            isCalibrated: true,
            isSpike, // Pass spike information
            smoothedLevel: newSmoothedLevel, // Pass smoothed level for comparison
            contentType: analysis.contentType,
            voiceLevel: analysis.voiceLevel,
            musicLevel: analysis.musicLevel,
            noiseLevel: analysis.noiseLevel,
          })
        }
      } else {
        // Not calibrated - use enhanced level for more reactive response
        const intensity = enhancedLevel * 100

        // Batch intensity updates for uncalibrated case
        if (Math.abs(audioIntensity - intensity) > 2) {
          // Use 2% threshold for intensity to reduce updates
          setAudioIntensity(intensity)
        }

        if (onAudioChange) {
          onAudioChange({
            audioDetected: isAudioDetected,
            currentLevel: enhancedLevel, // Use enhanced level
            relativeLevel: 0,
            intensity,
            isCalibrated: false,
            isSpike, // Pass spike information
            smoothedLevel: newSmoothedLevel, // Pass smoothed level
            contentType: analysis.contentType,
            voiceLevel: analysis.voiceLevel,
            musicLevel: analysis.musicLevel,
            noiseLevel: analysis.noiseLevel,
          })
        }
      }

      animationFrameRef.current = requestAnimationFrame(processAudioFrame)
    }

    processAudioFrame()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [
    isInitialized,
    analyzeAudioContent,
    audioThreshold,
    isCalibrated,
    calibrationLevel,
    onAudioChange,
    sensitivity,
    updateState,
    audioDetected,
    currentAudioLevel,
    smoothedAudioLevel,
    lastAudioLevel,
    relativeAudio,
    audioIntensity,
  ])

  // Calibration function - captures current audio level as baseline
  const calibrateAudio = useCallback(() => {
    if (currentAudioLevel > 0) {
      setCalibrationLevel(currentAudioLevel)
      setIsCalibrated(true)
      console.log('Audio level calibrated at:', currentAudioLevel)
      return true
    }
    return false
  }, [currentAudioLevel])

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setIsCalibrated(false)
    setCalibrationLevel(null)
    setRelativeAudio(0)
    setAudioIntensity(0)
    setSmoothedAudioLevel(0)
    setLastAudioLevel(0)
  }, [])

  return {
    isInitialized,
    audioDetected,
    isCalibrated,
    currentAudioLevel,
    relativeAudio,
    audioIntensity,
    calibrateAudio,
    resetCalibration,
    calibrationLevel,
  }
}
