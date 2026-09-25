export type AudioSourceType = "SYSTEM_AUDIO" | "MIC_INPUT" | "IDLE";

export interface AudioReactionFrame {
  isActive: boolean;
  sourceType: AudioSourceType;
  rms: number;           // Overall audio volume [0, 1]
  subBass: number;       // Sub-bass kick energy [0, 1] (20 - 75 Hz)
  bass: number;          // Low-end energy [0, 1] (75 - 250 Hz)
  mid: number;           // Mid-range vocal/instrument energy [0, 1] (250 - 2000 Hz)
  high: number;          // High treble/percussion energy [0, 1] (2000 - 10000 Hz)
  isBeat: boolean;       // Instantaneous kick / transient trigger
  beatIntensity: number; // [0, 1]
  estimatedBpm: number;  // Dynamic tempo tracking [60, 190]
  spectrum5: [number, number, number, number, number]; // 5-band telemetry bars
}

export class SystemAudioReactor {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;

  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(256));
  private sourceType: AudioSourceType = "IDLE";
  private sensitivity: number = 1.2;

  // Transient beat detector state
  private lastBeatTime: number = 0;
  private bassThreshold: number = 0.15;
  private estimatedBpm: number = 72;
  private recentIntervals: number[] = [];

  // Fallback idle frame
  private currentFrame: AudioReactionFrame = {
    isActive: false,
    sourceType: "IDLE",
    rms: 0,
    subBass: 0,
    bass: 0,
    mid: 0,
    high: 0,
    isBeat: false,
    beatIntensity: 0,
    estimatedBpm: 72,
    spectrum5: [0, 0, 0, 0, 0],
  };

  public setSensitivity(multiplier: number) {
    this.sensitivity = Math.max(0.4, Math.min(3.0, multiplier));
  }

  public getSensitivity(): number {
    return this.sensitivity;
  }

  public getSourceType(): AudioSourceType {
    return this.sourceType;
  }

  public isConnected(): boolean {
    return this.sourceType !== "IDLE" && this.mediaStream !== null;
  }

  /**
   * Captures Computer Sound (Loopback / System Audio)
   * Uses navigator.mediaDevices.getDisplayMedia with system audio enabled.
   */
  public async connectSystemAudio(): Promise<boolean> {
    this.disconnect();
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("getDisplayMedia is not supported in this environment");
      }

      // Prompt user to capture screen/window with system audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        } as MediaTrackConstraints,
        audio: {
          suppressLocalAudioPlayback: false,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } as MediaTrackConstraints,
        systemAudio: "include",
      } as DisplayMediaStreamOptions & { systemAudio?: string });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        // User didn't check "Share system audio"
        stream.getTracks().forEach((t) => t.stop());
        alert("No system audio track detected! Please make sure to check 'Also share system audio' in the share dialog.");
        return false;
      }

      // Stop video track immediately to conserve CPU & memory
      stream.getVideoTracks().forEach((track) => track.stop());

      this.mediaStream = stream;
      this.sourceType = "SYSTEM_AUDIO";
      this.setupAudioGraph(stream);

      // Handle user stopping the share from OS bar
      audioTracks[0].onended = () => {
        this.disconnect();
      };

      return true;
    } catch (err: unknown) {
      console.warn("Failed to connect system audio:", err);
      return false;
    }
  }

  /**
   * Captures Microphone or Line-In / Stereo Mix
   */
  public async connectMicrophone(): Promise<boolean> {
    this.disconnect();
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not supported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.mediaStream = stream;
      this.sourceType = "MIC_INPUT";
      this.setupAudioGraph(stream);

      stream.getAudioTracks()[0].onended = () => {
        this.disconnect();
      };

      return true;
    } catch (err) {
      console.warn("Failed to connect microphone:", err);
      return false;
    }
  }

  private setupAudioGraph(stream: MediaStream) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioCtx();
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.55;

    this.sourceNode.connect(this.analyser);
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  public disconnect() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.sourceType = "IDLE";
    this.currentFrame = {
      isActive: false,
      sourceType: "IDLE",
      rms: 0,
      subBass: 0,
      bass: 0,
      mid: 0,
      high: 0,
      isBeat: false,
      beatIntensity: 0,
      estimatedBpm: 72,
      spectrum5: [0, 0, 0, 0, 0],
    };
  }

  /**
   * Sample the latest audio frame in the animation loop.
   */
  public update(nowSeconds: number): AudioReactionFrame {
    if (!this.analyser || this.sourceType === "IDLE") {
      return this.currentFrame;
    }

    this.analyser.getByteFrequencyData(this.freqData);

    const s = this.sensitivity;

    // Band energy averages (256 bins total, ~86Hz per bin)
    // 0..1: Sub-bass (0 - 170Hz)
    const subBassRaw = ((this.freqData[0] + this.freqData[1]) / 2 / 255) * s;
    const subBass = Math.min(1.0, subBassRaw);

    // 2..4: Low bass & body (170 - 430Hz)
    const bassRaw = ((this.freqData[2] + this.freqData[3] + this.freqData[4]) / 3 / 255) * s;
    const bass = Math.min(1.0, bassRaw);

    // 5..20: Mid-range vocals/instruments (430 - 1800Hz)
    let midSum = 0;
    for (let i = 5; i <= 20; i++) midSum += this.freqData[i];
    const mid = Math.min(1.0, (midSum / 16 / 255) * s);

    // 21..80: Presence & Highs (1800 - 7000Hz)
    let highSum = 0;
    for (let i = 21; i <= 80; i++) highSum += this.freqData[i];
    const high = Math.min(1.0, (highSum / 60 / 255) * s);

    // Overall RMS
    const rms = Math.min(1.0, (subBass * 0.4 + bass * 0.3 + mid * 0.2 + high * 0.1));

    // Dynamic Kick / Transient Beat Detection
    let isBeat = false;
    let beatIntensity = 0;

    // Adaptive threshold following
    this.bassThreshold = Math.max(0.12, this.bassThreshold * 0.94 + subBass * 0.06);

    const beatLead = subBass - this.bassThreshold;
    const minBeatInterval = 0.26; // Maximum ~230 BPM

    if (subBass > 0.18 && beatLead > 0.1 && nowSeconds - this.lastBeatTime > minBeatInterval) {
      isBeat = true;
      beatIntensity = Math.min(1.0, beatLead * 2.2 + 0.35);

      if (this.lastBeatTime > 0) {
        const interval = nowSeconds - this.lastBeatTime;
        if (interval >= 0.28 && interval <= 1.35) {
          this.recentIntervals.push(interval);
          if (this.recentIntervals.length > 5) this.recentIntervals.shift();

          const avgInterval =
            this.recentIntervals.reduce((a, b) => a + b, 0) / this.recentIntervals.length;
          const targetBpm = Math.round(60 / avgInterval);
          if (targetBpm >= 55 && targetBpm <= 190) {
            this.estimatedBpm = Math.round(
              this.estimatedBpm * 0.7 + targetBpm * 0.3
            );
          }
        }
      }
      this.lastBeatTime = nowSeconds;
    }

    // 5-band spectrum for brutalist HUD telemetry
    const b1 = Math.min(1.0, subBass);
    const b2 = Math.min(1.0, bass);
    const b3 = Math.min(1.0, mid);
    const b4 = Math.min(1.0, ((this.freqData[30] + this.freqData[50]) / 2 / 255) * s);
    const b5 = Math.min(1.0, high);

    this.currentFrame = {
      isActive: true,
      sourceType: this.sourceType,
      rms,
      subBass,
      bass,
      mid,
      high,
      isBeat,
      beatIntensity,
      estimatedBpm: this.estimatedBpm,
      spectrum5: [b1, b2, b3, b4, b5],
    };

    return this.currentFrame;
  }
}
