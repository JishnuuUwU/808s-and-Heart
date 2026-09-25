"use client";

import { useState } from "react";
import SpecimenViewport, { GeometryTopology } from "@/components/SpecimenViewport";
import { ExternalLink, Pin, Radio } from "lucide-react";

export default function Home() {
  const [topology, setTopology] = useState<GeometryTopology>("cyberHeart");
  const [isDense, setIsDense] = useState<boolean>(true);

  const handleOpenPopup = () => {
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

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-3 sm:p-6 font-mono select-none">
      <div className="w-full max-w-4xl flex flex-col gap-2.5">
        {/* Terminal Header Bar */}
        <header className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-2 text-xs uppercase tracking-widest text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h1 className="font-bold text-white tracking-wider">CYBER_HEART // SPECIMEN_01</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenPopup}
              title="Launch compact Windows desktop pop-up window"
              className="px-2 py-0.5 border border-neutral-700 bg-neutral-900/60 hover:border-emerald-400 hover:text-emerald-300 text-[10px] text-neutral-300 flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>[LAUNCH POP-UP WINDOW]</span>
            </button>
            <span className="text-[10px] text-neutral-600 hidden md:inline">
              HEMODYNAMICS_LAB
            </span>
          </div>
        </header>

        {/* 3D Interactive Viewport Mount */}
        <div className="w-full h-[520px] sm:h-[580px] shadow-2xl border border-neutral-900">
          <SpecimenViewport
            geometryType={topology}
            isDense={isDense}
            onToggleDensity={() => setIsDense((prev) => !prev)}
            onSelectTopology={(top) => setTopology(top)}
          />
        </div>

        {/* Telemetry Instruction Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500 border-t border-neutral-900 pt-2 uppercase">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span>[PC SOUND: CLICK &apos;PC SOUND&apos; TO REACT TO SPOTIFY/GAMES/DAW]</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" />
              <span>[PIN: KEEP ON TOP OVER ALL APPS]</span>
            </span>
          </span>
          <span>DESKTOP_POPUP // WEB_PIP // SYSTEM_AUDIO_SYNC</span>
        </footer>
      </div>
    </main>
  );
}
