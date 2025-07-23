uniform sampler2D uCharactersTexture;
uniform float uGranularity;
uniform float uCharactersLimit;
uniform bool uFillPixels;
uniform vec3 uColor;
uniform bool uOverwriteColor;
uniform bool uGreyscale;
uniform bool uInvert;
uniform bool uMatrix;
uniform float uTime;
uniform vec3 uBackground;

// Face tracking depth uniforms
uniform bool uFaceDepthMode;
uniform float uNoseDepth;
uniform float uForeheadDepth;
uniform float uCheeksDepth;
uniform float uChinDepth;
uniform float uGranularityMin;
uniform float uGranularityMax;

// Enhanced face region depth uniforms for detailed mapping
uniform float uNoseTipDepth;
uniform float uLeftCheekDepth;
uniform float uRightCheekDepth;
uniform float uLeftEyeDepth;
uniform float uRightEyeDepth;
uniform float uMouthDepth;
uniform float uLeftTempleDepth;
uniform float uRightTempleDepth;

// Face landmark mode uniforms (for face filter mode)
uniform bool uFaceLandmarkMode;
uniform float uLandmarkCount;
uniform sampler2D uDepthTexture;

// Sample depth from the texture
float sampleDepthTexture(vec2 uv) {
  if (!uFaceLandmarkMode) return 0.5;
  
  // Sample the depth texture directly using UV coordinates
  float depthValue = texture2D(uDepthTexture, uv).r;
  return depthValue;
}

vec3 blendNormal(vec3 base, vec3 blend) {
	return blend;
}

vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
	return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}


float grayscale(vec3 c) {
    return c.x * 0.299 + c.y * 0.587 + c.z * 0.114;
}

float random(in float x) {
  return fract(sin(x)*1e4);
}

