# CYBER_HEART // SPECIMEN_01
## Standalone Biomechanical Hemodynamics Simulator & Windows Desktop Specimen

---

### Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Biomechanical Mechanics & Mathematical Formulations](#2-biomechanical-mechanics--mathematical-formulations)
   - [2.1 Kelvin-Voigt Viscoelastic Harmonic Oscillator](#21-kelvin-voigt-viscoelastic-harmonic-oscillator)
   - [2.2 Second-Order Apex Inertial Lag & Gyroscopic Precession](#22-second-order-apex-inertial-lag--gyroscopic-precession)
   - [2.3 Sculptural Parametric Myocardial Geometry](#23-sculptural-parametric-myocardial-geometry)
   - [2.4 Levocardia Apex Wringing, MAPSE Descent & Poisson Bulge](#24-levocardia-apex-wringing-mapse-descent--poisson-bulge)
   - [2.5 Direct Raycast Palpation & Hydrostatic Compression](#25-direct-raycast-palpation--hydrostatic-compression)
3. [Digital Signal Processing (DSP) & Audio Engine](#3-digital-signal-processing-dsp--audio-engine)
   - [3.1 Web Audio Analog 808 Sub-Bass Synthesizer](#31-web-audio-analog-808-sub-bass-synthesizer)
   - [3.2 Drive Stage Transfer Functions](#32-drive-stage-transfer-functions)
   - [3.3 Real-Time System Audio Loopback Reactor](#33-real-time-system-audio-loopback-reactor)
   - [3.4 FFT Band Partitioning & Spectral Flux Beat Detection](#34-fft-band-partitioning--spectral-flux-beat-detection)
   - [3.5 Inter-Beat Interval (IBI) Dynamic BPM Tracking](#35-inter-beat-interval-ibi-dynamic-bpm-tracking)
4. [Windows Desktop Pop-Up Window & Window Management](#4-windows-desktop-pop-up-window--window-management)
   - [4.1 Electron Native Desktop Process Architecture](#41-electron-native-desktop-process-architecture)
   - [4.2 Always-On-Top Layering Mechanism](#42-always-on-top-layering-mechanism)
   - [4.3 Chromium Document Picture-in-Picture (PiP) Implementation](#43-chromium-document-picture-in-picture-pip-implementation)
   - [4.4 Audio Permission Delegation & Loopback Capture Pipeline](#44-audio-permission-delegation--loopback-capture-pipeline)
5. [Telemetry, HUD State Machine & Interventions](#5-telemetry-hud-state-machine--interventions)
   - [5.1 Cardiac Rhythm State Transitions](#51-cardiac-rhythm-state-transitions)
   - [5.2 Synthetic P-Q-R-S-T Electrocardiogram Generator](#52-synthetic-p-q-r-s-t-electrocardiogram-generator)
   - [5.3 Clinical Interventions (Defibrillator, Adrenaline, CPR)](#53-clinical-interventions-defibrillator-adrenaline-cpr)
6. [Compilation, Execution & Project Structure](#6-compilation-execution--project-structure)
   - [6.1 Prerequisites](#61-prerequisites)
   - [6.2 CLI Commands & Runtime Modes](#62-cli-commands--runtime-modes)
   - [6.3 Repository Layout](#63-repository-layout)

---

### 1. System Architecture Overview

The Cyber-Heart Specimen is a low-latency, deterministic 3D biomechanical visualization and sound-reactive engine. It combines real-time WebGL vertex manipulation, a non-linear viscoelastic solver, analog sub-bass sound synthesis, and real-time audio FFT spectral analysis into a standalone desktop application.

```
+---------------------------------------------------------------------------------------+
|                                    INPUT SOURCES                                      |
|  [Pointer/Raycast]          [Computer Audio Loopback]          [Microphone / Line-In] |
+----------+-----------------------------+----------------------------------+-----------+
           |                             |                                  |
           v                             v                                  v
+--------------------+       +-------------------------+       +------------------------+
| 3D Palpation &     |       | SystemAudioReactor      |       | Web Audio 808 Synth    |
| Mouse Inertia      |       | - 512-point FFT         |       | - Pitch Dive Osc       |
| - Raycast hit point|       | - Band integration      |       | - WaveShaper (k-curve) |
| - Squeeze strain   |       | - Adaptive Flux Onset   |       | - Biquad Lowshelf/LPF  |
| - Angular velocity |       | - Dynamic IBI BPM Track |       | - Envelope Gain Ramp   |
+----------+---------+       +------------+------------+       +-----------+------------+
           |                              |                                |
           +----------------------+       |                                |
                                  |       |                                |
                                  v       v                                v
                       +---------------------------------------+   +--------------------+
                       | Myocardial Dynamics & Physics Solver  |<--| Autonomic Cardiac  |
                       | - Kelvin-Voigt Viscoelastic Oscillator|   | Cycle Clock        |
                       | - 2nd-Order Apex Inertial Sway        |   | - Systolic LUB     |
                       | - Levocardia Wringing & MAPSE Shorten |   | - Diastolic DUB    |
                       | - Poisson Equatorial Bulge            |   | - EKG Synthesizer  |
                       +------------------+--------------------+   +--------------------+
                                          |
                                          v
                       +---------------------------------------+
                       | Three.js WebGL Rendering Pipeline     |
                       | - Dynamic Vertex Buffer Shifting      |
                       | - Normal Recomputation               |
                       | - Dual Conduit / Core Meshes          |
                       +------------------+--------------------+
                                          |
                                          v
                       +---------------------------------------+
                       | Display & Window Management           |
                       | - Next.js 15+ App Router Viewport     |
                       | - Electron Frameless Desktop Window   |
                       | - OS-Level Always-On-Top Layering     |
                       | - Document Picture-in-Picture (PiP)   |
                       +---------------------------------------+
```

---

### 2. Biomechanical Mechanics & Mathematical Formulations

#### 2.1 Kelvin-Voigt Viscoelastic Harmonic Oscillator

Myocardial tissue is modeled as an underdamped Kelvin-Voigt viscoelastic solid responding to mechanical and electrical forcing functions. The governing second-order non-homogeneous ordinary differential equation is:

$$m \frac{d^2 x}{dt^2} + c \frac{dx}{dt} + k x = F(t)$$

Expressed in state-space form with natural angular frequency $\omega_n$ and damping ratio $\zeta$:

$$\frac{dv}{dt} = -\omega_n^2 x - 2\zeta\omega_n v + \frac{F_{\text{total}}(t)}{m}$$

$$\frac{dx}{dt} = v$$

Where:
- $\omega_n = 24.0\text{ rad/s}$ (undamped angular frequency of ventricular myocardium)
- $\zeta = 0.28$ (dimensionless underdamped ratio yielding characteristic post-systolic oscillatory recoil)
- $m = 1.0\text{ kg}$ (normalized effective mass)

The net forcing term $F_{\text{total}}(t)$ is the instantaneous sum of internal and external stimuli:

$$F_{\text{total}}(t) = F_{\text{systole}}(t) + F_{\text{defib}}(t) + F_{\text{palpation}}(t) + F_{\text{rebound}}(t) + F_{\text{audio}}(t)$$

Where:
- **Systolic Acceleration**:
  $$F_{\text{systole}}(t) = \max(0, \text{lub}(t) - 0.12) \cdot 18.0 \cdot (1.0 + 0.8 \cdot \alpha_{\text{adrenaline}})$$
- **Defibrillator Discharge Impulse**:
  $$F_{\text{defib}}(t) = \sin(24.0 \cdot t_{\text{shock}}) \cdot I_{\text{defib}} \cdot 14.0$$
- **Contact Palpation Impulse**:
  $$F_{\text{palpation}}(t) = I_{\text{hit}} \cdot 22.0$$
- **Extra-Systolic Release Rebound**:
  $$F_{\text{rebound}}(t) = I_{\text{rebound}} \cdot 28.0$$
- **Low-Frequency Audio Forcing**:
  $$F_{\text{audio}}(t) = E_{\text{subBass}} \cdot 16.0 + (\delta_{\text{beat}} \cdot I_{\text{beat}} \cdot 24.0)$$

Numerical integration is executed at each frame $\Delta t$ using a semi-implicit Euler formulation with boundary clamping:

$$v_{t+\Delta t} = v_t + \left(-\omega_n^2 x_t - 2\zeta\omega_n v_t + F_{\text{total}}(t)\right) \Delta t$$

$$x_{t+\Delta t} = \text{clamp}(x_t + v_{t+\Delta t} \Delta t, -0.65, 0.75)$$

#### 2.2 Second-Order Apex Inertial Lag & Gyroscopic Precession

The cardiac apex experiences anatomical inertia relative to the fixed mediastinal base. When the specimen is rotated by mouse drag or torque flicking, the apex lags behind the angular velocity vector via a damped spring model:

$$\frac{d^2 \mathbf{S}}{dt^2} + c_{\text{apex}} \frac{d\mathbf{S}}{dt} + k_{\text{apex}} (\mathbf{S} - \mathbf{S}_{\text{target}}) = \mathbf{0}$$

Where:
- $k_{\text{apex}} = 34.0\text{ s}^{-2}$ (restoring stiffness)
- $c_{\text{apex}} = 6.4\text{ s}^{-1}$ (viscous damping coefficient)
- $\mathbf{S}_{\text{target}} = 3.2 \cdot \mathbf{v}_{\text{drag}}$ (target displacement proportional to rotational drag velocity)

Gyroscopic precession is applied to the global orientation matrix during high-rate yaw rotation:

$$\Delta \theta_x = \omega_y \cdot 0.045 \cdot \sin(\theta_y)$$

#### 2.3 Sculptural Parametric Myocardial Geometry

The baseline geometry is generated from an isotropic sphere $S^2$ with radius $R = 1.55$ and vertex tessellation density $N \in \{16, 32\}$. Vertices $(x, y, z)$ are displaced to produce clinically accurate ventricular and atrial morphologies:

1. **Ventricular Conical Taper ($y < 0$)**:
   $$\kappa(y) = \max(0.08, 1.0 + 0.48 y)$$
   $$x \leftarrow x \cdot \kappa(y), \quad z \leftarrow z \cdot \kappa(y) \cdot 0.82, \quad y \leftarrow y \cdot 1.35$$

2. **Left Ventricular Levocardia Tilt**:
   $$x \leftarrow x - (-y) \cdot 0.08, \quad z \leftarrow z + (-y) \cdot 0.05$$

3. **Anterior Interventricular Sulcus**:
   For $x \in [-0.25, 0.25]$ and $z > 0$:
   $$z \leftarrow z - \exp\left(-\left(\frac{x}{0.22}\right)^2\right) \cdot 0.12 \cdot \left(\frac{-y}{1.5}\right)$$

4. **Atrial Lobes and Superior Base ($y \ge 0$)**:
   $$y \leftarrow y + (|x| \cdot 0.44 - 0.26), \quad x \leftarrow x \cdot 1.15, \quad z \leftarrow z \cdot 0.90$$

5. **Levocardia Anatomical Angle Correction**:
   $$x \leftarrow x + 0.12 y$$

#### 2.4 Levocardia Apex Wringing, MAPSE Descent & Poisson Bulge

During isovolumetric contraction and rapid systolic ejection, the left ventricle undergoes helical wringing (apex rotates counter-clockwise relative to the base):

1. **Torsion Angle Calculation**:
   Given normalized vertical coordinate $\hat{y} = \text{clamp}(y / 1.55, -1.0, 1.0)$:
   $$\theta_{\text{torsion}} = (\hat{y} < 0 ? 0.34 \hat{y} : 0.07 \hat{y}) \cdot A_{\text{systole}} \cdot (1.0 + 0.6 \alpha_{\text{adrenaline}} + 0.4 E_{\text{mid}})$$

2. **Helical Rotation**:
   $$\begin{bmatrix} x' \\ z' \end{bmatrix} = \begin{bmatrix} \cos\theta_{\text{torsion}} & -\sin\theta_{\text{torsion}} \\ \sin\theta_{\text{torsion}} & \cos\theta_{\text{torsion}} \end{bmatrix} \begin{bmatrix} x \\ z \end{bmatrix}$$

3. **Mitral Annular Plane Systolic Excursion (MAPSE) & Poisson Bulging**:
   Longitudinal myocardial shortening strains the base towards the apex, creating compensatory lateral wall thickening to conserve cellular volume:
   $$\epsilon_L = 0.18 \cdot A_{\text{systole}}$$
   $$y' = y \cdot (1.0 - \epsilon_L) \quad (\text{for } y < 0)$$
   $$w_{\text{equator}} = \exp\left(-\left(\frac{y + 0.35}{0.72}\right)^2\right)$$
   $$\nu_{\text{poisson}} = 1.0 + (0.58 \epsilon_L + 0.18 A_{\text{systole}} + \Delta r_{\text{audio}}) \cdot w_{\text{equator}}$$
   $$x' \leftarrow x' \cdot \nu_{\text{poisson}}, \quad z' \leftarrow z' \cdot \nu_{\text{poisson}}$$

#### 2.5 Direct Raycast Palpation & Hydrostatic Compression

When pointer input intersects the mesh, 3D raycasting transforms the contact position into the local coordinate system of the heart $\mathbf{p}_{\text{hit}} \in \mathbb{R}^3$.

- **Local Indentation**:
  Vertices within radial distance $d = \|\mathbf{p} - \mathbf{p}_{\text{hit}}\|$ receive an inward displacement:
  $$\Delta r_{\text{indent}} = -0.32 \exp\left(-\frac{d^2}{0.16}\right) \cdot (1.0 + 0.7 \cdot \mathbb{I}_{\text{drag}})$$

- **Hydrostatic Ring Bulge (Conservation of Volume)**:
  Surrounding tissue is forced outward:
  $$\Delta r_{\text{bulge}} = 0.14 \exp\left(-\left(\frac{d^2 - 0.24}{0.18}\right)^2\right)$$

- **Continuous Hydrostatic Squeeze**:
  Holding mouse input increases tissue strain $\epsilon_{\text{squeeze}} \in [0, 1]$ at a rate of $2.5\text{ s}^{-1}$. Transverse axes contract while longitudinal axis elongates:
  $$x' \leftarrow x' \cdot (1 - 0.25 \epsilon_{\text{squeeze}}), \quad z' \leftarrow z' \cdot (1 - 0.25 \epsilon_{\text{squeeze}}), \quad y' \leftarrow y' \cdot (1 + 0.175 \epsilon_{\text{squeeze}})$$
  Releasing input abruptly unloads strain, triggering a high-amplitude extra-systolic rebound snap.

---

### 3. Digital Signal Processing (DSP) & Audio Engine

#### 3.1 Web Audio Analog 808 Sub-Bass Synthesizer

The sound engine is constructed using modular Web Audio API nodes:

```
+---------------+      +------------------+      +-------------------+
| OscillatorNode|----->| WaveShaperNode   |----->| BiquadFilterNode  |
| (Sine Wave)   |      | (Nonlinear Curve)|      | (Lowshelf Boost)  |
+---------------+      +------------------+      +---------+---------+
                                                           |
                                                           v
+------------------+      +-------------------+  +-------------------+
| AudioDestination |<-----| GainNode          |<-| BiquadFilterNode  |
| (Speakers/Output)|      | (Exponential Env) |  | (Lowpass Cutoff)  |
+------------------+      +-------------------+  +-------------------+
```

- **Systolic Kick (LUB)**:
  - Base oscillator: Sine wave
  - Pitch dive: Frequency ramps exponentially from $f_0 = 115\text{ Hz} + \Delta f$ down to $f_1 = 38\text{ Hz}$ across $\tau = 75\text{ ms}$:
    $$f(t) = f_0 \cdot \left(\frac{f_1}{f_0}\right)^{t / \tau}$$
  - Amplitude envelope: Attack linearly to $V_{\text{peak}} = 0.82 \cdot s_{\text{vol}}$ over $4\text{ ms}$, then decay exponentially to $10^{-4}$ over $720\text{ ms}$.

- **Diastolic Pulse (DUB)**:
  - Frequency sweeps exponentially from $72\text{ Hz}$ to $32\text{ Hz}$ over $65\text{ ms}$.
  - Amplitude peaks at $0.48$ with an exponential decay duration of $520\text{ ms}$.

#### 3.2 Drive Stage Transfer Functions

Non-linear saturation is computed via a 22,050-sample normalized symmetric Waveshaper curve:

$$f(x) = \frac{(3 + k) \cdot x \cdot 20 \cdot \frac{\pi}{180}}{\pi + k \cdot |x|}, \quad x \in [-1, 1]$$

| Mode | Distortion Factor $k$ | Lowshelf Gain | Lowpass Cutoff $f_c$ | Filter $Q$ | Harmonic Profile |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **SUB** | $k = 6$ | $+10.0\text{ dB}$ | $280\text{ Hz}$ | $2.2$ | Pure fundamental sub-bass (30 - 60 Hz emphasis) |
| **TUBE** | $k = 24$ | $+8.5\text{ dB}$ | $340\text{ Hz}$ | $2.2$ | 2nd & 3rd harmonic warm saturation |
| **OVERDRIVE** | $k = 64$ | $+7.5\text{ dB}$ | $480\text{ Hz}$ | $2.2$ | Hard asymmetric clipping & aggressive transient presence |

#### 3.3 Real-Time System Audio Loopback Reactor

The loopback module (`SystemAudioReactor`) connects to computer sound output using the browser display media pipeline:

```typescript
navigator.mediaDevices.getDisplayMedia({
  video: { displaySurface: "monitor" },
  audio: {
    suppressLocalAudioPlayback: false,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  systemAudio: "include",
});
```

Video tracks are immediately terminated (`track.stop()`) upon stream initialization, ensuring zero video rendering overhead and isolating the stereo audio stream.

#### 3.4 FFT Band Partitioning & Spectral Flux Beat Detection

The incoming audio stream is routed into an `AnalyserNode` configured with:
- FFT Window Size: $N_{\text{FFT}} = 512$
- Frequency Bin Count: $N_{\text{bins}} = 256$
- Smoothing Time Constant: $\alpha_{\text{smooth}} = 0.55$
- Effective Bin Width: $\Delta f = \frac{f_s}{N_{\text{FFT}}} \approx \frac{44100}{512} \approx 86.13\text{ Hz}$

Spectral bands are computed as normalized energy averages scaled by user sensitivity $S$:

$$E_{\text{subBass}} = \min\left(1.0, \frac{1}{2 \cdot 255} \sum_{i=0}^{1} X[i] \cdot S\right) \quad (\approx 0 - 172\text{ Hz})$$

$$E_{\text{bass}} = \min\left(1.0, \frac{1}{3 \cdot 255} \sum_{i=2}^{4} X[i] \cdot S\right) \quad (\approx 172 - 430\text{ Hz})$$

$$E_{\text{mid}} = \min\left(1.0, \frac{1}{16 \cdot 255} \sum_{i=5}^{20} X[i] \cdot S\right) \quad (\approx 430 - 1808\text{ Hz})$$

$$E_{\text{high}} = \min\left(1.0, \frac{1}{60 \cdot 255} \sum_{i=21}^{80} X[i] \cdot S\right) \quad (\approx 1808 - 6890\text{ Hz})$$

##### Dynamic Beat Detection Algorithm
A running adaptive threshold $\theta_{\text{bass}}(t)$ is updated recursively:

$$\theta_{\text{bass}}(t) = \max\left(0.12, \theta_{\text{bass}}(t - \Delta t) \cdot 0.94 + E_{\text{subBass}} \cdot 0.06\right)$$

A transient onset event ($\delta_{\text{beat}} = 1$) is registered if and only if:

$$E_{\text{subBass}} > 0.18 \quad \land \quad (E_{\text{subBass}} - \theta_{\text{bass}}) > 0.10 \quad \land \quad (t - t_{\text{lastBeat}}) > 0.26\text{ s}$$

Where:
- $0.26\text{ s}$ refractory interval enforces a maximum tracking ceiling of $\approx 230\text{ BPM}$.
- Beat intensity is mapped: $I_{\text{beat}} = \min(1.0, (E_{\text{subBass}} - \theta_{\text{bass}}) \cdot 2.2 + 0.35)$.

#### 3.5 Inter-Beat Interval (IBI) Dynamic BPM Tracking

When beats are detected within the physiological musical window $\Delta t_{\text{beat}} \in [0.28\text{ s}, 1.35\text{ s}]$ (corresponding to 44 - 214 BPM), intervals are pushed into a 5-sample FIFO queue. The estimated tempo is calculated via moving average and blended with a temporal recursive filter:

$$\overline{\Delta t} = \frac{1}{K} \sum_{j=1}^{K} \Delta t_j$$

$$\text{BPM}_{\text{target}} = \text{round}\left(\frac{60}{\overline{\Delta t}}\right)$$

$$\text{BPM}_{t} = \text{round}\left(0.70 \cdot \text{BPM}_{t-\Delta t} + 0.30 \cdot \text{BPM}_{\text{target}}\right)$$

The specimen's autonomic pacemaker smoothly glides toward $\text{BPM}_t$, synchronizing cardiac contraction with the tempo of external music.

---

### 4. Windows Desktop Pop-Up Window & Window Management

#### 4.1 Electron Native Desktop Process Architecture

The desktop edition separates tasks across two isolated processes:

```
+-------------------------------------------------------+
|                ELECTRON MAIN PROCESS                  |
|                 (electron/main.js)                    |
|  - BrowserWindow instantiation (460x580)              |
|  - Frameless display (`frame: false`)                 |
|  - Always-On-Top controller                           |
|  - System audio permission handler                    |
+---------------------------+---------------------------+
                            |  IPC Protocol (preload.js)
                            v
+-------------------------------------------------------+
|              CHROMIUM RENDERER PROCESS                |
|               (Next.js App / Client)                  |
|  - SpecimenViewport WebGL instance                    |
|  - Web Audio Context & Analyser                       |
|  - CSS Drag regions (`-webkit-app-region: drag`)      |
|  - UI State Synchronization                           |
+-------------------------------------------------------+
```

Preload script (`electron/preload.js`) exposes a secure, typed IPC bridge to the renderer:

```typescript
interface ElectronAPI {
  isElectron: boolean;
  getAlwaysOnTop: () => Promise<boolean>;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  minimize: () => void;
  close: () => void;
  toggleMaximize: () => void;
}
```

#### 4.2 Always-On-Top Layering Mechanism

In the native Windows desktop client, always-on-top positioning is asserted directly using the standard Win32 `HWND_TOPMOST` extended window style:

```javascript
mainWindow.setAlwaysOnTop(isAlwaysOnTop);
```

This guarantees the window remains floating above standard full-screen applications, games, terminals, and audio workstations without being obscured during window switching. The state can be dynamically toggled at runtime using the `[PIN]` control on the header bar or through the `window.electronAPI.setAlwaysOnTop` IPC method.

#### 4.3 Chromium Document Picture-in-Picture (PiP) Implementation

For environments executing without Electron, the application utilizes the Chromium **Document Picture-in-Picture API** to extract the React DOM tree into a floating OS-level window:

```typescript
const pipWindow = await window.documentPictureInPicture.requestWindow({
  width: 480,
  height: 600,
});
// Replicate style sheets into new window document
Array.from(document.styleSheets).forEach((sheet) => {
  if (sheet.href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = sheet.href;
    pipWindow.document.head.appendChild(link);
  }
});
pipWindow.location.href = "/popup";
```

#### 4.4 Audio Permission Delegation & Loopback Capture Pipeline

Electron handles audio capture permissions without prompting user confirmation by overriding `setPermissionRequestHandler`:

```javascript
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
  if (permission === "media" || permission === "display-capture" || permission === "audio-capture") {
    callback(true);
    return;
  }
  callback(true);
});
```

---

### 5. Telemetry, HUD State Machine & Interventions

#### 5.1 Cardiac Rhythm State Transitions

The specimen evaluates a priority-encoded state machine at every cycle:

```
                             +------------------------+
                             |   Evaluation Interval  |
                             +-----------+------------+
                                         |
               +-------------------------+-------------------------+
               |                         |                         |
               v                         v                         v
     [shockwave.active]        [squeezeStrain > 0.25]     [audioFrame.isActive]
               |                         |                         |
               v                         v                         v
     VENTRICULAR_FLUTTER         MANUAL_COMPRESSION       AUDIO_SYNC_RHYTHM
                                                                   |
                                              +--------------------+--------------------+
                                              |                                         |
                                              v                                         v
                                         [BPM > 100]                               [BPM < 60]
                                              |                                         |
                                              v                                         v
                                         TACHYCARDIA                               BRADYCARDIA
                                              |                                         |
                                              +--------------------+--------------------+
                                                                   |
                                                                   v
                                                             SINUS_RHYTHM
```

#### 5.2 Synthetic P-Q-R-S-T Electrocardiogram Generator

The live EKG trace is synthesized mathematically as a piecewise function of cardiac phase $\phi(t) \in [0, 1)$:

$$V_{\text{EKG}}(\phi) = \begin{cases}
4.5 \sin\left(\frac{\phi - 0.05}{0.05} \pi\right) & \text{for } 0.05 < \phi \le 0.10 \quad \text{(P wave / Atrial Depol)} \\
-3.5 & \text{for } 0.11 \le \phi < 0.13 \quad \text{(Q wave deflection)} \\
24.0 \cdot (1 + 0.35 \alpha_{\text{adrenaline}}) & \text{for } 0.13 \le \phi \le 0.17 \quad \text{(R peak / Ventricular Depol)} \\
-7.0 & \text{for } 0.17 < \phi \le 0.20 \quad \text{(S wave descent)} \\
7.5 \sin\left(\frac{\phi - 0.28}{0.14} \pi\right) & \text{for } 0.28 < \phi < 0.42 \quad \text{(T wave / Repolarization)} \\
0.0 & \text{otherwise (Isoelectric baseline)}
\end{cases}$$

When sound reactivity is active, transient musical kicks inject an immediate high-voltage spike:

$$V_{\text{EKG, audio}} = 26.0 \cdot I_{\text{beat}} + 12.0 \cdot E_{\text{subBass}} \cdot \sin(24.0 \cdot t)$$

Coordinates are mapped to a SVG viewBox ($130 \times 30$) and updated at $19\text{ Hz}$.

#### 5.3 Clinical Interventions (Defibrillator, Adrenaline, CPR)

| Intervention | Key Mechanism | Hemodynamic Response |
| :--- | :--- | :--- |
| **Defibrillator (`[DEFIB]`)** | 200J biphasic electrical countershock | Induces high-frequency ventricular fibrillation wave ($\omega = 54\text{ rad/s}$), spikes rate by $+46\text{ BPM}$, triggers Kelvin-Voigt impulse force ($F = 44.8\text{ N}$). |
| **Adrenaline (`[ADRENALINE]`)** | Epinephrine bolus injection ($\alpha = 1.0$) | Induces hyper-contractility, elevates heart rate by $+72\text{ BPM}$, magnifies levocardia wringing torsion by $+60\%$, decays over $\tau = 8.3\text{ s}$. |
| **Manual CPR (`[COMPRESS]`)** | Direct ventricular compression impulse | Forces stroke volume ejection displacement ($I = 1.6$), delivers rapid viscoelastic rebound snap ($F = 44.8\text{ N}$). |

---

### 6. Compilation, Execution & Project Structure

#### 6.1 Prerequisites

- **Node.js**: v20.0.0 or higher (Tested on Node.js v24.19.0)
- **Package Manager**: npm v10.0.0+ (Tested on npm v11.17.0)
- **Display System**: Modern GPU supporting WebGL2 / OpenGL ES 3.0
- **Audio Output**: System audio device running at 44.1 kHz or 48.0 kHz

#### 6.2 CLI Commands & Runtime Modes
 
 ```bash
 # 1. Install dependencies
 npm install
 
 # 2. Compile self-contained desktop bundle
 npm run build
 
 # 3. Launch the standalone Windows desktop pop-up application
 npm start
 # (Or double-click launch-desktop.bat in repository root,
 #  or double-click Cyber-Heart.lnk on your Windows Desktop)
 ```

#### 6.3 Repository Layout

```
.
|-- .gitignore                  # Build artifact and dependency exclusions
|-- README.md                   # Comprehensive engineering documentation
|-- electron/
|   |-- main.js                 # Electron main process (frameless, always-on-top, audio permissions)
|   `-- preload.js              # Context bridge exposing electronAPI to renderer
|-- next.config.ts              # Next.js 15+ configuration
|-- package.json                # Project dependencies, build targets, and scripts
|-- postcss.config.mjs          # PostCSS configuration with Tailwind plugin
|-- src/
|   |-- app/
|   |   |-- globals.css         # CSS base rules and custom utility classes
|   |   |-- layout.tsx          # Root layout with dark mode metadata
|   |   |-- page.tsx            # Full viewport standalone host page
|   |   `-- popup/
|   |       `-- page.tsx        # Dedicated edge-to-edge popup widget route
|   |-- components/
|   |   `-- SpecimenViewport.tsx# Complete 3D biomechanical WebGL simulator and HUD
|   |-- lib/
|   |   `-- audioReactor.ts     # Loopback audio capture, FFT analysis & beat detector
|   `-- types/
|       `-- electron.d.ts       # TypeScript definitions for Electron and PiP APIs
|-- tailwind.config.ts          # Tailwind design tokens and custom breakpoints (xs: 420px)
`-- tsconfig.json               # TypeScript compiler configuration with strict path mapping
```