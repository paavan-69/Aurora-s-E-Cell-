import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { AnimatePresence, motion } from 'motion/react';
import { Send, Sparkles, RotateCcw, Compass, CornerDownLeft } from 'lucide-react';
import {
  AURORA_AI_HEADING,
  AURORA_AI_TAGLINE,
  AURORA_AI_WELCOME_MESSAGE,
  AURORA_AI_INPUT_PLACEHOLDER,
  AURORA_AI_SUGGESTED_PROMPTS,
  buildAuroraAiStructuredFallback,
  generateSafeId,
  type AuroraAiCoreState,
  type AuroraAiChatMessage,
} from '../utils/ecellLogic';

// Pre-allocated module-scope scratch objects to avoid GC in the render loop
const _dummyObj = new THREE.Object3D();
const _targetColor = new THREE.Color();

/**
 * Formatted markdown-lite renderer for Aurora AI responses
 * Renders ### headings, bullet lists, and **bold** spans cleanly.
 */
function renderFormattedAiText(rawText: string) {
  const lines = rawText.split('\n');

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed text-[#E4E4E7]">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={i}
              className="font-display font-bold text-sm text-white pt-1 tracking-tight"
            >
              {trimmed.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4
              key={i}
              className="font-display font-bold text-sm text-white pt-1 tracking-tight"
            >
              {trimmed.replace(/^##\s+/, '')}
            </h4>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-[#FF3030] font-mono text-xs select-none mt-0.5">/</span>
              <span className="flex-1">{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

/**
 * Interactive Three.js 3D Crimson AI Core Orb
 * Built as a composite multi-part THREE.Group with:
 * - Primary silhouette: Crimson plasma nucleus + outer geodesic neural shell
 * - Secondary read: 3 concentric gyroscopic energy rings
 * - Accent detail: Neural network synaptic filaments + InstancedMesh particle stream
 */
function AuroraAiThreeCore({
  coreState,
  pointerOffset,
}: {
  coreState: AuroraAiCoreState;
  pointerOffset: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<AuroraAiCoreState>(coreState);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    stateRef.current = coreState;
  }, [coreState]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect software WebGL (SwiftShader / llvmpipe) per threejs skill guidelines
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
    const height = Math.max(container.clientHeight, 175);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x050505, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.085);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 5.2);
    camera.lookAt(0, 0, 0);

    // Studio Environment Map (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Balanced 3-Point Studio Lighting Rig with warm/cool contrast
    const hemiLight = new THREE.HemisphereLight(0xff4d4d, 0x090912, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xff3030, 2.6);
    keyLight.position.set(3.5, 4.0, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff6b4a, 3.2, 12);
    rimLight.position.set(-3.2, -2.0, 2.5);
    scene.add(rimLight);

    // Composite 3D Subject Group (7 distinct parts across 3 silhouette scales)
    const aiOrbGroup = new THREE.Group();
    scene.add(aiOrbGroup);

    // 1. Primary Silhouette Part A: Glowing Crimson AI Plasma Nucleus
    const coreGeo = new THREE.IcosahedronGeometry(0.92, 3);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xff2424,
      emissive: 0x8b0000,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    aiOrbGroup.add(coreMesh);

    // 2. Primary Silhouette Part B: Geodesic Neural Exoskeleton Cage
    const cageGeo = new THREE.IcosahedronGeometry(1.18, 1);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xff5252,
      emissive: 0xff3030,
      emissiveIntensity: 0.65,
      roughness: 0.45,
      metalness: 0.85,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    aiOrbGroup.add(cageMesh);

    // 3, 4, 5. Secondary Read: 3 Concentric Gyroscopic Energy Rings
    const ring1Geo = new THREE.TorusGeometry(1.48, 0.022, 12, 64);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xff3030,
      emissive: 0xff3030,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.9,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.8;
    aiOrbGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.72, 0.016, 12, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff4545,
      emissiveIntensity: 0.45,
      roughness: 0.48,
      metalness: 0.75,
      transparent: true,
      opacity: 0.6,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 3.2;
    ring2.rotation.x = -Math.PI / 5;
    aiOrbGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(1.94, 0.012, 10, 64);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      emissive: 0xff3030,
      emissiveIntensity: 0.5,
      roughness: 0.72,
      metalness: 0.5,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.z = Math.PI / 4;
    ring3.rotation.x = Math.PI / 2.1;
    aiOrbGroup.add(ring3);

    // 6. Accent Detail Part A: Neural Network Synaptic Connections (LineSegments)
    const neuralNodeCount = 24;
    const nodePositions: THREE.Vector3[] = [];
    for (let i = 0; i < neuralNodeCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / neuralNodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.38 + (i % 3) * 0.22;
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
        if (nodePositions[i].distanceTo(nodePositions[j]) < 1.35) {
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
      opacity: 0.34,
    });
    const neuralLines = new THREE.LineSegments(neuralLinesGeo, neuralLinesMat);
    aiOrbGroup.add(neuralLines);

    // 7. Accent Detail Part B: InstancedMesh of 36 Orbiting Energy Particles (> 20 instances)
    const particleCount = 36;
    const particleGeo = new THREE.OctahedronGeometry(0.045, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff3030,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.6,
    });
    const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    particleInstanced.frustumCulled = false;

    const particleMeta = Array.from({ length: particleCount }, (_, i) => {
      const radius = 1.35 + (i % 5) * 0.26;
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
    aiOrbGroup.add(particleInstanced);

    // Contact shadow disc beneath the orb for spatial grounding
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

    // Software WebGL frame pacing helper per threejs skill
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
      const activeState = stateRef.current;

      // Determine state-driven speed & intensity multipliers
      const speedMult =
        activeState === 'thinking'
          ? 2.8
          : activeState === 'responding'
          ? 1.7
          : activeState === 'hover'
          ? 1.45
          : 1.0;

      const targetEmissive =
        activeState === 'thinking'
          ? 2.4
          : activeState === 'responding'
          ? 1.85
          : activeState === 'hover'
          ? 1.75
          : 1.3;

      coreMat.emissiveIntensity = THREE.MathUtils.damp(
        coreMat.emissiveIntensity,
        targetEmissive,
        5,
        delta
      );

      if (!prefersReducedMotion) {
        // Breathing core scale
        const pulseFreq = activeState === 'thinking' ? 6.5 : 2.2;
        const pulseAmp = activeState === 'thinking' ? 0.08 : 0.035;
        const targetScale = 1 + Math.sin(elapsed * pulseFreq) * pulseAmp;
        coreMesh.scale.setScalar(targetScale);

        // Smooth pointer tilt + continuous orbital rotation
        const targetRotX = pointerOffset.current.y * 0.38;
        const targetRotY = elapsed * 0.38 * speedMult + pointerOffset.current.x * 0.55;

        aiOrbGroup.rotation.x = THREE.MathUtils.damp(
          aiOrbGroup.rotation.x,
          targetRotX,
          4,
          delta
        );
        aiOrbGroup.rotation.y = targetRotY;
        aiOrbGroup.position.y = Math.sin(elapsed * 1.5) * 0.07;

        cageMesh.rotation.y = -elapsed * 0.25 * speedMult;
        ring1.rotation.z = elapsed * 0.65 * speedMult;
        ring2.rotation.x = -elapsed * 0.48 * speedMult;
        ring3.rotation.y = elapsed * 0.52 * speedMult;

        // Update instanced particles
        for (let i = 0; i < particleCount; i++) {
          const m = particleMeta[i];
          const a = m.angle + elapsed * m.speed * speedMult;
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
      const nextH = Math.max(container.clientHeight, 165);
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
        data-testid="aurora-ai-fallback-core"
        className="w-full h-full flex items-center justify-center relative overflow-hidden"
      >
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#FF3030] via-[#8B0000] to-[#050505] shadow-[0_0_50px_rgba(255,48,48,0.55)] border border-[#FF3030]/50 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="aurora-ai-3d-canvas"
      data-core-state={coreState}
      aria-label="Aurora AI 3D Crimson Core"
      role="img"
      className="w-full h-full"
    />
  );
}

/**
 * AURORA AI — Interactive Entrepreneurship Assistant Experience
 * Replaces the static 3D decorative section with a live 3D AI Core + Embedded Founder Chat Interface.
 */
export function AuroraAiExperience() {
  const [coreState, setCoreState] = useState<AuroraAiCoreState>('idle');
  const [messages, setMessages] = useState<AuroraAiChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const pointerOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current && messages.length > 0) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerOffset.current = { x: nx, y: ny };
    if (!isLoading && coreState === 'idle') {
      setCoreState('hover');
    }
  };

  const handleMouseLeave = () => {
    pointerOffset.current = { x: 0, y: 0 };
    if (!isLoading && coreState === 'hover') {
      setCoreState('idle');
    }
  };

  const sendPromptToAuroraAi = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isLoading) return;

    setErrorText(null);
    const userMsg: AuroraAiChatMessage = {
      id: generateSafeId('msg_usr'),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const priorHistory = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setCoreState('thinking');

    try {
      const response = await fetch('/api/aurora-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Unable to reach Aurora AI right now.');
      }

      setCoreState('responding');
      const aiMsg: AuroraAiChatMessage = {
        id: generateSafeId('msg_ai'),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      window.setTimeout(() => {
        setCoreState('idle');
      }, 1200);
    } catch (err: unknown) {
      setErrorText(
        err instanceof Error
          ? err.message
          : 'Unable to reach Aurora AI right now. Please try again.'
      );
      setCoreState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      setErrorText('Enter a question or select one of the startup prompts above.');
      return;
    }
    void sendPromptToAuroraAi(inputValue);
  };

  const handleResetConversation = () => {
    setMessages([]);
    setErrorText(null);
    setCoreState('idle');
    inputRef.current?.focus();
  };

  return (
    <div
      data-testid="aurora-ai-experience"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[470px] bg-[#0B0B0D] border border-white/12 rounded-2xl overflow-hidden flex flex-col justify-between p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
    >
      {/* Ambient Crimson Radial Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#FF3030]/18 blur-3xl"
      />

      {/* Top Header & Identity Bar */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF3030]" />
            <h2 className="font-display font-bold text-sm sm:text-base tracking-wide text-white">
              {AURORA_AI_HEADING}
            </h2>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-0.5">{AURORA_AI_TAGLINE}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-[#A1A1AA]">
            {coreState === 'thinking'
              ? 'Synthesizing Strategy...'
              : coreState === 'responding'
              ? 'Blueprint Ready'
              : 'Venture Copilot'}
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleResetConversation}
              aria-label="Reset Aurora AI conversation"
              className="px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-white/10 border border-white/12 text-[11px] font-display font-semibold text-[#A1A1AA] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Central Interactive 3D Crimson AI Core Viewport */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`relative z-10 w-full transition-all duration-300 cursor-pointer ${
          messages.length > 0 ? 'h-32 sm:h-36' : 'h-44 sm:h-48'
        }`}
      >
        <AuroraAiThreeCore coreState={coreState} pointerOffset={pointerOffset} />
      </div>

      {/* Embedded Chat Stream & Prompt Chips */}
      <div className="relative z-10 flex-1 flex flex-col justify-end space-y-3.5 mt-1">
        <div
          ref={chatScrollRef}
          data-testid="aurora-ai-chat-stream"
          className="max-h-60 overflow-y-auto space-y-3 pr-1"
        >
          {/* Welcome Message Card */}
          <div className="p-3.5 rounded-xl bg-[#141416] border border-white/10 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#FF3030]/15 border border-[#FF3030]/40 flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-3.5 h-3.5 text-[#FF3030]" />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-[#A1A1AA]">AURORA AI</div>
              <p
                data-testid="aurora-ai-welcome"
                className="text-xs sm:text-sm font-medium text-white leading-relaxed"
              >
                &ldquo;{AURORA_AI_WELCOME_MESSAGE}&rdquo;
              </p>
            </div>
          </div>

          {/* Conversation Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                data-testid={
                  msg.role === 'user' ? 'aurora-ai-user-msg' : 'aurora-ai-model-msg'
                }
                className={`p-3.5 rounded-xl border ${
                  msg.role === 'user'
                    ? 'bg-[#FF3030]/15 border-[#FF3030]/35 ml-4 text-white'
                    : 'bg-[#141416] border-white/12 mr-2 text-[#E4E4E7]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#A1A1AA] mb-1">
                  <span>{msg.role === 'user' ? 'FOUNDER' : 'AURORA AI'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                {msg.role === 'user' ? (
                  <p className="text-xs sm:text-sm font-medium text-white">{msg.text}</p>
                ) : (
                  renderFormattedAiText(msg.text)
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking State Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="aurora-ai-thinking"
              className="p-3.5 rounded-xl bg-[#141416] border border-[#FF3030]/35 text-xs text-[#A1A1AA] flex items-center justify-between"
            >
              <span className="font-mono text-white">
                Aurora AI is architecting your venture blueprint...
              </span>
              <span className="font-mono text-[11px] text-[#FF3030]">ACTIVE</span>
            </motion.div>
          )}
        </div>

        {/* Suggested Prompt Chips */}
        <div
          aria-label="Suggested entrepreneurship prompts"
          className="flex flex-wrap gap-1.5 pt-1"
        >
          {AURORA_AI_SUGGESTED_PROMPTS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() => void sendPromptToAuroraAi(chip)}
              className="px-2.5 py-1.5 rounded-lg bg-[#141416] hover:bg-[#FF3030]/15 text-[#E4E4E7] hover:text-white border border-white/12 hover:border-[#FF3030]/50 text-[11px] font-display font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {errorText && (
          <p role="alert" className="text-xs text-[#FF3030] font-medium">
            {errorText}
          </p>
        )}

        {/* Prompt Input Form with Glowing Crimson Send Button */}
        <form onSubmit={handleFormSubmit} className="pt-1" noValidate>
          <div className="flex items-center gap-2 bg-[#050505] border border-white/15 focus-within:border-[#FF3030] rounded-xl p-1.5 transition-colors">
            <label htmlFor="aurora-ai-prompt-input" className="sr-only">
              {AURORA_AI_INPUT_PLACEHOLDER}
            </label>
            <input
              ref={inputRef}
              id="aurora-ai-prompt-input"
              type="text"
              value={inputValue}
              disabled={isLoading}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (errorText) setErrorText(null);
              }}
              placeholder={AURORA_AI_INPUT_PLACEHOLDER}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-white placeholder:text-[#A1A1AA]/65 focus:outline-none min-w-0"
            />
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Send message to Aurora AI"
              data-testid="aurora-ai-send-btn"
              className="px-3.5 py-2 aurora-crimson-btn rounded-lg font-display font-bold text-xs text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>Ask</span>
              {isLoading ? (
                <CornerDownLeft className="w-3.5 h-3.5" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
