import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import "./HolographicMaterial";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      holographicMaterial: any;
    }
  }
}

// Helper component to apply material to the loaded scene
const SceneWithMaterial = ({
  color,
  audioLevel,
  onClick,
  onDragStart,
}: {
  color: string;
  audioLevel: number;
  onClick?: () => void;
  onDragStart?: (e: any) => void;
}) => {
  const { scene } = useGLTF("/models/avatar.glb");
  const materialRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Smooth audio level for less jittery animation
  const smoothedLevel = useRef(0);

  useFrame((state, delta) => {
    // Larpt smoothing
    smoothedLevel.current += (audioLevel - smoothedLevel.current) * 0.1;
    const level = smoothedLevel.current; // 0 to 255 range usually

    if (materialRef.current) {
      materialRef.current.time += delta;

      // AUDIO REACTIVE GLITCH
      // Base random glitch (rare) + Audio driven glitch (frequent when loud)
      const baseGlitch = Math.random() > 0.98 ? Math.random() * 0.3 : 0;
      const audioGlitch = (level / 255) * 0.5; // Up to 0.5 intensity
      materialRef.current.glitch = baseGlitch + audioGlitch;

      // AUDIO REACTIVE COLOR/GLOW
      // Boost brightness on rimColor when loud
      const intensity = 1.0 + (level / 255) * 3.0; // Up to 4x brightness

      materialRef.current.uniforms.color.value.set(color);
      materialRef.current.uniforms.rimColor.value
        .set(color)
        .offsetHSL(0.1, 0, 0.2)
        .multiplyScalar(intensity); // Glow boost
    }

    if (groupRef.current) {
      // Gentle floating (Idle)
      const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 - 0.2;

      // Audio Pulse (Active)
      // Scale slightly up on beat
      const scalePulse = 1.2 + (level / 255) * 0.1; // Base scale 1.2 -> 1.3

      groupRef.current.position.y = floatY;
      groupRef.current.scale.setScalar(scalePulse);
    }
  });

  // Replace all materials in the scene with our custom shader
  // We do this memoized to avoid re-traversing every frame
  React.useMemo(() => {
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
      side: THREE.FrontSide, // Render only front faces to avoid "double mesh" look
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Link the ref to this material instance so we can animate it
    materialRef.current = material;

    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
      }
    });
  }, [scene]); // Re-create only if scene changes, color handled in useFrame

  return (
    <group ref={groupRef}>
      <Center>
        <Center>
          <primitive
            object={scene}
            scale={1.0}
            position={[0, -0.4, 0]}
            onPointerDown={(e: any) => {
              // Pass native event to parent drag handler
              if (onDragStart && e.nativeEvent) {
                onDragStart(e.nativeEvent);
              }
            }}
            onClick={(e: any) => {
              e.stopPropagation();
              onClick?.();
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          />
        </Center>
      </Center>
    </group>
  );
};

const HologramScene: React.FC<{
  color?: string;
  audioLevel?: number;
  onClick?: () => void;
  onDragStart?: (e: any) => void;
}> = ({ color = "#00ffff", audioLevel = 0, onClick, onDragStart }) => {
  return (
    <div className="w-full h-full bg-transparent">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <React.Suspense fallback={null}>
          <SceneWithMaterial
            color={color}
            audioLevel={audioLevel}
            onClick={onClick}
            onDragStart={onDragStart}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default HologramScene;
