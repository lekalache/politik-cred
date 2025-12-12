"use client"

import { Suspense, useState, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { HeroFallback } from './hero-fallback'

// French flag colors - brighter blue for better visibility
const BLUE = new THREE.Color('#3B82F6')
const WHITE = new THREE.Color('#F0F0F0')
const RED = new THREE.Color('#DC2626')

interface SeatData {
  position: THREE.Vector3
  baseY: number
  color: THREE.Color
  scale: number
}

function generateSeats(): SeatData[] {
  const seats: SeatData[] = []
  const rows = 8

  for (let row = 0; row < rows; row++) {
    const radius = 3 + row * 0.9
    const numSeats = 25 + row * 8
    const angleSpan = Math.PI * 0.75
    const startAngle = Math.PI * 0.125

    for (let i = 0; i < numSeats; i++) {
      const angle = startAngle + (i / (numSeats - 1)) * angleSpan
      const x = Math.cos(angle) * radius
      const z = -Math.sin(angle) * radius
      const y = row * 0.15

      // Color based on position (left=blue, center=white, right=red)
      const normalizedAngle = (angle - startAngle) / angleSpan
      let color: THREE.Color
      if (normalizedAngle < 0.33) {
        color = BLUE.clone()
      } else if (normalizedAngle < 0.66) {
        color = WHITE.clone()
      } else {
        color = RED.clone()
      }

      seats.push({
        position: new THREE.Vector3(x, y, z),
        baseY: y,
        color,
        scale: 0.15
      })
    }
  }
  return seats
}

function Hemicycle() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const seats = useRef(generateSeats()).current
  const { camera, size } = useThree()

  // Track mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / size.width) * 2 - 1
      mouseRef.current.y = -(e.clientY / size.height) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [size])

  // Initialize seats
  useEffect(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current
    const dummy = new THREE.Object3D()

    seats.forEach((seat, i) => {
      dummy.position.copy(seat.position)
      dummy.scale.setScalar(seat.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, seat.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [seats])

  // Animate on each frame
  useFrame(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current
    const dummy = new THREE.Object3D()

    // Get mouse world position
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mouseRef.current.x, mouseRef.current.y), camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const mouseWorld = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, mouseWorld)

    seats.forEach((seat, i) => {
      const dx = mouseWorld.x - seat.position.x
      const dz = mouseWorld.z - seat.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      // Seats rise when mouse is near
      const influence = Math.max(0, 1 - dist / 3)
      const targetY = seat.baseY + influence * 0.8

      // Smooth lerp
      seat.position.y += (targetY - seat.position.y) * 0.1

      dummy.position.copy(seat.position)
      dummy.scale.setScalar(seat.scale * (1 + influence * 0.3))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, seats.length]}>
      <boxGeometry args={[0.25, 0.35, 0.25]} />
      <meshStandardMaterial metalness={0.5} roughness={0.3} />
    </instancedMesh>
  )
}

function Scene({ isDark }: { isDark: boolean }) {
  const bgColor = isDark ? '#080810' : '#e8e8f0'
  const floorColor = isDark ? '#0a0a12' : '#d0d0d8'
  const ambientIntensity = isDark ? 0.6 : 0.8

  return (
    <>
      <color attach="background" args={[bgColor]} />

      {/* Camera */}
      <perspectiveCamera position={[0, 8, 10]} fov={45} />

      {/* Lighting */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[5, 10, 5]} intensity={isDark ? 1.2 : 1.5} />
      <pointLight position={[-6, 6, 2]} intensity={0.8} color="#3B82F6" />
      <pointLight position={[6, 6, 2]} intensity={0.8} color="#DC2626" />

      {/* Hemicycle */}
      <Hemicycle />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
    </>
  )
}

export function ParliamentScene({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setMounted(true)

    // Check for mobile or no WebGL
    const isMobile = window.innerWidth < 768
    let hasWebGL = true
    try {
      const canvas = document.createElement('canvas')
      hasWebGL = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch {
      hasWebGL = false
    }

    setUseFallback(isMobile || !hasWebGL)

    // Detect theme
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark')
      setIsDark(isDarkMode)
    }
    checkTheme()

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return <div className={`absolute inset-0 bg-[#080810] dark:bg-[#080810] bg-[#e8e8f0] ${className}`} />
  }

  if (useFallback) {
    return <HeroFallback className={className} />
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 8, 10], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <Scene isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  )
}
