import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sparkles, Activity, ShieldCheck, Flame } from 'lucide-react';

// Scratch module-scope objects for efficient 3D render loop without GC
const _dummyObj = new THREE.Object3D();
const _targetColor = new THREE.Color();

/**
 * 3D Interactive WebGL Canvas for the Aurora Nexus Core
 */
function AuroraNexusCoreCanvas({
  pointerOffset,
}: {
  pointerOffset: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect software WebGL per threejs skill
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      setWebglSupported(false);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = Math.max(container.clientWidth, 280);
    const height = Math.max(container.clientHeight, 220);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x050505, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.075);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 5.2);
    camera.lookAt(0, 0, 0);

    // Studio Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3-Point Studio Lighting Rig with warm/cool contrast
    const hemiLight = new THREE.HemisphereLight(0xff4d4d, 0x090912, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xff3030, 2.8);
    keyLight.position.set(3.5, 4.0, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff6b4a, 3.4, 12);
    rimLight.position.set(-3.2, -2.0, 2.5);
    scene.add(rimLight);

    // Composite 3D Subject Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Glowing Crimson Plasma Nucleus
    const coreGeo = new THREE.IcosahedronGeometry(0.96, 3);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xff2424,
      emissive: 0x8b0000,
      emissiveIntensity: 1.45,
      roughness: 0.16,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);

    // 2. Outer Geodesic Neural Shell (Wireframe)
    const cageGeo = new THREE.IcosahedronGeometry(1.24, 1);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xff5252,
      emissive: 0xff3030,
      emissiveIntensity: 0.7,
      roughness: 0.45,
      metalness: 0.85,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    coreGroup.add(cageMesh);

    // 3, 4, 5. Concentric Gyroscopic Orbital Energy Rings
    const ring1Geo = new THREE.TorusGeometry(1.55, 0.022, 12, 64);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xff3030,
      emissive: 0xff3030,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.9,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.8;
    coreGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.82, 0.016, 12, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff4545,
      emissiveIntensity: 0.5,
      roughness: 0.45,
      metalness: 0.75,
      transparent: true,
      opacity: 0.65,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 3.2;
    ring2.rotation.x = -Math.PI / 5;
    coreGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(2.05, 0.012, 10, 64);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      emissive: 0xff3030,
      emissiveIntensity: 0.55,
      roughness: 0.7,
      metalness: 0.55,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.z = Math.PI / 4;
    ring3.rotation.x = Math.PI / 2.1;
    coreGroup.add(ring3);

    // 6. Synaptic Neural Connections
    const neuralNodeCount = 24;
    const nodePositions: THREE.Vector3[] = [];
    for (let i = 0; i < neuralNodeCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / neuralNodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.45 + (i % 3) * 0.22;
      nodePositions.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        )
      );
    }

    const lineCoords: number[] = [];
    for (let i = 0; i < neuralNodeCount; i++) {
      for (let j = i + 1; j < neuralNodeCount; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 1.4) {
          lineCoords.push(
            nodePositions[i].x,
            nodePositions[i].y,
            nodePositions[i].z,
            nodePositions[j].x,
            nodePositions[j].y,
            nodePositions[j].z
          );
        }
      }
    }
    const neuralLinesGeo = new THREE.BufferGeometry();
    neuralLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    const neuralLinesMat = new THREE.LineBasicMaterial({
      color: 0xff3030,
      transparent: true,
      opacity: 0.35,
    });
    const neuralLines = new THREE.LineSegments(neuralLinesGeo, neuralLinesMat);
    coreGroup.add(neuralLines);

    // 7. Instanced Orbiting Energy Particles
    const particleCount = 36;
    const particleGeo = new THREE.OctahedronGeometry(0.045, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff3030,
      emissiveIntensity: 1.15,
      roughness: 0.25,
      metalness: 0.6,
    });
    const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    particleInstanced.frustumCulled = false;

    const particleMeta = Array.from({ length: particleCount }, (_, i) => {
      const radius = 1.42 + (i % 5) * 0.28;
      const angle = (i / particleCount) * Math.PI * 2;
      const ySpread = ((i % 7) - 3) * 0.28;
      const scale = 0.85 + (i % 4) * 0.1;
      const speed = 0.35 + (i % 5) * 0.12;
      return { radius, angle, ySpread, scale, speed };
    });

    for (let i = 0; i < particleCount; i++) {
      const m = particleMeta[i];
      _dummyObj.position.set(
        Math.cos(m.angle) * m.radius,
        m.ySpread,
        Math.sin(m.angle) * m.radius
      );
      _dummyObj.scale.setScalar(m.scale);
      _dummyObj.updateMatrix();
      particleInstanced.setMatrixAt(i, _dummyObj.matrix);
      _targetColor.setHex(i % 3 === 0 ? 0xffffff : 0xff3030);
      particleInstanced.setColorAt(i, _targetColor);
    }
    particleInstanced.instanceMatrix.needsUpdate = true;
    if (particleInstanced.instanceColor) particleInstanced.instanceColor.needsUpdate = true;
    particleInstanced.computeBoundingSphere();
    coreGroup.add(particleInstanced);

    // Grounding Contact Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(1.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xff1a1a,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -2.1;
    scene.add(shadowDisc);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // Breathing core pulse
        const targetScale = 1 + Math.sin(elapsed * 2.2) * 0.035;
        coreMesh.scale.setScalar(targetScale);

        // Interactive pointer tilt & orbital rotations
        const targetRotX = pointerOffset.current.y * 0.38;
        const targetRotY = elapsed * 0.38 + pointerOffset.current.x * 0.55;

        coreGroup.rotation.x = THREE.MathUtils.damp(
          coreGroup.rotation.x,
          targetRotX,
          4,
          delta
        );
        coreGroup.rotation.y = targetRotY;
        coreGroup.position.y = Math.sin(elapsed * 1.5) * 0.07;

        cageMesh.rotation.y = -elapsed * 0.25;
        ring1.rotation.z = elapsed * 0.65;
        ring2.rotation.x = -elapsed * 0.48;
        ring3.rotation.y = elapsed * 0.52;

        // Animate orbiting particles
        for (let i = 0; i < particleCount; i++) {
          const m = particleMeta[i];
          const a = m.angle + elapsed * m.speed;
          _dummyObj.position.set(
            Math.cos(a) * m.radius,
            m.ySpread + Math.sin(elapsed * 2 + i) * 0.08,
            Math.sin(a) * m.radius
          );
          _dummyObj.rotation.set(elapsed, elapsed * 0.5, 0);
          _dummyObj.scale.setScalar(m.scale);
          _dummyObj.updateMatrix();
          particleInstanced.setMatrixAt(i, _dummyObj.matrix);
        }
        particleInstanced.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (prefersReducedMotion) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const nextW = Math.max(container.clientWidth, 260);
      const nextH = Math.max(container.clientHeight, 200);
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglSupported(false);
    };

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      coreGeo.dispose();
      coreMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      neuralLinesGeo.dispose();
      neuralLinesMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [pointerOffset]);

  if (!webglSupported) {
    return (
      <div
        data-testid="aurora-nexus-fallback-core"
        className="w-full h-full min-h-[220px] flex items-center justify-center relative overflow-hidden"
      >
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FF3030] via-[#8B0000] to-[#050505] shadow-[0_0_60px_rgba(255,48,48,0.55)] border border-[#FF3030]/50 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="aurora-nexus-3d-canvas"
      aria-label="Aurora Nexus Core 3D Interactive Field"
      role="img"
      className="w-full h-full min-h-[220px]"
    />
  );
}

