import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

// Compact 3D holographic face icon for header
const FaceModel = ({ color }: { color: string }) => {
  const { scene } = useGLTF("/models/avatar.glb");
  const materialRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.time += delta;

      // Subtle glitch effect
      const baseGlitch = Math.random() > 0.98 ? Math.random() * 0.2 : 0;
      materialRef.current.glitch = baseGlitch;

      // Update color from theme
      materialRef.current.uniforms.color.value.set(color);
      materialRef.current.uniforms.rimColor.value
        .set(color)
        .offsetHSL(0.1, 0, 0.2);
    }

    if (groupRef.current) {
      // Gentle floating animation
      const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      groupRef.current.position.y = floatY;
    }
  });

  // Create holographic shader material
  useMemo(() => {
    const material = new (THREE.ShaderMaterial as any)({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(color) },
        rimColor: { value: new THREE.Color(color).offsetHSL(0.1, 0, 0.2) },
        glitch: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        uniform float time;
        uniform float glitch;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;

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
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        uniform float time;
        uniform vec3 color;
        uniform vec3 rimColor;
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 simpleView = vec3(0.0, 0.0, 1.0);
          float fresnel = pow(1.0 - abs(dot(simpleView, normal)), 2.0);

          float scanline = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;
          float scanbeam = smoothstep(0.4, 0.6, sin(vPosition.y * 2.0 - time * 2.0));

          vec3 finalColor = color * scanline;
          finalColor += rimColor * fresnel * 2.0; 
          finalColor += rimColor * scanbeam * 0.5; 

          float alpha = fresnel + 0.1 + (scanbeam * 0.3);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    materialRef.current = material;

    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
      }
    });
  }, [scene]);

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={scene} scale={1.5} position={[0, -0.4, 0]} />
      </Center>
    </group>
  );
};

// Main icon component
const HolographicFaceIcon: React.FC<{
  themeColor: string; // Hex color from active theme
}> = ({ themeColor }) => {
  return (
    <div className="w-full h-full bg-transparent">
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <React.Suspense fallback={null}>
          <FaceModel color={themeColor} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default HolographicFaceIcon;
