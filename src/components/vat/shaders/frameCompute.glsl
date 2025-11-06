// Compute shader for calculating per-instance frame values
// Each pixel in the output texture represents one instance's frame value

uniform float uTime;
uniform float uVatSpeed;
uniform float uFrames;
uniform float uFps;
uniform float uFrameRatio; // -1 if not set, otherwise use this value
uniform sampler2D uInstanceSeeds; // Texture containing instance seeds (optional)
uniform float uHasInstanceSeeds; // 1.0 if seeds texture exists, 0.0 otherwise
uniform sampler2D uPreviousFrame; // Previous frame texture (ping-pong)
uniform float uInstanceCount; // Total number of instances (for texture sampling)

// Per-instance state durations texture (RGBA = state0, state1, state2, state3)
uniform sampler2D uStateDurations;

varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    
    float instanceIndex = uv.x;
    
    float instanceSeed = 0.0;
    if (uHasInstanceSeeds > 0.5) {
        vec4 seedData = texture2D(uInstanceSeeds, uv);
        instanceSeed = seedData.r;
    } else {
        instanceSeed = fract(instanceIndex * 0.618033988749); // Golden ratio for better distribution
    }
    
    float frame = 0.0;
    
    if (uFrameRatio >= 0.0) {
        // Use fixed frame ratio if specified
        frame = clamp(uFrameRatio, 0.0, 1.0);
    } else {
        // Sample per-instance state durations from texture
        vec2 durationsUV = vec2((instanceIndex + 0.5) / uInstanceCount, 0.5);
        vec4 durations = texture2D(uStateDurations, durationsUV);
        float state0Duration = durations.r;
        float state1Duration = durations.g;
        float state2Duration = durations.b;
        float state3Duration = durations.a;
        
        // Calculate total cycle duration
        float totalCycleDuration = state0Duration + state1Duration + state2Duration + state3Duration;
        
        // Offset time by instance seed to create per-instance animation variation
        // This way each instance goes through the same states but at different times
        float seedOffset = instanceSeed * totalCycleDuration;
        float adjustedTime = uTime * uVatSpeed;// + seedOffset;
        
        // Get time within current cycle
        float cycleTime = mod(adjustedTime, totalCycleDuration);
        
        // Calculate state boundaries
        float state0End = state0Duration;
        float state1End = state0End + state1Duration;
        float state2End = state1End + state2Duration;
        float state3End = state2End + state3Duration;
        
        // State 0: Frame stays at 0
        if (cycleTime < state0End) {
            frame = 0.0;
        }
        // State 1: Frame animates from 0 to 1
        else if (cycleTime < state1End) {
            float stateTime = cycleTime - state0End;
            float stateProgress = stateTime / state1Duration;
            frame = clamp(stateProgress, 0.0, 1.0);
        }
        // State 2: Frame stays at 1
        else if (cycleTime < state2End) {
            frame = 1.0;
        }
        // State 3: Frame animates from 1 to 0
        else {
            float stateTime = cycleTime - state2End;
            float stateProgress = stateTime / state3Duration;
            frame = clamp(1.0 - stateProgress, 0.0, 1.0);
        }
    }
    
    // Get previous frame value from ping-pong texture
    vec2 frameUV = vec2((instanceIndex + 0.5) / uInstanceCount, 0.5);
    float previousFrame = texture2D(uPreviousFrame, frameUV).r;
    
    // Output: current frame in red channel, previous frame in green channel
    // You can use previousFrame for interpolation, velocity calculation, etc.
    gl_FragColor = vec4(frame, previousFrame, 0.0, 1.0);
}

