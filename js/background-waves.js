/**
 * Interactive Dotted World Map Background - Generated from Code
 * Features: Procedural world map generation, dotted grid, interactive hubs, and mouse reactivity.
 */

const mapVertexShader = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = (position + 1.0) * 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const mapFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform sampler2D mapTexture;
uniform vec3 dotColor;
uniform vec3 hubColor;
uniform vec2 mousePos;
uniform float mouseRadius;
uniform float dotDensity;
uniform float dotSize;

varying vec2 vUv;

// Improved Perlin-like noise using sine waves
float noise(vec2 p) {
    return sin(p.x * 12.9898) * sin(p.y * 78.233) * 43758.5453;
}

// Smooth interpolation
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation
    
    float n00 = noise(i + vec2(0.0, 0.0));
    float n10 = noise(i + vec2(1.0, 0.0));
    float n01 = noise(i + vec2(0.0, 1.0));
    float n11 = noise(i + vec2(1.0, 1.0));
    
    float nx0 = mix(n00, n10, f.x);
    float nx1 = mix(n01, n11, f.x);
    return mix(nx0, nx1, f.y);
}

// Fractional Brownian Motion for terrain variety
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for(int i = 0; i < 6; i++) {
        value += amplitude * smoothNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return fract(value);
}

// Procedural world map generation
float generateLandMass(vec2 uv) {
    // Create multiple noise octaves for continents
    float terrain = fbm(uv * 2.0);
    terrain += fbm(uv * 4.0 + vec2(100.0)) * 0.5;
    terrain += fbm(uv * 8.0 + vec2(200.0)) * 0.25;
    
    terrain = fract(terrain);
    
    // Apply threshold to create land masses
    // Adjusted for good continent coverage (~30% land)
    float landThreshold = 0.42;
    float isLand = step(landThreshold, terrain);
    
    return isLand;
}

