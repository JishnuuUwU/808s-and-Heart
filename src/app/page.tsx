"use client";

import { useState } from "react";
import SpecimenViewport, { GeometryTopology } from "@/components/SpecimenViewport";

export default function DesktopApp() {
  const [topology, setTopology] = useState<GeometryTopology>("cyberHeart");
  const [isDense, setIsDense] = useState<boolean>(true);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col font-mono select-none overflow-hidden">
      <SpecimenViewport
        geometryType={topology}
        isDense={isDense}
        onToggleDensity={() => setIsDense((prev) => !prev)}
        onSelectTopology={(top) => setTopology(top)}
        isPopupWindow={true}
      />
    </div>
  );
}
