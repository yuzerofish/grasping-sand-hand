import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const frameCount = 137;
const assetBase = import.meta.env.BASE_URL;
const framePath = (index: number) => `${assetBase}assets/release-cutout-frames/frame_${String(index).padStart(3, "0")}.webp`;

const phases = [
  {
    threshold: 0.3,
    eyebrow: "执",
    line: "越用力，越握不住。",
  },
  {
    threshold: 0.72,
    eyebrow: "落",
    line: "沙落下，不必挽留。",
  },
  {
    threshold: 1,
    eyebrow: "空",
    line: "掌心空了，心也有了位置。",
  },
];

export default function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);

  const phase = useMemo(() => phases.find((item) => progress <= item.threshold) ?? phases[2], [progress]);
  const currentFrame = framePath(frameIndex);

  useEffect(() => {
    const syncProgress = () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const rect = scene.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const nextProgress = clamp(-rect.top / travel);
      const nextFrame = Math.round(nextProgress * (frameCount - 1));

      setProgress(nextProgress);
      setFrameIndex(nextFrame);
    };

    const scheduleSync = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        syncProgress();
      });
    };

    syncProgress();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    return () => {
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      for (let index = 0; index < frameCount; index += 1) {
        const image = new Image();
        image.decoding = "async";
        image.src = framePath(index);
      }
    }, 260);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main
      className="release-page"
      style={
        {
          "--progress": progress,
          "--tension": 1 - progress,
          "--copy-darkness": clamp(progress * 1.9),
        } as CSSProperties
      }
    >
      <section ref={sceneRef} className="scroll-scene" aria-label="握沙之手滚动场景">
        <div className="sticky-stage">
          <div className="atmosphere" aria-hidden="true">
            <div className="shadow-orb" />
            <div className="release-orb" />
            <div className="grain-field" />
          </div>

          <div className="scene-copy">
            <p className="scene-kicker">一握一放</p>
            <h1>{phase.eyebrow}</h1>
            <p>{phase.line}</p>
          </div>

          <div className="video-field" aria-hidden="true">
            <img className="release-frame" src={currentFrame} alt="" draggable={false} />
            <div className="video-sheen" />
          </div>

          <div className="phase-rail" aria-label="阶段">
            <span className={progress < 0.34 ? "active" : ""}>执</span>
            <span className={progress >= 0.34 && progress < 0.74 ? "active" : ""}>落</span>
            <span className={progress >= 0.74 ? "active" : ""}>空</span>
          </div>
        </div>
      </section>
    </main>
  );
}
