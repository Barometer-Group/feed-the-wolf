"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────
// To swap in your After Effects export:
//   1. Export from AE with the Bodymovin plugin  →  wolf.json
//   2. Drop the file into /public/wolf.json
//   3. Change ANIMATION_URL below to "/wolf.json"
//   Done. No other changes needed.
// ─────────────────────────────────────────────────────────────────────────────
const ANIMATION_URL = "/wolf-placeholder.json";

export function WolfLogo() {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch(ANIMATION_URL)
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(console.error);
  }, []);

  if (!animationData) {
    // Invisible placeholder keeps layout stable while loading
    return <div style={{ width: 200, height: 200 }} />;
  }

  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: 200, height: 200 }}
    />
  );
}
