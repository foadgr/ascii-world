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
  
  // Map UV coordinates to face regions
  // Assume face is roughly centered in the frame
  vec2 center = vec2(0.5, 0.5);
  vec2 facePos = (uv - center) * 2.0; // Normalize to [-1, 1] range
  
  float x = facePos.x;
  float y = facePos.y;
  
  // Define approximate face region boundaries
  // Nose: center area
  float noseWeight = exp(-((x*x + y*y) * 4.0)); // Strong falloff from center
  
  // Forehead: upper area
  float foreheadWeight = max(0.0, (-y - 0.2) * 2.0) * exp(-(x*x * 2.0));
  
  // Cheeks: side areas
  float cheekWeight = max(0.0, (abs(x) - 0.3) * 3.0) * exp(-((y*y + (abs(x)-0.5)*(abs(x)-0.5)) * 2.0));
  
  // Chin: lower area
  float chinWeight = max(0.0, (y - 0.2) * 2.0) * exp(-(x*x * 2.0));
  
  // Normalize weights
  float totalWeight = noseWeight + foreheadWeight + cheekWeight + chinWeight;
  if (totalWeight < 0.001) {
    return uGranularity; // Fallback to default
  }
  
  noseWeight /= totalWeight;
  foreheadWeight /= totalWeight;
  cheekWeight /= totalWeight;
  chinWeight /= totalWeight;
  
  // Map depth values to granularity
  // Closer depth (higher z) = higher granularity (smaller characters)
  float noseGranularity = mix(uGranularityMin, uGranularityMax, (uNoseDepth + 0.1) * 5.0);
  float foreheadGranularity = mix(uGranularityMin, uGranularityMax, (uForeheadDepth + 0.1) * 5.0);
  float cheekGranularity = mix(uGranularityMin, uGranularityMax, (uCheeksDepth + 0.1) * 5.0);
  float chinGranularity = mix(uGranularityMin, uGranularityMax, (uChinDepth + 0.1) * 5.0);
  
  // Blend granularities based on position weights
  float finalGranularity = 
    noseGranularity * noseWeight +
    foreheadGranularity * foreheadWeight +
    cheekGranularity * cheekWeight +
    chinGranularity * chinWeight;
    
  return clamp(finalGranularity, uGranularityMin, uGranularityMax);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 size = vec2(16.);

    // Calculate granularity (face depth mode or standard)
    float currentGranularity = calculateFaceGranularity(uv);

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