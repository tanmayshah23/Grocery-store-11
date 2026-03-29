import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    Float,
    MeshDistortMaterial,
    Environment,
    ContactShadows,
    Html
} from '@react-three/drei';
import * as THREE from 'three';

function QuantumPortal({ children, rotation }: { children: React.ReactNode, rotation: { x: number, y: number } }) {
    const group = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!group.current) return;

        // Smoothly interpolate to the target rotation from mouse
        const targetX = rotation.y * 0.4;
        const targetY = rotation.x * 0.4;

        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.1);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.1);
    });

    return (
        <group ref={group}>
            {/* The Central 3D Card Platform */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh scale={[4.5, 6, 0.1]}>
                    <boxGeometry />
                    <MeshDistortMaterial
                        color="#0a2a1a"
                        distort={0.1}
                        speed={2}
                        roughness={0.1}
                        metalness={0.8}
                        transparent
                        opacity={0.6}
                        envMapIntensity={2}
                    />
                </mesh>

                {/* The HTML Content (Our Login Form) */}
                <Html
                    transform
                    distanceFactor={5}
                    position={[0, 0, 0.06]}
                    occlude="blending"
                >
                    {children}
                </Html>
            </Float>
        </group>
    );
}

export function Portal3D({ children, rotation }: { children: React.ReactNode, rotation: { x: number, y: number } }) {
    return (
        <div className="absolute inset-0 w-full h-full bg-[#060f0b]">
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                <ambientLight intensity={0.2} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#2d8a6a" />

                <QuantumPortal rotation={rotation}>
                    {children}
                </QuantumPortal>

                <Environment preset="city" />
                <ContactShadows position={[0, -4.5, 0]} scale={20} blur={2} far={4.5} />
            </Canvas>

            {/* Deep Space Atmosphere Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#060f0b] via-transparent to-transparent opacity-60" />
        </div>
    );
}