// Classic Bayer 4x4 for dithering
float bayer4x4(vec2 uv) {
    vec2 p = floor(mod(uv, 4.0));
    float x = p.x; float y = p.y;
    if (y == 0.0) {
        if (x == 0.0) return 0.0/16.0; if (x == 1.0) return 8.0/16.0; if (x == 2.0) return 2.0/16.0; return 10.0/16.0;
    } else if (y == 1.0) {
        if (x == 0.0) return 12.0/16.0; if (x == 1.0) return 4.0/16.0; if (x == 2.0) return 14.0/16.0; return 6.0/16.0;
    } else if (y == 2.0) {
        if (x == 0.0) return 3.0/16.0; if (x == 1.0) return 11.0/16.0; if (x == 2.0) return 1.0/16.0; return 9.0/16.0;
    } else {
        if (x == 0.0) return 15.0/16.0; if (x == 1.0) return 7.0/16.0; if (x == 2.0) return 13.0/16.0; return 5.0/16.0;
    }
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 aspectUv = vUv;
    
    // Grid calculation
    vec2 gridCount = vec2(dotDensity * (resolution.x / resolution.y), dotDensity);
    vec2 gridUv = fract(vUv * gridCount);
    vec2 gridId = floor(vUv * gridCount) / gridCount;
    
    // Generate land mass from code
    float isLand = generateLandMass(gridId);
    
    // Distance to dot center
    float dist = length(gridUv - 0.5);
    float dotCircle = 1.0 - smoothstep(dotSize, dotSize + 0.1, dist);
    
    // Color interaction
    vec2 mPosNorm = mousePos / resolution;
    float mouseDist = length(vUv - mPosNorm);
    float mouseEffect = 1.0 - smoothstep(0.0, mouseRadius, mouseDist);
    
    // Final dot visibility
    float opacity = dotCircle * isLand;
    vec3 finalDotColor = mix(dotColor, vec3(1.0), mouseEffect * 0.5);
    
    // Pulsing Hubs at major cities (equirectangular coordinates)
    float hub1 = 1.0 - smoothstep(0.0, 0.05, length(vUv - vec2(0.18, 0.72))); // London
    float hub2 = 1.0 - smoothstep(0.0, 0.05, length(vUv - vec2(0.78, 0.35))); // Tokyo
    float hub3 = 1.0 - smoothstep(0.0, 0.05, length(vUv - vec2(0.58, 0.52))); // Dubai
    float hub4 = 1.0 - smoothstep(0.0, 0.05, length(vUv - vec2(0.25, 0.45))); // New York
    float hub5 = 1.0 - smoothstep(0.0, 0.05, length(vUv - vec2(0.52, 0.25))); // Sydney
    
    float pulse = (sin(time * 3.0) * 0.5 + 0.5) * 0.6;
    float hubs = (hub1 + hub2 + hub3 + hub4 + hub5) * pulse;
    
    vec3 col = mix(vec3(0.02, 0.04, 0.08), finalDotColor, opacity);
    col += hubColor * hubs * isLand;
    
    // Dither
    float threshold = bayer4x4(gl_FragCoord.xy) - 0.5;
    col += threshold * 0.02;

    gl_FragColor = vec4(col, 1.0);
}
`;

class BackgroundWaves { // Kept name for compatibility
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.gl = this.canvas.getContext('webgl');
    if (!this.gl) return;

    this.time = 0;
    this.mouse = { x: 0, y: 0 };
    this.settings = {
      dotColor: [0.3, 0.5, 1.0], // Bright Blue
      hubColor: [0.0, 0.8, 1.0], // Cyan
      dotDensity: 120.0,
      dotSize: 0.35,
      mouseRadius: 0.2
    };

    this.init();
    this.loadTexture();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

    this.animate();
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  loadTexture() {
    // World map is now generated procedurally from code - no external texture needed
    console.log("World Map Generated Procedurally");
  }

  init() {
    const vs = this.createShader(this.gl, this.gl.VERTEX_SHADER, mapVertexShader);
    const fs = this.createShader(this.gl, this.gl.FRAGMENT_SHADER, mapFragmentShader);

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(this.gl.getProgramInfoLog(this.program));
      return;
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    this.positionLoc = this.gl.getAttribLocation(this.program, 'position');
    this.resolutionLoc = this.gl.getUniformLocation(this.program, 'resolution');
    this.timeLoc = this.gl.getUniformLocation(this.program, 'time');
    this.mousePosLoc = this.gl.getUniformLocation(this.program, 'mousePos');
    this.dotColorLoc = this.gl.getUniformLocation(this.program, 'dotColor');
    this.hubColorLoc = this.gl.getUniformLocation(this.program, 'hubColor');
    this.dotDensityLoc = this.gl.getUniformLocation(this.program, 'dotDensity');
    this.dotSizeLoc = this.gl.getUniformLocation(this.program, 'dotSize');
    this.mouseRadiusLoc = this.gl.getUniformLocation(this.program, 'mouseRadius');
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  handleMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = window.innerHeight - e.clientY; // Flip Y for WebGL
  }

  animate(t) {
    this.time = t * 0.001 || 0;

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.useProgram(this.program);

    this.gl.enableVertexAttribArray(this.positionLoc);
    this.gl.vertexAttribPointer(this.positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.uniform2f(this.resolutionLoc, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.timeLoc, this.time);
    this.gl.uniform2f(this.mousePosLoc, this.mouse.x, this.mouse.y);
    this.gl.uniform3fv(this.dotColorLoc, this.settings.dotColor);
    this.gl.uniform3fv(this.hubColorLoc, this.settings.hubColor);
    this.gl.uniform1f(this.dotDensityLoc, this.settings.dotDensity);
    this.gl.uniform1f(this.dotSizeLoc, this.settings.dotSize);
    this.gl.uniform1f(this.mouseRadiusLoc, this.settings.mouseRadius);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    requestAnimationFrame((t) => this.animate(t));
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BackgroundWaves('bg-canvas');
});
