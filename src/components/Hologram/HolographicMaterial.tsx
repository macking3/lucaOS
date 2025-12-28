import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

const HolographicMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color("#00ffff"),
    rimColor: new THREE.Color("#8800ff"),
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    glitch: 0,
  },
  // VERTEX SHADER
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float time;
    uniform float glitch;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;

      // Glitch Displacement
      vec3 pos = position;
      if (glitch > 0.0) {
        float noise = sin(time * 50.0 + position.y * 10.0);
        if (noise > 0.9) {
          pos.x += sin(time * 100.0) * 0.1 * glitch;
        }
      }
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // FRAGMENT SHADER
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float time;
    uniform vec3 color;
    uniform vec3 rimColor;
    
    void main() {
      // 1. Fresnel Effect (Rim Light)
      vec3 normal = normalize(vNormal);
      vec3 simpleView = vec3(0.0, 0.0, 1.0);
      float fresnel = pow(1.0 - abs(dot(simpleView, normal)), 2.0);

      // 2. Scanlines
      float scanline = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;
      float scanbeam = smoothstep(0.4, 0.6, sin(vPosition.y * 2.0 - time * 2.0));

      // 3. Grid Pattern
      float grid = step(0.95, mod(vUv.x * 20.0, 1.0)) + step(0.95, mod(vUv.y * 20.0, 1.0));

      // Compose
      vec3 finalColor = color * scanline;
      finalColor += rimColor * fresnel * 2.0; // Strong Rim
      finalColor += vec3(1.0) * grid * 0.2; // Weak Grid
      finalColor += rimColor * scanbeam * 0.5; // Moving heavy beam

      // Transparency (Alpha)
      float alpha = fresnel + 0.2 + (scanbeam * 0.5);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ HolographicMaterial });

export default HolographicMaterial;