/**
 * AURORA NEXUS CORE — 3D INTERACTIVE FIELD
 * High-tech cinematic 3D visual showcase representing the heartbeat of Aurora E-Cell.
 */
export function HeroPopArtIllustration() {
  const pointerOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerOffset.current = { x: nx, y: ny };
  };

  const handleMouseLeave = () => {
    pointerOffset.current = { x: 0, y: 0 };
  };

  return (
    <div
      data-testid="aurora-nexus-core"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[460px] bg-[#0B0B0D] border border-white/12 rounded-2xl overflow-hidden flex flex-col justify-between p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] group transition-all duration-300"
    >
      {/* Ambient Crimson Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#FF3030]/16 blur-3xl"
      />

      {/* Top Header & Telemetry Status Bar */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF3030]" />
            <h2 className="font-display font-bold text-sm sm:text-base tracking-wide text-white">
              AURORA NEXUS CORE
            </h2>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-0.5">3D Interactive Venture Field</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141416] border border-white/12 text-[11px] font-mono text-white">
            <span className="w-2 h-2 rounded-full bg-[#FF3030] animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3030] -ml-2.5" />
            <span className="text-[#FF3030] font-semibold">ACTIVE VENTURE ENGINE</span>
          </span>
        </div>
      </div>

      {/* Central Interactive 3D Crimson Core Viewport */}
      <div className="relative z-10 w-full flex-1 min-h-[220px] sm:min-h-[250px] flex items-center justify-center my-2">
        <AuroraNexusCoreCanvas pointerOffset={pointerOffset} />
      </div>

      {/* Bottom Telemetry & Milestone Highlights */}
      <div className="relative z-10 space-y-3 pt-3 border-t border-white/10">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#141416]/80 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#A1A1AA] uppercase">
              <Flame className="w-3 h-3 text-[#FF3030]" />
              <span>Rank</span>
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
              21st
            </div>
            <div className="text-[10px] text-[#A1A1AA] truncate mt-0.5">IIT Bombay NEC</div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#141416]/80 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#A1A1AA] uppercase">
              <Activity className="w-3 h-3 text-[#FF3030]" />
              <span>Focus</span>
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
              Zero-to-1
            </div>
            <div className="text-[10px] text-[#A1A1AA] truncate mt-0.5">Incubation</div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#141416]/80 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-[#A1A1AA] uppercase">
              <ShieldCheck className="w-3 h-3 text-[#FF3030]" />
              <span>Campus</span>
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-white mt-0.5">
              Active
            </div>
            <div className="text-[10px] text-[#A1A1AA] truncate mt-0.5">Hyderabad Hub</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[#A1A1AA] pt-1">
          <span>Move cursor to rotate 3D field</span>
          <span className="text-[#FF3030]">● Live Ecosystem</span>
        </div>
      </div>
    </div>
  );
}

export function PopArtPosterFallback({
  title,
  subtitle,
  variant = 'orange',
}: {
  title: string;
  subtitle?: string;
  variant?: 'orange' | 'blue' | 'yellow' | 'pink';
}) {
  const accentMap = {
    orange: 'from-[#FF3030]/25 via-[#8B0000]/15 to-[#0B0B0D]',
    blue: 'from-[#FF3030]/20 via-[#141416] to-[#050505]',
    yellow: 'from-[#8B0000]/30 via-[#141416] to-[#050505]',
    pink: 'from-[#FF3030]/30 via-[#8B0000]/20 to-[#0B0B0D]',
  };

  return (
    <div
      className={`w-full h-full min-h-[180px] flex flex-col justify-between p-5 border-b border-white/10 bg-gradient-to-br ${accentMap[variant]} text-white select-none relative overflow-hidden`}
    >
      <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#A1A1AA] uppercase">
        <span className="text-[#FF3030] font-semibold">AURORA E-CELL</span>
        <span>·</span>
        <span>OFFICIAL SHOWCASE</span>
      </div>
      <div className="my-auto py-3">
        <p className="font-display font-bold text-xl leading-tight line-clamp-2 text-white">
          {title}
        </p>
      </div>
      {subtitle && (
        <div className="text-xs font-mono text-[#A1A1AA] truncate">{subtitle}</div>
      )}
    </div>
  );
}

export function ResilientMediaImage({
  src,
  alt,
  fallbackTitle,
  fallbackSubtitle,
  variant = 'yellow',
  className = 'w-full h-48 object-cover',
}: {
  src?: string;
  alt: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  variant?: 'orange' | 'blue' | 'yellow' | 'pink';
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (!src || !src.trim() || failed) {
    return (
      <div className={className}>
        <PopArtPosterFallback
          title={fallbackTitle}
          subtitle={fallbackSubtitle}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} border-b border-white/10 bg-[#0B0B0D]`}
    />
  );
}

export function StylishEmptyState({
  sectionTitle,
  message = 'Nothing here yet. Stay tuned.',
  subMessage = 'All content in this section is curated and published directly by the Aurora E-Cell administrator.',
  actionLabel,
  onAction,
}: {
  sectionTitle: string;
  message?: string;
  subMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      data-testid={`empty-state-${sectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      className="w-full aurora-card rounded-2xl p-8 md:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#FF3030]/10 blur-3xl"
      />
      <div className="relative z-10 mb-3 text-xs font-mono uppercase tracking-widest text-[#FF3030]">
        {message}
      </div>

      <h3 className="relative z-10 font-display font-bold text-xl md:text-2xl text-white mb-2">
        {sectionTitle}
      </h3>
      <p className="relative z-10 text-sm md:text-base text-[#A1A1AA] max-w-lg leading-relaxed">
        {subMessage}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative z-10 mt-6 px-5 py-2.5 aurora-crimson-btn font-display font-bold text-sm rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Symmetrical, transparent-background header brand logo (Aurora E-Cell top-left or Aurora College top-right).
 * - Gracefully hides when no logo URL is uploaded or if image loading fails (never shows broken image or placeholder).
 * - Uses object-fit: contain and responsive sizing for mobile, tablet, and desktop.
 * - Renders directly against the dark header background without extra borders, backgrounds, or containers.
 */
export function HeaderBrandLogo({
  src,
  alt,
  testId,
}: {
  src?: string;
  alt: string;
  testId: string;
}) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const trimmed = (src || '').trim();

  if (!trimmed || failedSrc === trimmed) {
    return null;
  }

  return (
    <img
      src={trimmed}
      alt={alt}
      data-testid={testId}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(trimmed)}
      style={{ objectFit: 'contain' }}
      className="h-7 sm:h-9 md:h-11 w-auto max-w-[88px] sm:max-w-[130px] md:max-w-[165px] object-contain select-none shrink-0 animate-logo-entrance"
    />
  );
}

/**
 * Word reveal heading component for editorial typography with glowing highlighted words.
 */
export function WordRevealHeading({
  text,
  highlightWords = [],
  className = '',
  style,
}: {
  text: string;
  highlightWords?: string[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const words = text.split(' ');
  return (
    <h1 className={className} style={style}>
      {words.map((word, idx) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isHighlight = highlightWords.some(
          (hw) => hw.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanWord
        );
        return (
          <span
            key={idx}
            className={`inline-block mr-[0.28em] transition-transform duration-300 ${
              isHighlight
                ? 'text-[#FF3030] font-extrabold drop-shadow-[0_0_20px_rgba(255,48,48,0.4)]'
                : 'text-white'
            }`}
          >
            {word}
          </span>
        );
      })}
    </h1>
  );
}

/**
 * 3D interactive tilt card reacting to cursor hover for futuristic visual depth.
 */
export function Tilt3DCard({
  children,
  className = '',
  testId,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`
    );
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      data-testid={testId}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform: transformStyle,
        transition: transformStyle ? 'transform 0.12s ease-out' : 'transform 0.35s ease-out',
        willChange: 'transform',
      }}
      className={className}
    >
      {children}
    </div>
  );
}



