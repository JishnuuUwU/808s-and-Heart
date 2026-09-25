"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Heart,
  Activity,
  Volume2,
  VolumeX,
  Zap,
  RotateCcw,
  Flame,
  Hand,
  Pin,
  PinOff,
  ExternalLink,
  Radio,
  Mic,
  Music,
  Minus,
  Square,
  X,
} from "lucide-react";
import { SystemAudioReactor, AudioSourceType } from "@/lib/audioReactor";

export type GeometryTopology = "cyberHeart" | "monolith" | "icosahedron" | "torusKnot";

export type BassDriveMode = "SUB" | "TUBE" | "OVERDRIVE";

export type ColorTheme = "MONO" | "CRIMSON" | "CYAN";

export type CardiacRhythm =
  | "SINUS_RHYTHM"
  | "TACHYCARDIA"
  | "BRADYCARDIA"
  | "VENTRICULAR_FLUTTER"
  | "MANUAL_COMPRESSION"
  | "AUDIO_SYNC_RHYTHM";

const COLOR_HEX_MAP: Record<ColorTheme, { outer: number; inner: number; ring: number }> = {
  MONO: { outer: 0xffffff, inner: 0xd4d4d4, ring: 0x888888 },
  CRIMSON: { outer: 0xff2a2a, inner: 0xdd1111, ring: 0x881111 },
  CYAN: { outer: 0x00f5ff, inner: 0x00b4d8, ring: 0x0077b6 },
};