// Calculate granularity based on position for face depth mode
float calculateFaceGranularity(vec2 uv) {
  if (!uFaceDepthMode) {
    return uGranularity;
  }
  
  // Map UV coordinates to face regions with more accurate face geometry
  // Face is roughly centered but we account for typical face proportions
  vec2 center = vec2(0.5, 0.45); // Slightly higher center for better face mapping
  vec2 facePos = (uv - center) * 2.2; // Slightly larger mapping for full face coverage
  
  float x = facePos.x;
  float y = facePos.y;
  
  // Define more accurate face region boundaries based on actual face geometry
  
  // Nose tip: central area with strong falloff
  float noseTipWeight = exp(-((x*x + (y-0.1)*(y-0.1)) * 6.0));
  
  // Forehead: upper area with more natural curve
  float foreheadWeight = max(0.0, (-y - 0.3) * 2.5) * exp(-(x*x * 1.8));
  
  // Left and right cheeks: separate mapping for asymmetry
  float leftCheekWeight = max(0.0, (x + 0.4) * 3.0) * exp(-((y*y + (x+0.6)*(x+0.6)) * 1.5)) * step(-0.8, x);
  float rightCheekWeight = max(0.0, (-x + 0.4) * 3.0) * exp(-((y*y + (x-0.6)*(x-0.6)) * 1.5)) * step(x, 0.8);
  
  // Eyes: positioned above nose, left and right
  float leftEyeWeight = exp(-((x+0.25)*(x+0.25)*8.0 + (y+0.15)*(y+0.15)*12.0));
  float rightEyeWeight = exp(-((x-0.25)*(x-0.25)*8.0 + (y+0.15)*(y+0.15)*12.0));
  
  // Mouth: below nose center
  float mouthWeight = exp(-(x*x*4.0 + (y-0.35)*(y-0.35)*8.0));
  
  // Chin: lower area with natural curve
  float chinWeight = max(0.0, (y - 0.3) * 2.2) * exp(-(x*x * 1.5));
  
  // Temples: side areas above cheeks
  float leftTempleWeight = max(0.0, (x + 0.6) * 2.0) * max(0.0, (-y - 0.1) * 1.5) * exp(-((x+0.7)*(x+0.7) + (y+0.2)*(y+0.2)) * 2.0);
  float rightTempleWeight = max(0.0, (-x + 0.6) * 2.0) * max(0.0, (-y - 0.1) * 1.5) * exp(-((x-0.7)*(x-0.7) + (y+0.2)*(y+0.2)) * 2.0);
  
  // Normalize weights for smooth blending
  float totalWeight = noseTipWeight + foreheadWeight + leftCheekWeight + rightCheekWeight + 
                     leftEyeWeight + rightEyeWeight + mouthWeight + chinWeight + 
                     leftTempleWeight + rightTempleWeight;
  
  if (totalWeight < 0.001) {
    return uGranularity; // Fallback to default for areas outside face
  }
  
  // Normalize individual weights
  noseTipWeight /= totalWeight;
  foreheadWeight /= totalWeight;
  leftCheekWeight /= totalWeight;
  rightCheekWeight /= totalWeight;
  leftEyeWeight /= totalWeight;
  rightEyeWeight /= totalWeight;
  mouthWeight /= totalWeight;
  chinWeight /= totalWeight;
  leftTempleWeight /= totalWeight;
  rightTempleWeight /= totalWeight;
  
  // Map depth values to granularity with enhanced depth sensitivity
  // Closer depth (higher z in MediaPipe) = higher granularity (smaller characters)
  float depthScale = 8.0; // Increased sensitivity for more dramatic depth effects
  float depthOffset = 0.15; // Better baseline offset
  
  float noseTipGranularity = mix(uGranularityMin, uGranularityMax, (uNoseTipDepth + depthOffset) * depthScale);
  float foreheadGranularity = mix(uGranularityMin, uGranularityMax, (uForeheadDepth + depthOffset) * depthScale);
  float leftCheekGranularity = mix(uGranularityMin, uGranularityMax, (uLeftCheekDepth + depthOffset) * depthScale);
  float rightCheekGranularity = mix(uGranularityMin, uGranularityMax, (uRightCheekDepth + depthOffset) * depthScale);
  float leftEyeGranularity = mix(uGranularityMin, uGranularityMax, (uLeftEyeDepth + depthOffset) * depthScale);
  float rightEyeGranularity = mix(uGranularityMin, uGranularityMax, (uRightEyeDepth + depthOffset) * depthScale);
  float mouthGranularity = mix(uGranularityMin, uGranularityMax, (uMouthDepth + depthOffset) * depthScale);
  float chinGranularity = mix(uGranularityMin, uGranularityMax, (uChinDepth + depthOffset) * depthScale);
  float leftTempleGranularity = mix(uGranularityMin, uGranularityMax, (uLeftTempleDepth + depthOffset) * depthScale);
  float rightTempleGranularity = mix(uGranularityMin, uGranularityMax, (uRightTempleDepth + depthOffset) * depthScale);
  
  // Weighted blend of all regions for smooth transitions
  float finalGranularity = 
    noseTipGranularity * noseTipWeight +
    foreheadGranularity * foreheadWeight +
    leftCheekGranularity * leftCheekWeight +
    rightCheekGranularity * rightCheekWeight +
    leftEyeGranularity * leftEyeWeight +
    rightEyeGranularity * rightEyeWeight +
    mouthGranularity * mouthWeight +
    chinGranularity * chinWeight +
    leftTempleGranularity * leftTempleWeight +
    rightTempleGranularity * rightTempleWeight;
    
  return clamp(finalGranularity, uGranularityMin, uGranularityMax);
}

