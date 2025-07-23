/**
 * Device detection utilities
 */

/**
 * Detects if the current device is a mobile phone
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent || navigator.vendor || window.opera

  // Check for mobile user agents
  const mobileRegex =
    /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i

  // Also check screen size as fallback
  const smallScreen = window.innerWidth <= 768

  return mobileRegex.test(userAgent) || smallScreen
}

/**
 * Detects if the current device is a tablet
 */
export const isTablet = () => {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent || navigator.vendor || window.opera

  // Check for tablet user agents
  const tabletRegex =
    /ipad|android(?!.*mobile)|tablet|kindle|playbook|nook|gt-|sm-t|tab/i

  // Also check screen size for tablet-like devices
  const tabletScreen = window.innerWidth > 768 && window.innerWidth <= 1024

  return tabletRegex.test(userAgent) || tabletScreen
}

/**
 * Detects if the current device is mobile or tablet (touch device)
 */
export const isMobileOrTablet = () => {
  return isMobile() || isTablet()
}

/**
 * Detects if the device supports camera switching
 */
export const supportsCameraSwitch = () => {
  return (
    isMobileOrTablet() &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  )
}