// Web Audio API: Saturated Analog 808 Sub-Bass Engine with Multiple Drive Modes
class Audio808Engine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private driveMode: BassDriveMode = "SUB";
  private distortionCurveMap: Record<string, Float32Array<ArrayBuffer>> = {};

  public init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setDriveMode(mode: BassDriveMode) {
    this.driveMode = mode;
  }

  private getDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const key = `k_${amount}`;
    if (!this.distortionCurveMap[key]) {
      const n_samples = 22050;
      const buffer = new ArrayBuffer(n_samples * 4);
      const curve = new Float32Array(buffer);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
      }
      this.distortionCurveMap[key] = curve;
    }
    return this.distortionCurveMap[key];
  }

  // Primary Systolic Kick (LUB)
  public playSystoleLub(pitchShift: number = 0, volumeScale: number = 1.0) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch dive: punchy 115Hz drops down to subterranean 38Hz
      const startFreq = Math.max(75, Math.min(190, 115 + pitchShift));
      const endFreq = Math.max(28, Math.min(52, 38 + pitchShift * 0.2));

      osc.type = "sine";
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.075);

      // Low-shelf sub-bass booster
      const bassBoost = this.ctx.createBiquadFilter();
      bassBoost.type = "lowshelf";
      bassBoost.frequency.setValueAtTime(52, now);

      let k = 6;
      let boostGain = 10.0;
      let cutoffFreq = 280;

      if (this.driveMode === "TUBE") {
        k = 24;
        boostGain = 8.5;
        cutoffFreq = 340;
      } else if (this.driveMode === "OVERDRIVE") {
        k = 64;
        boostGain = 7.5;
        cutoffFreq = 480;
      }

      bassBoost.gain.setValueAtTime(boostGain, now);

      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.getDistortionCurve(k);
      shaper.oversample = "2x";

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(cutoffFreq, now);
      lowpass.Q.setValueAtTime(2.2, now);

      const peakVolume = Math.min(0.92, 0.82 * volumeScale);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peakVolume, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

      osc.connect(shaper);
      shaper.connect(bassBoost);
      bassBoost.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.74);
    } catch {
      // Safe fallback
    }
  }

  // Secondary Diastolic Pulse (DUB)
  public playDiastoleDub(pitchShift: number = 0) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startFreq = Math.max(50, Math.min(130, 72 + pitchShift * 0.8));
      const endFreq = Math.max(26, Math.min(46, 32 + pitchShift * 0.15));

      osc.type = "sine";
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.065);

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(220, now);
      lowpass.Q.setValueAtTime(1.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.48, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

      osc.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.54);
    } catch {
      // Safe fallback
    }
  }

  // Tactile Poke / Palpation Impulse
  public playTactileTap() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(74, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Safe fallback
    }
  }

  // Viscoelastic Compression Rebound Snap
  public playSqueezeRebound() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.09);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.88, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.68);
    } catch {
      // Safe fallback
    }
  }

  // Epinephrine / Adrenaline Double-Systole Surge
  public playAdrenalineSurge() {
    this.playSystoleLub(24, 1.25);
    setTimeout(() => {
      this.playSystoleLub(14, 1.15);
    }, 95);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

interface SpecimenViewportProps {
  geometryType: GeometryTopology;
  isDense: boolean;
  onToggleDensity: () => void;
  onSelectTopology?: (topology: GeometryTopology) => void;
  isPopupWindow?: boolean;
}

// Sculptural Anatomical Cyber-Heart Generator
function createSculpturalHeartGeometry(dense: boolean): THREE.BufferGeometry {
  const segs = dense ? 32 : 16;
  const geom = new THREE.SphereGeometry(1.55, segs, segs);
  const pos = geom.getAttribute("position") as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;

  for (let i = 0; i < pos.count; i++) {
    const i3 = i * 3;
    let x = arr[i3];
    let y = arr[i3 + 1];
    let z = arr[i3 + 2];

    if (y < 0) {
      // Ventricular cone: tapered towards apex
      const taper = Math.max(0.08, 1.0 + y * 0.48);
      x *= taper;
      z *= taper * 0.82;
      y *= 1.35;

      // Anterior-lateral left ventricular apex tilt (clinical levocardia)
      x -= (-y) * 0.08;
      z += (-y) * 0.05;

      // Anterior interventricular sulcus depression
      if (x > -0.25 && x < 0.25 && z > 0) {
        const sulcusDepth = Math.exp(-Math.pow(x / 0.22, 2)) * 0.12 * (-y / 1.5);
        z -= sulcusDepth;
      }
    } else {
      // Atrial chambers and base: bilateral superior lobes with central cleft
      const cleft = Math.abs(x) * 0.44 - 0.26;
      y += cleft;
      x *= 1.15;
      z *= 0.90;
    }

    // Levocardia anatomical axis tilt
    x += y * 0.12;

    arr[i3] = x;
    arr[i3 + 1] = y;
    arr[i3 + 2] = z;
  }

  geom.computeVertexNormals();
  return geom;
}

export default function SpecimenViewport({
  geometryType,
  isDense,
  onToggleDensity,
  onSelectTopology,
  isPopupWindow = false,
}: SpecimenViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioEngineRef = useRef<Audio808Engine | null>(null);
  const audioReactorRef = useRef<SystemAudioReactor | null>(null);

  // Audio & Sandbox interactive states
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bassMode, setBassMode] = useState<BassDriveMode>("SUB");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("MONO");
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [bpmOverride, setBpmOverride] = useState<number | null>(null);

  // Windows Desktop & Always-On-Top States
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(true);
  const [isElectronEnv, setIsElectronEnv] = useState<boolean>(false);

  // Live Sound Reactivity States
  const [audioSource, setAudioSource] = useState<AudioSourceType>("IDLE");
  const [audioSens, setAudioSens] = useState<number>(1.2);
  const [spectrumBars, setSpectrumBars] = useState<[number, number, number, number, number]>([
    0, 0, 0, 0, 0,
  ]);
  const [audioRmsPercent, setAudioRmsPercent] = useState<number>(0);

  // HUD & Biomechanical Metrics
  const [activeTopology, setActiveTopology] = useState<GeometryTopology>(geometryType || "cyberHeart");
  const [cardiacRhythm, setCardiacRhythm] = useState<CardiacRhythm>("SINUS_RHYTHM");
  const [currentBpm, setCurrentBpm] = useState<number>(72);
  const [rotationCoords, setRotationCoords] = useState<{ x: number; y: number }>({ x: 24, y: 35 });
  const [ekgLine, setEkgLine] = useState<string>("0,15 10,15 20,15 30,15 40,15");
  const [cardiacPhase, setCardiacPhase] = useState<"SYSTOLE" | "DIASTOLE" | "REST">("REST");
  const [isTactileTouch, setIsTactileTouch] = useState<boolean>(false);
  const [tissueStrain, setTissueStrain] = useState<number>(0);

  // Material refs for dynamic color updates
  const outerMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const innerMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const conduitMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new Audio808Engine();
    }
    if (!audioReactorRef.current) {
      audioReactorRef.current = new SystemAudioReactor();
    }

    // Check for native Electron Windows Environment
    if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
      setIsElectronEnv(true);
      window.electronAPI.getAlwaysOnTop().then((pinned) => {
        setIsAlwaysOnTop(pinned);
      });
    }

    return () => {
      audioReactorRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (geometryType) {
      setActiveTopology(geometryType);
    }
  }, [geometryType]);

  const ekgHistoryRef = useRef<number[]>(new Array(32).fill(15));
  const lastLubCycleRef = useRef<number>(-1);
  const lastDubCycleRef = useRef<number>(-1);

  // Hemodynamic & Physical State Parameters
  const hemodynamicsRef = useRef<{
    baselineBpm: number;
    smoothedBpm: number;
    adrenalineLevel: number;
    squeezeStrain: number;
    lastInteractionTime: number;
    mouseVelocity: number;
    prevX: number;
    prevY: number;
  }>({
    baselineBpm: 72,
    smoothedBpm: 72,
    adrenalineLevel: 0,
    squeezeStrain: 0,
    lastInteractionTime: Date.now(),
    mouseVelocity: 0,
    prevX: 0,
    prevY: 0,
  });

  const isDraggingRef = useRef(false);
  const pointerPosRef = useRef({ x: 0, y: 0, isHovering: false });
  const dragPrevRef = useRef({ x: 0, y: 0 });
  const dragVelocityRef = useRef({ x: 0, y: 0 });
  const baseRotationRef = useRef({ x: 0.25, y: 0.4 });
  const pointerDownInfoRef = useRef<{ time: number; x: number; y: number; isDirectHeartHit: boolean }>({
    time: 0,
    x: 0,
    y: 0,
    isDirectHeartHit: false,
  });

  // Local 3D Hit Point for Direct Palpation & Ripple Waves
  const localHitPointRef = useRef<{
    active: boolean;
    point: THREE.Vector3;
    intensity: number;
    phase: number;
  }>({
    active: false,
    point: new THREE.Vector3(0, 0, 1.5),
    intensity: 0,
    phase: 0,
  });

  // Shockwave & Rebound Impulses
  const shockwaveRef = useRef({ time: 0, active: false, intensity: 0 });
  const squeezeReboundRef = useRef<{ active: boolean; intensity: number }>({ active: false, intensity: 0 });

  // 2nd-Order Apex Whip & Inertial Sway (Mass-Spring-Damper)
  const apexPhysicsRef = useRef<{
    swayX: number;
    swayY: number;
    velX: number;
    velY: number;
  }>({
    swayX: 0,
    swayY: 0,
    velX: 0,
    velY: 0,
  });

  // Camera & Outer Mesh Refs for Accurate 3D Raycasting
  const outerMeshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // --- WINDOWS ALWAYS-ON-TOP & POPUP CONTROLS ---
  const handleToggleAlwaysOnTop = async () => {
    if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
      const next = await window.electronAPI.setAlwaysOnTop(!isAlwaysOnTop);
      setIsAlwaysOnTop(next);
    } else if (typeof window !== "undefined") {
      // In Web Browser: toggle Picture-in-Picture or pop-out window
      if ("documentPictureInPicture" in window && !window.documentPictureInPicture?.window) {
        try {
          const pipWin = await (window as unknown as {
            documentPictureInPicture: {
              requestWindow: (opt: { width: number; height: number }) => Promise<Window>;
            };
          }).documentPictureInPicture.requestWindow({
            width: 480,
            height: 600,
          });
          pipWin.location.href = "/popup";
          setIsAlwaysOnTop(true);
        } catch {
          handleOpenPopupWindow();
        }
      } else {
        setIsAlwaysOnTop((prev) => !prev);
      }
    }
  };

  const handleOpenPopupWindow = () => {
    if (typeof window === "undefined") return;
    const width = 480;
    const height = 620;
    const left = window.screen.width - width - 30;
    const top = window.screen.height - height - 60;
    window.open(
      "/popup",
      "CyberHeartSpecimen",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  };

  const handleMinimizeWindow = () => {
    if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximizeWindow = () => {
    if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
      window.electronAPI.toggleMaximize();
    }
  };

  const handleCloseWindow = () => {
    if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
      window.electronAPI.close();
    } else if (typeof window !== "undefined" && isPopupWindow) {
      window.close();
    }
  };

  // --- COMPUTER SOUND CAPTURE / REACTIVITY ---
  const handleToggleSystemAudio = async () => {
    const reactor = audioReactorRef.current;
    if (!reactor) return;

    if (audioSource === "SYSTEM_AUDIO") {
      reactor.disconnect();
      setAudioSource("IDLE");
      setSpectrumBars([0, 0, 0, 0, 0]);
      setAudioRmsPercent(0);
    } else {
      const ok = await reactor.connectSystemAudio();
      if (ok) {
        setAudioSource("SYSTEM_AUDIO");
        audioEngineRef.current?.init();
      }
    }
  };

  const handleToggleMicrophone = async () => {
    const reactor = audioReactorRef.current;
    if (!reactor) return;

    if (audioSource === "MIC_INPUT") {
      reactor.disconnect();
      setAudioSource("IDLE");
      setSpectrumBars([0, 0, 0, 0, 0]);
      setAudioRmsPercent(0);
    } else {
      const ok = await reactor.connectMicrophone();
      if (ok) {
        setAudioSource("MIC_INPUT");
        audioEngineRef.current?.init();
      }
    }
  };

  const handleCycleAudioSens = () => {
    const levels = [0.8, 1.2, 1.8, 2.5];
    const nextIdx = (levels.indexOf(audioSens) + 1) % levels.length;
    const next = levels[nextIdx];
    setAudioSens(next);
    audioReactorRef.current?.setSensitivity(next);
  };

  const handleCycleTopology = useCallback(() => {
    const topologies: GeometryTopology[] = ["cyberHeart", "monolith", "icosahedron", "torusKnot"];
    const nextIdx = (topologies.indexOf(activeTopology) + 1) % topologies.length;
    const nextType = topologies[nextIdx];
    setActiveTopology(nextType);
    if (onSelectTopology) {
      onSelectTopology(nextType);
    }
    audioEngineRef.current?.playSystoleLub(10, 1.15);
  }, [activeTopology, onSelectTopology]);

  // Sandbox: Defibrillator 200J Electrical Shock
  const triggerDefibrillator = useCallback(() => {
    shockwaveRef.current = { time: 0, active: true, intensity: 3.2 };
    setIsTactileTouch(true);
    audioEngineRef.current?.playSystoleLub(-14, 1.6);
    setTimeout(() => setIsTactileTouch(false), 900);
  }, []);

  // Sandbox: Adrenaline / Epinephrine Bolus
  const triggerAdrenaline = useCallback(() => {
    const hemo = hemodynamicsRef.current;
    hemo.adrenalineLevel = 1.0;
    audioEngineRef.current?.playAdrenalineSurge();
    setIsTactileTouch(true);
    setTimeout(() => setIsTactileTouch(false), 600);
  }, []);

  // Sandbox: Manual CPR / Ventricular Compression
  const triggerChestCompress = useCallback(() => {
    squeezeReboundRef.current = { active: true, intensity: 1.6 };
    localHitPointRef.current = {
      active: true,
      point: new THREE.Vector3(0, -0.2, 1.4),
      intensity: 1.5,
      phase: 0,
    };
    audioEngineRef.current?.playSqueezeRebound();
    setIsTactileTouch(true);
    setTimeout(() => setIsTactileTouch(false), 300);
  }, []);

  // Sandbox: Cycle Bass Drive Character
  const handleCycleBassMode = () => {
    const modes: BassDriveMode[] = ["SUB", "TUBE", "OVERDRIVE"];
    const next = modes[(modes.indexOf(bassMode) + 1) % modes.length];
    setBassMode(next);
    audioEngineRef.current?.setDriveMode(next);
    audioEngineRef.current?.playSystoleLub(0, 1.1);
  };

  // Sandbox: Cycle Color Theme
  const handleCycleColorTheme = () => {
    const themes: ColorTheme[] = ["MONO", "CRIMSON", "CYAN"];
    const next = themes[(themes.indexOf(colorTheme) + 1) % themes.length];
    setColorTheme(next);

    const hex = COLOR_HEX_MAP[next];
    if (outerMaterialRef.current) outerMaterialRef.current.color.setHex(hex.outer);
    if (innerMaterialRef.current) innerMaterialRef.current.color.setHex(hex.inner);
    if (conduitMaterialRef.current) conduitMaterialRef.current.color.setHex(hex.ring);
  };

  // Sandbox: Manual BPM Adjustment (+ / -)
  const adjustBpm = (delta: number) => {
    const current = bpmOverride ?? hemodynamicsRef.current.smoothedBpm;
    const next = Math.max(40, Math.min(195, current + delta));
    setBpmOverride(next);
  };

  const resetBpm = () => {
    setBpmOverride(null);
  };

  const toggleMute = () => {
    if (audioEngineRef.current) {
      const muted = audioEngineRef.current.toggleMute();
      setIsMuted(muted);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6.2;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    const artifactGroup = new THREE.Group();
    scene.add(artifactGroup);

    let outerGeometry: THREE.BufferGeometry;
    let innerCoreGeometry: THREE.BufferGeometry;
    let aortaGeometry: THREE.BufferGeometry | null = null;
    let ringGeometry: THREE.BufferGeometry | null = null;

    if (activeTopology === "cyberHeart") {
      outerGeometry = createSculpturalHeartGeometry(isDense);
      innerCoreGeometry = new THREE.IcosahedronGeometry(0.65, isDense ? 2 : 1);
      aortaGeometry = new THREE.TorusGeometry(0.55, 0.12, isDense ? 12 : 6, 24, Math.PI * 0.95);
      ringGeometry = new THREE.RingGeometry(1.95, 2.05, 36);
    } else if (activeTopology === "monolith") {
      outerGeometry = isDense
        ? new THREE.BoxGeometry(1.6, 3.4, 0.7, 12, 28, 8)
        : new THREE.BoxGeometry(1.6, 3.4, 0.7, 4, 10, 2);
      innerCoreGeometry = new THREE.OctahedronGeometry(0.85, isDense ? 2 : 0);
      ringGeometry = new THREE.RingGeometry(1.2, 1.28, 24);
    } else if (activeTopology === "icosahedron") {
      outerGeometry = isDense
        ? new THREE.IcosahedronGeometry(1.95, 3)
        : new THREE.IcosahedronGeometry(1.95, 1);
      innerCoreGeometry = new THREE.IcosahedronGeometry(0.9, isDense ? 1 : 0);
      ringGeometry = new THREE.RingGeometry(2.35, 2.45, 36);
    } else {
      outerGeometry = isDense
        ? new THREE.TorusKnotGeometry(1.3, 0.38, 120, 20, 2, 3)
        : new THREE.TorusKnotGeometry(1.3, 0.38, 48, 8, 2, 3);
      innerCoreGeometry = new THREE.SphereGeometry(0.65, 16, 12);
      ringGeometry = new THREE.RingGeometry(2.1, 2.2, 32);
    }

    const outerPosAttr = outerGeometry.getAttribute("position") as THREE.BufferAttribute;
    const baseOuterPositions = outerPosAttr.clone();

    const hex = COLOR_HEX_MAP[colorTheme];

    const outerMaterial = new THREE.MeshBasicMaterial({
      color: hex.outer,
      wireframe: true,
      wireframeLinewidth: 1,
      transparent: true,
      opacity: 0.95,
    });
    outerMaterialRef.current = outerMaterial;

    const innerCoreMaterial = new THREE.MeshBasicMaterial({
      color: hex.inner,
      wireframe: true,
      wireframeLinewidth: 1,
      transparent: true,
      opacity: 0.75,
    });
    innerMaterialRef.current = innerCoreMaterial;

    const conduitMaterial = new THREE.MeshBasicMaterial({
      color: hex.ring,
      wireframe: true,
      wireframeLinewidth: 1,
      transparent: true,
      opacity: 0.6,
    });
    conduitMaterialRef.current = conduitMaterial;

    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    artifactGroup.add(outerMesh);
    outerMeshRef.current = outerMesh;

    const innerCoreMesh = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    artifactGroup.add(innerCoreMesh);

    let aortaMesh: THREE.Mesh | null = null;
    if (aortaGeometry) {
      aortaMesh = new THREE.Mesh(aortaGeometry, conduitMaterial);
      aortaMesh.position.set(-0.15, 1.45, 0.05);
      aortaMesh.rotation.z = Math.PI * 0.15;
      aortaMesh.rotation.x = Math.PI * 0.25;
      artifactGroup.add(aortaMesh);
    }

    const baseAortaPositions = aortaGeometry
      ? (aortaGeometry.getAttribute("position") as THREE.BufferAttribute).clone()
      : null;

    let ringMesh: THREE.Mesh | null = null;
    if (ringGeometry) {
      ringMesh = new THREE.Mesh(ringGeometry, conduitMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      artifactGroup.add(ringMesh);
    }

    let animationFrameId: number;
    let lastTime = performance.now() * 0.001;
    let currentTilt = { x: 0, y: 0 };
    let ekgAccumulator = 0;
    let lastBpmSample = 0;
    let lastAudioHudSample = 0;
    let recoilDisplacement = 0;
    let recoilVelocity = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now() * 0.001;
      const delta = Math.min(now - lastTime, 0.1);
      lastTime = now;
      const elapsedTime = now;

      const hemo = hemodynamicsRef.current;

      // Sample Live Computer Sound Reactor
      const audioFrame = audioReactorRef.current?.update(elapsedTime) || {
        isActive: false,
        sourceType: "IDLE" as AudioSourceType,
        rms: 0,
        subBass: 0,
        bass: 0,
        mid: 0,
        high: 0,
        isBeat: false,
        beatIntensity: 0,
        estimatedBpm: 72,
        spectrum5: [0, 0, 0, 0, 0] as [number, number, number, number, number],
      };

      // Periodic HUD visualizer update
      if (audioFrame.isActive && elapsedTime - lastAudioHudSample > 0.06) {
        lastAudioHudSample = elapsedTime;
        setSpectrumBars(audioFrame.spectrum5);
        setAudioRmsPercent(Math.round(audioFrame.rms * 100));
      }

      // Chemical drug decays
      if (hemo.adrenalineLevel > 0) {
        hemo.adrenalineLevel = Math.max(0, hemo.adrenalineLevel - delta * 0.12);
      }

      // Squeeze compression strain accumulation/dissipation
      if (isDraggingRef.current && pointerDownInfoRef.current.isDirectHeartHit) {
        hemo.squeezeStrain = Math.min(1.0, hemo.squeezeStrain + delta * 2.5);
      } else {
        hemo.squeezeStrain = Math.max(0, hemo.squeezeStrain - delta * 4.0);
      }
      setTissueStrain(Math.round(hemo.squeezeStrain * 100));

      // --- AUTONOMIC / AUDIO-SYNCED HEMODYNAMICS ---
      const adrenalineBoost = hemo.adrenalineLevel * 72; // Spikes up to 144+ BPM
      const defibBoost = shockwaveRef.current.active ? 46 : 0;

      // If computer audio is connected, drive heart rate from music tempo!
      let audioBpmTarget = hemo.baselineBpm;
      if (audioFrame.isActive && audioFrame.estimatedBpm >= 55) {
        audioBpmTarget = audioFrame.estimatedBpm;
      }

      const calculatedTargetBpm = Math.max(
        40,
        Math.min(195, audioBpmTarget + adrenalineBoost + defibBoost)
      );
      const activeTargetBpm = bpmOverride ?? calculatedTargetBpm;

      // Smooth exponential glide towards target BPM
      const glideRate = audioFrame.isActive ? 2.5 : 1.8;
      hemo.smoothedBpm += (activeTargetBpm - hemo.smoothedBpm) * Math.min(1.0, delta * glideRate);

      // Physiological Heart Rate Variability (respiratory sinus arrhythmia)
      const respiratorySinusArrhythmia = Math.sin(elapsedTime * 1.3) * 2.2;
      const liveBpm = Math.max(40, Math.min(195, hemo.smoothedBpm + respiratorySinusArrhythmia));
      const beatPeriod = 60 / liveBpm;

      const cycleProgress = elapsedTime / beatPeriod;
      const cycleIndex = Math.floor(cycleProgress);
      const phase = cycleProgress - cycleIndex;

      // Rhythm determination
      let currentRhythm: CardiacRhythm = "SINUS_RHYTHM";
      if (shockwaveRef.current.active && shockwaveRef.current.time < 0.9) {
        currentRhythm = "VENTRICULAR_FLUTTER";
      } else if (hemo.squeezeStrain > 0.25) {
        currentRhythm = "MANUAL_COMPRESSION";
      } else if (audioFrame.isActive) {
        currentRhythm = "AUDIO_SYNC_RHYTHM";
      } else if (liveBpm > 100) {
        currentRhythm = "TACHYCARDIA";
      } else if (liveBpm < 60) {
        currentRhythm = "BRADYCARDIA";
      }
      setCardiacRhythm(currentRhythm);

      // Systolic Contraction (LUB) & Diastolic Untwisting (DUB)
      let lub = Math.exp(-Math.pow((phase - 0.14) / 0.045, 2)) * 0.46;
      const dub = Math.exp(-Math.pow((phase - 0.35) / 0.055, 2)) * 0.26;

      // If computer audio transient hits, pump immediate systolic ejection
      if (audioFrame.isActive && audioFrame.isBeat) {
        lub = Math.max(lub, audioFrame.beatIntensity * 0.65);
        // Trigger subtle surface shockwave on heavy kick
        if (audioFrame.beatIntensity > 0.65) {
          localHitPointRef.current = {
            active: true,
            point: new THREE.Vector3(
              (Math.random() - 0.5) * 0.6,
              -0.3,
              1.3
            ),
            intensity: audioFrame.beatIntensity * 1.2,
            phase: 0,
          };
        }
      }

      const cardiacScale = lub + dub;

      // --- UNDERDAMPED VISCOELASTIC KELVIN-VOIGT OSCILLATOR ---
      const omegaN = 24.0;
      const zeta = 0.28;

      const systolicJerk = Math.max(0, lub - 0.12) * 18.0 * (1.0 + hemo.adrenalineLevel * 0.8);
      const defibForce = shockwaveRef.current.active
        ? Math.sin(shockwaveRef.current.time * 24.0) * shockwaveRef.current.intensity * 14.0
        : 0;
      const tapForce = localHitPointRef.current.active
        ? localHitPointRef.current.intensity * 22.0
        : 0;
      const reboundForce = squeezeReboundRef.current.active
        ? squeezeReboundRef.current.intensity * 28.0
        : 0;

      // Computer Sound Low-End Driving Force (Sub-Bass + Kicks)
      const audioBassForce = audioFrame.isActive
        ? (audioFrame.subBass * 16.0 + (audioFrame.isBeat ? audioFrame.beatIntensity * 24.0 : 0))
        : 0;

      const totalDrivingForce =
        systolicJerk + defibForce + tapForce + reboundForce + audioBassForce;
      const springAcc = -omegaN * omegaN * recoilDisplacement;
      const dampingAcc = -2.0 * zeta * omegaN * recoilVelocity;
      const netAcc = springAcc + dampingAcc + totalDrivingForce;

      recoilVelocity += netAcc * delta;
      recoilDisplacement += recoilVelocity * delta;
      recoilDisplacement = Math.max(-0.65, Math.min(0.75, recoilDisplacement));

      if (localHitPointRef.current.active) {
        localHitPointRef.current.phase += delta * 7.5;
        localHitPointRef.current.intensity -= delta * 3.2;
        if (localHitPointRef.current.intensity <= 0) {
          localHitPointRef.current.active = false;
        }
      }

      if (squeezeReboundRef.current.active) {
        squeezeReboundRef.current.intensity -= delta * 4.0;
        if (squeezeReboundRef.current.intensity <= 0) {
          squeezeReboundRef.current.active = false;
        }
      }

      let currentPhase: "SYSTOLE" | "DIASTOLE" | "REST" = "REST";
      if (lub > 0.08) currentPhase = "SYSTOLE";
      else if (dub > 0.06) currentPhase = "DIASTOLE";
      setCardiacPhase(currentPhase);

      // --- 808 SUB-BASS AUDIO SYNC ---
      const pointerPitchOffset = pointerPosRef.current.y * 25;

      if (phase >= 0.14 && lastLubCycleRef.current !== cycleIndex) {
        lastLubCycleRef.current = cycleIndex;
        audioEngineRef.current?.playSystoleLub(
          pointerPitchOffset,
          hemo.adrenalineLevel > 0.2 ? 1.25 : 1.0
        );
      }

      if (phase >= 0.35 && lastDubCycleRef.current !== cycleIndex) {
        lastDubCycleRef.current = cycleIndex;
        audioEngineRef.current?.playDiastoleDub(pointerPitchOffset);
      }

      if (elapsedTime - lastBpmSample > 0.3) {
        setCurrentBpm(Math.round(liveBpm));
        lastBpmSample = elapsedTime;
      }

      // Live EKG trace generator
      ekgAccumulator += delta * (liveBpm / 60) * 19;
      if (ekgAccumulator > 1) {
        ekgAccumulator = 0;
        let ecgVoltage = 0;
        if (shockwaveRef.current.active && shockwaveRef.current.time < 0.9) {
          ecgVoltage = Math.sin(elapsedTime * 48.0) * 18;
        } else if (hemo.squeezeStrain > 0.2) {
          ecgVoltage = (Math.random() - 0.5) * 8;
        } else if (audioFrame.isActive) {
          // Computer sound responsive EKG trace
          const beatSpike = audioFrame.isBeat ? 26 * audioFrame.beatIntensity : 0;
          const bassRipple = Math.sin(elapsedTime * 24.0) * audioFrame.subBass * 12;
          ecgVoltage = beatSpike + bassRipple;
        } else if (phase > 0.05 && phase < 0.1) {
          ecgVoltage = Math.sin(((phase - 0.05) / 0.05) * Math.PI) * 4.5;
        } else if (phase >= 0.11 && phase < 0.13) {
          ecgVoltage = -3.5;
        } else if (phase >= 0.13 && phase <= 0.17) {
          ecgVoltage = 24 * (1.0 + hemo.adrenalineLevel * 0.35);
        } else if (phase > 0.17 && phase <= 0.2) {
          ecgVoltage = -7;
        } else if (phase > 0.28 && phase < 0.42) {
          ecgVoltage = Math.sin(((phase - 0.28) / 0.14) * Math.PI) * 7.5;
        }

        const baseline = 15;
        const mappedY = Math.max(2, Math.min(28, baseline - ecgVoltage));
        ekgHistoryRef.current.push(mappedY);
        if (ekgHistoryRef.current.length > 28) ekgHistoryRef.current.shift();

        const points = ekgHistoryRef.current
          .map((y, idx) => `${idx * 4.6},${y.toFixed(1)}`)
          .join(" ");
        setEkgLine(points);
      }

      if (shockwaveRef.current.active) {
        shockwaveRef.current.time += delta * 3.4;
        if (shockwaveRef.current.time > Math.PI) {
          shockwaveRef.current.active = false;
          shockwaveRef.current.time = 0;
        }
      }

      // --- 2ND-ORDER APEX WHIP & INERTIAL SWAY ---
      const apex = apexPhysicsRef.current;
      const apexK = 34.0;
      const apexDamping = 6.4;
      const apexTargetX = dragVelocityRef.current.x * 3.2;
      const apexTargetY = dragVelocityRef.current.y * 3.2;

      const apexAccX = (apexTargetX - apex.swayX) * apexK - apex.velX * apexDamping;
      const apexAccY = (apexTargetY - apex.swayY) * apexK - apex.velY * apexDamping;
      apex.velX += apexAccX * delta;
      apex.velY += apexAccY * delta;
      apex.swayX += apex.velX * delta;
      apex.swayY += apex.velY * delta;

      // Living Vertex Deformations with Impactful Soft-Body Physics
      const positions = outerPosAttr.array as Float32Array;
      const basePositions = baseOuterPositions.array as Float32Array;
      const vertexCount = outerPosAttr.count;

      const hit = localHitPointRef.current;

      // Computer Sound Reactive Strain & Bulge
      const audioRadialBulge = audioFrame.isActive
        ? (audioFrame.subBass * 0.22 + audioFrame.bass * 0.12)
        : 0;

      for (let i = 0; i < vertexCount; i++) {
        const i3 = i * 3;
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];
        const bz = basePositions[i3 + 2];

        const r = Math.sqrt(bx * bx + by * by + bz * bz) || 1;

        if (activeTopology === "cyberHeart") {
          // 1. PHYSIOLOGICAL SYSTOLE
          const atrialKick = Math.exp(-Math.pow((phase - 0.08) / 0.035, 2)) * 0.24;
          const activeSystole = lub + recoilDisplacement * 0.36 + audioRadialBulge * 0.5;

          // 2. CLINICAL LEVOCARDIA APEX WRINGING (TORSION)
          const h = Math.max(-1.0, Math.min(1.0, by / 1.55));
          const torsionAngle =
            (h < 0 ? -0.34 * -h : 0.07 * h) *
            activeSystole *
            (1.0 + hemo.adrenalineLevel * 0.6 + (audioFrame.isActive ? audioFrame.mid * 0.4 : 0));
          const cosT = Math.cos(torsionAngle);
          const sinT = Math.sin(torsionAngle);
          let tx = bx * cosT - bz * sinT;
          let tz = bx * sinT + bz * cosT;
          let ty = by;

          // 3. APEX INERTIAL SWAY & WHIP (Mass lags behind base motion)
          if (by < 0) {
            const apicalDepth = -by / 1.55;
            tx += apex.swayX * apicalDepth;
            tz += apex.swayY * apicalDepth;
          }

          // 4. LONGITUDINAL SHORTENING (MAPSE) & EQUATORIAL WALL THICKENING
          if (by < 0) {
            const longStrain = activeSystole * 0.18;
            ty *= 1.0 - longStrain;

            const equatorWeight = Math.exp(-Math.pow((by + 0.35) / 0.72, 2));
            const poissonBulge =
              1.0 +
              (0.58 * longStrain + 0.18 * activeSystole + audioRadialBulge) * equatorWeight;

            const apicalTaper = Math.max(0.68, 1.0 - activeSystole * 0.22 * (-by / 1.55));
            tx *= poissonBulge * apicalTaper;
            tz *= poissonBulge * apicalTaper;
          } else {
            const atrialDepression = atrialKick * 0.16 * (by / 1.55);
            ty -= atrialDepression;
            const atrialSqueeze = 1.0 - atrialKick * 0.12;
            tx *= atrialSqueeze;
            tz *= atrialSqueeze;

            const mapseDescent = activeSystole * 0.1 * (1.0 - by / 1.55);
            ty -= mapseDescent;
          }

          // 5. DIRECT 3D PALPATION & HYDROSTATIC SQUEEZE (POISSON EFFECT)
          let palpationIndent = 0;
          let hydrostaticBulge = 0;

          if (pointerPosRef.current.isHovering) {
            const rotY = baseRotationRef.current.y;
            const screenVx = tx * 0.32 * Math.cos(rotY) + tz * 0.32 * Math.sin(rotY);
            const screenVy = ty * 0.32;
            const dx = screenVx - pointerPosRef.current.x * 0.7;
            const dy = screenVy - pointerPosRef.current.y * 0.7;
            const distSq = dx * dx + dy * dy;

            if (distSq < 0.45) {
              const falloff = Math.exp(-distSq / 0.16);
              palpationIndent = -0.32 * falloff * (isDraggingRef.current ? 1.7 : 0.85);
              hydrostaticBulge = 0.14 * Math.exp(-Math.pow((distSq - 0.24) / 0.18, 2));
            }
          }

          // Direct squeeze strain (holding mouse down)
          let squeezeFactor = 0;
          if (hemo.squeezeStrain > 0.01) {
            const latSquish = hemo.squeezeStrain * 0.25;
            tx *= 1.0 - latSquish;
            tz *= 1.0 - latSquish;
            ty *= 1.0 + latSquish * 0.7;
            squeezeFactor = -hemo.squeezeStrain * 0.08;
          }

          // 6. EXPANDING 3D ELASTIC ACOUSTIC RIPPLE
          let acousticRipple = 0;
          if (hit.active) {
            const distFromContact = Math.hypot(bx - hit.point.x, by - hit.point.y, bz - hit.point.z);
            const waveFront = hit.phase;
            const rippleDist = Math.abs(distFromContact - waveFront);
            acousticRipple =
              Math.sin(rippleDist * 15.0 - hit.phase * 4.5) *
              Math.exp((-rippleDist * rippleDist) / 0.28) *
              hit.intensity *
              0.32;
          }

          // Computer sound high-treble surface shimmer
          let audioHighShimmer = 0;
          if (audioFrame.isActive && audioFrame.high > 0.25) {
            audioHighShimmer =
              Math.sin(by * 14.0 + elapsedTime * 22.0) * audioFrame.high * 0.045;
          }

          // 7. ELECTRICAL DEFIBRILLATOR SHOCKWAVE DISPERSION
          let shockDisplacement = 0;
          if (shockwaveRef.current.active) {
            const t = shockwaveRef.current.time;
            const fibrillation =
              t < 0.85
                ? Math.sin(t * 54.0 + bx * 18.0 + by * 14.0) * 0.07 * shockwaveRef.current.intensity
                : 0;
            const waveRadius = t * 3.2;
            const waveDist = Math.abs(r - waveRadius);
            const wavePulse =
              Math.exp((-waveDist * waveDist) / 0.22) *
              Math.sin(waveDist * 9.0 - t * 16.0) *
              shockwaveRef.current.intensity *
              0.3;
            shockDisplacement = fibrillation + wavePulse;
          }

          const netScale =
            1.0 +
            palpationIndent +
            hydrostaticBulge +
            squeezeFactor +
            acousticRipple +
            audioHighShimmer +
            shockDisplacement;

          positions[i3] = tx * netScale;
          positions[i3 + 1] = ty * netScale;
          positions[i3 + 2] = tz * netScale;
        } else if (activeTopology === "monolith") {
          const wave = Math.sin(by * 4.5 - elapsedTime * 3.0) * 0.08;
          let shock = 0;
          if (shockwaveRef.current.active) {
            shock = Math.sin(by * 8.0 - shockwaveRef.current.time * 8.0) * shockwaveRef.current.intensity * 0.2;
          }
          const totalScale =
            1.0 +
            (cardiacScale + recoilDisplacement * 0.25 + audioRadialBulge) * 0.1 +
            wave +
            shock;
          positions[i3] = bx * totalScale;
          positions[i3 + 1] = by * totalScale;
          positions[i3 + 2] = bz * totalScale;
        } else if (activeTopology === "icosahedron") {
          const wave = Math.sin(bx * 3.5 + elapsedTime * 3.0) * 0.06;
          let shock = 0;
          if (shockwaveRef.current.active) {
            shock = Math.sin(r * 6.0 - shockwaveRef.current.time * 6.0) * shockwaveRef.current.intensity * 0.22;
          }
          const totalScale =
            1.0 +
            (cardiacScale + recoilDisplacement * 0.3 + audioRadialBulge) * 0.14 +
            wave +
            shock;
          positions[i3] = bx * totalScale;
          positions[i3 + 1] = by * totalScale;
          positions[i3 + 2] = bz * totalScale;
        } else {
          const vortex = Math.sin(by * 4.5 + bx * 3.5 - elapsedTime * 3.0) * 0.08;
          let shock = 0;
          if (shockwaveRef.current.active) {
            shock = Math.sin(r * 6.0 - shockwaveRef.current.time * 6.0) * shockwaveRef.current.intensity * 0.22;
          }
          const totalScale =
            1.0 +
            (cardiacScale + recoilDisplacement * 0.25 + audioRadialBulge) * 0.11 +
            vortex +
            shock;
          positions[i3] = bx * totalScale;
          positions[i3 + 1] = by * totalScale;
          positions[i3 + 2] = bz * totalScale;
        }
      }
      outerPosAttr.needsUpdate = true;
      outerGeometry.computeVertexNormals();

      if (innerCoreMesh) {
        innerCoreMesh.rotation.y -= 0.015;
        innerCoreMesh.rotation.x += 0.01;
        const endocardialScale =
          1.0 - (lub * 0.44 - dub * 0.18) + recoilDisplacement * 0.22 + audioRadialBulge * 0.25;
        innerCoreMesh.scale.set(endocardialScale, endocardialScale, endocardialScale);
      }

      if (aortaMesh && aortaGeometry && baseAortaPositions) {
        const aortaPosAttr = aortaGeometry.getAttribute("position") as THREE.BufferAttribute;
        const aPos = aortaPosAttr.array as Float32Array;
        const aBasePos = baseAortaPositions.array as Float32Array;
        const aCount = aortaPosAttr.count;

        const pwvPhase = (phase - 0.16 + 1.0) % 1.0;
        const pulseActive = pwvPhase < 0.32;
        const waveFront = pwvPhase / 0.32;

        for (let j = 0; j < aCount; j++) {
          const j3 = j * 3;
          const ax = aBasePos[j3];
          const ay = aBasePos[j3 + 1];
          const az = aBasePos[j3 + 2];

          const angle = Math.atan2(ay, ax);
          const normArc = (angle + Math.PI) / (Math.PI * 2);

          let waveExpansion = 0;
          if (pulseActive) {
            const dist = Math.abs(normArc - waveFront);
            waveExpansion = Math.exp(-Math.pow(dist / 0.14, 2)) * 0.38;
          }

          const aortaScale = 1.0 + waveExpansion + recoilDisplacement * 0.14 + audioRadialBulge * 0.3;
          aPos[j3] = ax * aortaScale;
          aPos[j3 + 1] = ay * aortaScale;
          aPos[j3 + 2] = az * aortaScale;
        }
        aortaPosAttr.needsUpdate = true;
        aortaMesh.position.y = 1.45 - lub * 0.09;
      }

      if (ringMesh) {
        ringMesh.rotation.x += 0.006;
        ringMesh.rotation.y += 0.009;
      }

      // --- VISCOUS ROTATIONAL INERTIA & FLUID TORQUE ---
      if (!isDraggingRef.current) {
        const fluidDamping = Math.exp(-1.2 * delta);
        dragVelocityRef.current.x *= fluidDamping;
        dragVelocityRef.current.y *= fluidDamping;

        baseRotationRef.current.y += dragVelocityRef.current.x;
        baseRotationRef.current.x += dragVelocityRef.current.y;

        // Gyroscopic precession during fast rotation
        if (Math.abs(dragVelocityRef.current.x) > 0.0001) {
          baseRotationRef.current.x +=
            dragVelocityRef.current.x * 0.045 * Math.sin(baseRotationRef.current.y);
        }

        // Auto-orbit unless frozen
        if (!isFrozen) {
          const speed = Math.hypot(dragVelocityRef.current.x, dragVelocityRef.current.y);
          const autoBlend = Math.max(0, Math.min(1, 1.0 - speed / 0.006));

          baseRotationRef.current.y += 0.0024 * autoBlend;
          baseRotationRef.current.x += Math.sin(elapsedTime * 0.75) * 0.0006 * autoBlend;

          const targetTiltX = -pointerPosRef.current.y * 0.35;
          const targetTiltY = pointerPosRef.current.x * 0.45;

          currentTilt.x += (targetTiltX - currentTilt.x) * 0.06;
          currentTilt.y += (targetTiltY - currentTilt.y) * 0.06;

          artifactGroup.rotation.x = baseRotationRef.current.x + currentTilt.x;
          artifactGroup.rotation.y = baseRotationRef.current.y + currentTilt.y;

          // Intrathoracic Respiration & Ballistocardiographic Recoil
          const respFloat = Math.sin(elapsedTime * 1.25) * 0.08;
          const ballisticRecoil = -lub * 0.07;
          artifactGroup.position.y = respFloat + ballisticRecoil;
        } else {
          artifactGroup.rotation.x = baseRotationRef.current.x;
          artifactGroup.rotation.y = baseRotationRef.current.y;
        }
      } else {
        artifactGroup.rotation.x = baseRotationRef.current.x;
        artifactGroup.rotation.y = baseRotationRef.current.y;
      }

      const degX = Math.round(((artifactGroup.rotation.x * 180) / Math.PI) % 360);
      const degY = Math.round(((artifactGroup.rotation.y * 180) / Math.PI) % 360);
      setRotationCoords({
        x: degX >= 0 ? degX : 360 + degX,
        y: degY >= 0 ? degY : 360 + degY,
      });

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      outerGeometry.dispose();
      innerCoreGeometry.dispose();
      aortaGeometry?.dispose();
      ringGeometry?.dispose();
      outerMaterial.dispose();
      innerCoreMaterial.dispose();
      conduitMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeTopology, isDense, isFrozen, colorTheme, bpmOverride]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const hemo = hemodynamicsRef.current;
    const dx = e.clientX - hemo.prevX;
    const dy = e.clientY - hemo.prevY;
    const speed = Math.hypot(dx, dy);

    hemo.mouseVelocity += speed * 0.16;
    hemo.lastInteractionTime = Date.now();
    hemo.prevX = e.clientX;
    hemo.prevY = e.clientY;

    pointerPosRef.current.x = normX;
    pointerPosRef.current.y = normY;
    pointerPosRef.current.isHovering = true;

    audioEngineRef.current?.init();

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragPrevRef.current.x;
      const deltaY = e.clientY - dragPrevRef.current.y;
      dragPrevRef.current = { x: e.clientX, y: e.clientY };

      const rotStepX = deltaY * 0.007;
      const rotStepY = deltaX * 0.007;

      baseRotationRef.current.x += rotStepX;
      baseRotationRef.current.y += rotStepY;

      dragVelocityRef.current = {
        x: dragVelocityRef.current.x * 0.3 + rotStepY * 0.7,
        y: dragVelocityRef.current.y * 0.3 + rotStepX * 0.7,
      };
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragPrevRef.current = { x: e.clientX, y: e.clientY };
    dragVelocityRef.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    let isDirectHit = false;
    if (cameraRef.current && outerMeshRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(normX, normY), cameraRef.current);
      const intersects = raycaster.intersectObject(outerMeshRef.current);

      if (intersects.length > 0) {
        isDirectHit = true;
        const localPt = outerMeshRef.current.worldToLocal(intersects[0].point.clone());
        localHitPointRef.current = {
          active: true,
          point: localPt,
          intensity: 1.2,
          phase: 0,
        };
      }
    }

    pointerDownInfoRef.current = {
      time: Date.now(),
      x: e.clientX,
      y: e.clientY,
      isDirectHeartHit: isDirectHit,
    };

    hemodynamicsRef.current.lastInteractionTime = Date.now();
    audioEngineRef.current?.init();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const elapsed = Date.now() - pointerDownInfoRef.current.time;
    const dist = Math.hypot(
      e.clientX - pointerDownInfoRef.current.x,
      e.clientY - pointerDownInfoRef.current.y
    );

    if (hemodynamicsRef.current.squeezeStrain > 0.2) {
      squeezeReboundRef.current = {
        active: true,
        intensity: hemodynamicsRef.current.squeezeStrain * 1.6,
      };
      audioEngineRef.current?.playSqueezeRebound();
      setIsTactileTouch(true);
      setTimeout(() => setIsTactileTouch(false), 260);
      hemodynamicsRef.current.squeezeStrain = 0;
    } else if (elapsed < 240 && dist < 8) {
      setIsTactileTouch(true);
      setTimeout(() => setIsTactileTouch(false), 240);
      audioEngineRef.current?.playTactileTap();
      hemodynamicsRef.current.mouseVelocity += 16;
    }
  };

  const handlePointerLeave = () => {
    pointerPosRef.current.isHovering = false;
    pointerPosRef.current.x = 0;
    pointerPosRef.current.y = 0;
    hemodynamicsRef.current.squeezeStrain = 0;
  };

  const shapeShortNames: Record<GeometryTopology, string> = {
    cyberHeart: "HEART",
    monolith: "MONOLITH",
    icosahedron: "CLUSTER",
    torusKnot: "VORTEX",
  };

  return (
    <div className="relative w-full h-full min-h-[460px] sm:min-h-[500px] bg-black border border-neutral-800 select-none overflow-hidden group flex flex-col">
      {/* 4-Corner Brutalist Crosshairs (+) */}
      <span aria-hidden="true" className="absolute top-2 left-2 text-xs font-mono text-neutral-600 group-hover:text-white pointer-events-none z-10 select-none">+</span>
      <span aria-hidden="true" className="absolute top-2 right-2 text-xs font-mono text-neutral-600 group-hover:text-white pointer-events-none z-10 select-none">+</span>
      <span aria-hidden="true" className="absolute bottom-2 left-2 text-xs font-mono text-neutral-600 group-hover:text-white pointer-events-none z-10 select-none">+</span>
      <span aria-hidden="true" className="absolute bottom-2 right-2 text-xs font-mono text-neutral-600 group-hover:text-white pointer-events-none z-10 select-none">+</span>

      {/* TOP HUD: Single-Line Biomechanical Status Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none font-mono text-[10px] uppercase tracking-wider">
        {/* Left: Cardiac Hemodynamics */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 shrink-0 ${
              isTactileTouch || tissueStrain > 20
                ? "bg-red-500 scale-150 animate-ping"
                : cardiacPhase === "SYSTOLE"
                ? "bg-red-500 scale-125"
                : "bg-neutral-600"
            } transition-transform duration-75`}
          />
          <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0 animate-pulse" />
          <span className="text-white font-bold truncate">
            {cardiacRhythm}
          </span>
          {tissueStrain > 15 && (
            <span className="text-[8px] px-1 py-0.2 border border-amber-600 bg-neutral-900 text-amber-400 font-semibold tracking-normal hidden xs:inline">
              [STRAIN: {tissueStrain}%]
            </span>
          )}
          <span className="text-neutral-300 font-bold tabular-nums">
            {currentBpm}_BPM
          </span>
          <span className="text-neutral-500 hidden sm:inline">
            [{cardiacPhase}]
          </span>
        </div>

        {/* Right: Live EKG Trace & 3D Coordinates */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Computer Audio Level Indicator */}
          {audioSource !== "IDLE" && (
            <div className="flex items-center gap-1 border border-emerald-900/60 bg-black/60 px-1 py-0.5">
              <span className="text-[8px] text-emerald-400 font-bold hidden xs:inline">
                {audioSource === "SYSTEM_AUDIO" ? "PC_AUDIO" : "MIC_IN"}:
              </span>
              <div className="flex items-end gap-0.5 h-3">
                {spectrumBars.map((val, idx) => (
                  <span
                    key={idx}
                    className="w-1 bg-emerald-400 transition-all duration-75"
                    style={{ height: `${Math.max(15, val * 100)}%` }}
                  />
                ))}
              </div>
              <span className="text-[8px] text-neutral-400 tabular-nums">
                {audioRmsPercent}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Activity className="w-2.5 h-2.5 text-emerald-400" />
            <svg
              className="w-14 sm:w-20 h-3.5 overflow-hidden"
              viewBox="0 0 130 30"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                fill="none"
                stroke={audioSource !== "IDLE" ? "#34d399" : "#10b981"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={ekgLine}
              />
            </svg>
          </div>
          <span className="text-neutral-500 tabular-nums text-[9px] hidden xs:inline">
            [{rotationCoords.x}°, {rotationCoords.y}°]
          </span>
        </div>
      </div>

      {/* BOTTOM HUD: Dual-Rack Interactive Cyber-Heart Controls */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto font-mono text-[9px] sm:text-[10px] uppercase tracking-wider">
        {/* RACK 1: Sound Reactivity, Audio Engine & Interventions */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-neutral-900 pb-1.5">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {/* LIVE COMPUTER AUDIO LOOPBACK SYNC */}
            <button
              onClick={handleToggleSystemAudio}
              title="Capture live sound from computer (Spotify, YouTube, games, DAW) to drive heart rate, ejection, and ripples"
              aria-label="Toggle computer system audio reactivity"
              className={`px-2 py-1 bg-black border transition-none font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap ${
                audioSource === "SYSTEM_AUDIO"
                  ? "border-emerald-400 text-emerald-300 bg-emerald-950/40 animate-pulse"
                  : "border-neutral-700 text-neutral-200 hover:border-emerald-400 hover:text-emerald-300"
              }`}
            >
              <Radio className={`w-2.5 h-2.5 ${audioSource === "SYSTEM_AUDIO" ? "text-emerald-400" : "text-neutral-400"}`} />
              <span>[PC SOUND: {audioSource === "SYSTEM_AUDIO" ? "ON" : "OFF"}]</span>
            </button>

            {/* MICROPHONE / LINE-IN SYNC */}
            <button
              onClick={handleToggleMicrophone}
              title="Capture live microphone or Stereo Mix input"
              aria-label="Toggle microphone reactivity"
              className={`px-1.5 py-1 bg-black border transition-none font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap ${
                audioSource === "MIC_INPUT"
                  ? "border-emerald-400 text-emerald-300 bg-emerald-950/40 animate-pulse"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              <Mic className="w-2.5 h-2.5" />
              <span>MIC</span>
            </button>

            {/* Audio Sensitivity Stepper */}
            {audioSource !== "IDLE" && (
              <button
                onClick={handleCycleAudioSens}
                title="Cycle audio reactivity sensitivity (0.8x / 1.2x / 1.8x / 2.5x)"
                className="px-1.5 py-1 bg-black border border-emerald-800 text-emerald-400 font-semibold cursor-pointer focus-ring whitespace-nowrap"
              >
                SENS: {audioSens}x
              </button>
            )}

            {/* Defibrillator Electrical Shock */}
            <button
              onClick={triggerDefibrillator}
              title="Deliver 200J electrical countershock (induces fibrillation wave & high-velocity recoil)"
              aria-label="Defibrillator electric shock"
              className="px-2 py-1 bg-black border border-neutral-700 hover:border-amber-400 hover:text-amber-300 transition-none text-neutral-200 font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap"
            >
              <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>[DEFIB]</span>
            </button>

            {/* Adrenaline / Epinephrine Surge */}
            <button
              onClick={triggerAdrenaline}
              title="Inject epinephrine bolus (induces hyper-contractile tachycardia & intense systolic wringing)"
              aria-label="Inject adrenaline bolus"
              className="px-2 py-1 bg-black border border-neutral-700 hover:border-red-400 hover:text-red-400 transition-none text-neutral-200 font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap"
            >
              <Flame className="w-2.5 h-2.5 text-red-500 fill-red-500" />
              <span>[ADRENALINE]</span>
            </button>

            {/* Manual CPR Compression */}
            <button
              onClick={triggerChestCompress}
              title="Manual ventricular compression (stroke volume ejection impulse)"
              aria-label="Perform chest compression"
              className="px-2 py-1 bg-black border border-neutral-700 hover:border-emerald-400 hover:text-emerald-300 transition-none text-neutral-200 font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap"
            >
              <Hand className="w-2.5 h-2.5 text-emerald-400" />
              <span>[COMPRESS]</span>
            </button>

            {/* 808 Bass Drive Mode */}
            <button
              onClick={handleCycleBassMode}
              title="Cycle 808 bass distortion mode (Sub / Tube / Overdrive)"
              aria-label={`Cycle 808 bass character. Currently ${bassMode}`}
              className="px-2 py-1 bg-black border border-neutral-800 hover:border-white hover:bg-white hover:text-black transition-none text-neutral-300 font-semibold cursor-pointer focus-ring whitespace-nowrap"
            >
              [808: {bassMode}]
            </button>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute 808s Sub-Bass" : "Mute 808s Sub-Bass"}
              aria-label={isMuted ? "Unmute 808s Sub-Bass" : "Mute 808s Sub-Bass"}
              className={`px-1.5 py-1 bg-black border transition-none font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap ${
                isMuted
                  ? "border-neutral-800 text-neutral-600 hover:text-white"
                  : "border-neutral-700 text-emerald-400 hover:border-emerald-400"
              }`}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? "OFF" : "ON"}</span>
            </button>
          </div>

          {/* BPM Stepper Controller */}
          <div className="flex items-center gap-1">
            <span className="text-neutral-500 text-[9px] hidden sm:inline">BPM:</span>
            <button
              onClick={() => adjustBpm(-10)}
              title="Decrease heart rate BPM"
              aria-label="Decrease BPM"
              className="px-1.5 py-1 bg-black border border-neutral-800 hover:border-white hover:text-white text-neutral-400 cursor-pointer focus-ring"
            >
              -10
            </button>
            <span className="px-1.5 text-white font-bold tabular-nums">
              {currentBpm}
            </span>
            <button
              onClick={() => adjustBpm(10)}
              title="Increase heart rate BPM"
              aria-label="Increase BPM"
              className="px-1.5 py-1 bg-black border border-neutral-800 hover:border-white hover:text-white text-neutral-400 cursor-pointer focus-ring"
            >
              +10
            </button>
            {bpmOverride !== null && (
              <button
                onClick={resetBpm}
                title="Reset BPM to autonomous hemodynamic mode"
                aria-label="Reset BPM to auto"
                className="px-1 py-1 text-neutral-500 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* RACK 2: Morphology, Windows Pop-Up & Always-On-Top */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Always-On-Top Pin Toggle (Available in both Desktop & Web) */}
            <button
              onClick={handleToggleAlwaysOnTop}
              title={isAlwaysOnTop ? "Always-On-Top is PINNED. Click to unpin." : "Keep window ALWAYS ON TOP over all desktop apps."}
              aria-label="Toggle keep window always on top"
              className={`px-2 py-1 bg-black border transition-none font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap ${
                isAlwaysOnTop
                  ? "border-emerald-400 text-emerald-300 bg-emerald-950/30"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              {isAlwaysOnTop ? <Pin className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" /> : <PinOff className="w-2.5 h-2.5" />}
              <span>[{isAlwaysOnTop ? "ON_TOP: PINNED" : "KEEP_ON_TOP"}]</span>
            </button>

            {/* Pop-Out Windows Widget Launcher (if not already popup) */}
            {!isPopupWindow && (
              <button
                onClick={handleOpenPopupWindow}
                title="Pop out into a standalone compact Windows desktop widget window"
                aria-label="Launch standalone popup window"
                className="px-2 py-1 bg-black border border-neutral-800 hover:border-white hover:text-white text-neutral-300 font-semibold cursor-pointer focus-ring flex items-center gap-1 whitespace-nowrap"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span>[POPUP ↗]</span>
              </button>
            )}

            {/* Color Palette Theme */}
            <button
              onClick={handleCycleColorTheme}
              title="Cycle wireframe color palette"
              aria-label={`Cycle wireframe color. Currently ${colorTheme}`}
              className="px-2 py-1 bg-black border border-neutral-800 hover:border-white hover:bg-white hover:text-black transition-none text-neutral-300 font-semibold cursor-pointer focus-ring whitespace-nowrap"
            >
              [COLOR: {colorTheme}]
            </button>

            {/* Orbit / Freeze Lock */}
            <button
              onClick={() => setIsFrozen((prev) => !prev)}
              title={isFrozen ? "Resume auto-orbit motion" : "Freeze current 3D rotation"}
              aria-label={isFrozen ? "Resume auto-orbit" : "Freeze rotation"}
              className={`px-2 py-1 bg-black border transition-none font-semibold cursor-pointer focus-ring whitespace-nowrap ${
                isFrozen
                  ? "border-amber-400 text-amber-300"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              [{isFrozen ? "FROZEN" : "ORBIT_AUTO"}]
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Shape Topology Cycle */}
            <button
              onClick={handleCycleTopology}
              title="Cycle 3D shape topology"
              aria-label={`Cycle 3D shape topology. Currently ${shapeShortNames[activeTopology]}`}
              className="px-2 py-1 bg-black border border-neutral-800 hover:border-white hover:bg-white hover:text-black transition-none text-neutral-300 font-semibold cursor-pointer focus-ring whitespace-nowrap"
            >
              [{shapeShortNames[activeTopology]} ↻]
            </button>

            {/* Density Toggle */}
            <button
              onClick={onToggleDensity}
              title="Toggle wireframe polygon density"
              aria-label="Toggle wireframe polygon density"
              className="px-1.5 sm:px-2 py-1 bg-black border border-neutral-800 hover:border-white hover:bg-white hover:text-black transition-none text-neutral-400 font-semibold cursor-pointer focus-ring whitespace-nowrap"
            >
              [{isDense ? "DENSE" : "SPARSE"}]
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 3D Canvas Mount with 3D Palpation, Squeeze & Fluid Drag */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing touch-none"
        title="Interactive 3D Heart: Hold on heart to squeeze/compress, Click to palpate/poke, Drag to orbit with apex lag, Fling to spin"
      />
    </div>
  );
}