// Calculate granularity for face landmark mode (face filter mode)
// This mode uses direct landmark data for per-pixel control
float calculateFaceLandmarkGranularity(vec2 uv) {
  if (!uFaceLandmarkMode || uLandmarkCount < 100.0) {
    return uGranularity;
  }
  
  // Sample the actual depth texture created from face landmarks
  float depthValue = sampleDepthTexture(uv);
  
  // Convert depth to granularity
  // Closer landmarks (smaller depth) = smaller characters (higher granularity)
  // Further landmarks (larger depth) = larger characters (lower granularity)
  
  // Invert depth so closer = higher granularity
  float invertedDepth = 1.0 - depthValue;
  
  // Map depth to granularity range with dramatic variation
  float minGran = uGranularityMin;
  float maxGran = uGranularityMax;
  
  // Create more dramatic scaling - amplify the depth differences
  float scaledDepth = pow(invertedDepth, 0.7); // Gamma correction for better contrast
  
  // Map to granularity range
  float mappedGranularity = minGran + scaledDepth * (maxGran - minGran);
  
  // Add some additional contrast in the face region
  // Create a face mask to enhance the effect in the central face area
  vec2 center = vec2(0.5, 0.45);
  float distanceFromCenter = length(uv - center);
  float faceMask = smoothstep(0.4, 0.2, distanceFromCenter); // 1.0 in center, 0.0 at edges
  
  // Enhance granularity variation in the face region
  if (faceMask > 0.1) {
    float enhancement = faceMask * 0.5; // Scale enhancement
    mappedGranularity = mappedGranularity + enhancement * (maxGran - minGran) * scaledDepth;
  }
  
  return clamp(mappedGranularity, minGran, maxGran);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 size = vec2(16.);

    // Calculate granularity based on active mode
    float currentGranularity;
    if (uFaceLandmarkMode) {
      // Use face landmark mode for direct per-pixel control (face filter mode)
      currentGranularity = calculateFaceLandmarkGranularity(uv);
    } else if (uFaceDepthMode) {
      // Use face depth mode (regional depth mapping)
      currentGranularity = calculateFaceGranularity(uv);
    } else {
      // Use standard granularity
      currentGranularity = uGranularity;
    }

    // pixelate the input texture
    vec2 division = resolution / currentGranularity;
    vec2 d = 1. / division;
    vec2 pixelizedUV = d * (floor(uv / d) + 0.5);

    if(uMatrix) {
        float noise = random(pixelizedUV.x);
        pixelizedUV = mod(pixelizedUV + vec2(0., uTime * abs(noise) ),1.);
    }

    vec4 pixelizedColor = texture2D(inputBuffer, pixelizedUV);
    float grayColor = grayscale(pixelizedColor.rgb);

    if(uInvert) {
        grayColor = 1. - grayColor;
    }

    // get the character index
    float charIndex = floor(grayColor * (uCharactersLimit -  1.));
    float charX = mod(charIndex, size.x);
    float charY = floor(charIndex / size.y);

    // fit with the grid
    vec2 charUV = mod(uv * (division/size), 1./size);

    // start to top/left
    charUV -= vec2(0.,1./size);

    // offset to the character
    vec2 offset = vec2(charX, -charY) / size;
    charUV += offset;

    vec4 ascii = texture2D(uCharactersTexture, charUV);

    vec4 color = ascii;


    // else {
    //     color = pixelizedColor * ascii.r;
    // }

    // if(uGreyscale) {
    //     color.rgb = vec3(grayscale(pixelizedColor.rgb));
    // }

    if(uFillPixels) {
        if(uOverwriteColor) {
            color.rgb = uColor * ceil(pixelizedColor.rgb);

            if(uGreyscale) {
                color.rgb *= grayscale(pixelizedColor.rgb);
            }
        } else if (uGreyscale) {
            color.rgb = vec3(grayscale(pixelizedColor.rgb));
        } else {
            color.rgb = pixelizedColor.rgb;
        }



        color.rgb += vec3(ascii.r);
        color.a = pixelizedColor.a;
    } else if(uOverwriteColor) {
        color.rgb = uColor * ascii.r;
        color.a = pixelizedColor.a;

        if(uGreyscale) {
            color.rgb *= grayscale(pixelizedColor.rgb);
        }
    } else if (uGreyscale) {
        color.rgb = vec3(grayscale(pixelizedColor.rgb)) * ascii.r;
    } else {
        color = pixelizedColor * ascii.r;
    }
    
    if(color.rgb == vec3(0.)) {
        color.a = 0.;
    }


    // outputColor = vec4(uBackground, 1.) + color;
    // if(outputColor.rgb == vec3(0.)) {
    //     outputColor.a = 0.;
    // }

    float alpha = uBackground == vec3(0.) ? color.a : 1.;
    outputColor = vec4(blendNormal(uBackground, color.rgb, color.a), alpha);
}