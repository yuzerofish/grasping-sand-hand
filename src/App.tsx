import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const frameCount = 137;
const restingProgress = 0.52;
const assetBase = import.meta.env.BASE_URL;
const framePath = (index: number) => `${assetBase}assets/release-cutout-frames/frame_${String(index).padStart(3, "0")}.webp`;

const phases = [
  {
    threshold: 0.34,
    eyebrow: "执",
    line: "越急，越像握住一块影子。",
  },
  {
    threshold: 0.72,
    eyebrow: "息",
    line: "慢下来，掌心开始有风。",
  },
  {
    threshold: 1,
    eyebrow: "空",
    line: "不再用力，沙自然离开。",
  },
];

export default function App() {
  const rafRef = useRef<number>(0);
  const progressRef = useRef(restingProgress);
  const velocityRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const hasInteractedRef = useRef(false);
  const [progress, setProgress] = useState(restingProgress);
  const [scrollSpeed, setScrollSpeed] = useState(0);

  const phase = useMemo(() => phases.find((item) => progress <= item.threshold) ?? phases[2], [progress]);
  const frameIndex = Math.round(progress * (frameCount - 1));
  const currentFrame = framePath(frameIndex);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    lastFrameTimeRef.current = performance.now();

    const syncMotion = (time: number) => {
      const elapsed = Math.max(16, time - lastFrameTimeRef.current);
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollYRef.current;
      const instantVelocity = Math.abs(delta) / elapsed;

      if (Math.abs(delta) > 0.6) {
        hasInteractedRef.current = true;
      }

      const smoothedVelocity = velocityRef.current * 0.78 + instantVelocity * 0.22;
      velocityRef.current = smoothedVelocity;

      const speedTension = hasInteractedRef.current ? clamp((smoothedVelocity - 0.08) / 1.1) : 0;
      const targetProgress = hasInteractedRef.current ? 0.9 - speedTension * 0.82 : restingProgress;
      const easing = hasInteractedRef.current ? 0.046 + speedTension * 0.16 : 0.08;
      const nextProgress = progressRef.current + (targetProgress - progressRef.current) * easing;

      progressRef.current = clamp(nextProgress);
      lastScrollYRef.current = scrollY;
      lastFrameTimeRef.current = time;

      setProgress(progressRef.current);
      setScrollSpeed(speedTension);
      rafRef.current = window.requestAnimationFrame(syncMotion);
    };

    const markInteraction = () => {
      hasInteractedRef.current = true;
    };

    rafRef.current = window.requestAnimationFrame(syncMotion);
    window.addEventListener("wheel", markInteraction, { passive: true });
    window.addEventListener("touchmove", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction);

    return () => {
      window.removeEventListener("wheel", markInteraction);
      window.removeEventListener("touchmove", markInteraction);
      window.removeEventListener("keydown", markInteraction);
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
          "--speed": scrollSpeed,
          "--copy-darkness": clamp(progress * 1.9),
        } as CSSProperties
      }
    >
      <section className="scroll-scene" aria-label="握沙之手滚动场景">
        <div className="sticky-stage">
          <div className="atmosphere" aria-hidden="true">
            <div className="shadow-orb" />
            <div className="release-orb" />
            <div className="grain-field" />
          </div>

          <div className="scene-copy">
            <p className="scene-kicker">急则执 · 缓则松</p>
            <h1>{phase.eyebrow}</h1>
            <p>{phase.line}</p>
          </div>

          <div className="video-field" aria-hidden="true">
            <img className="release-frame" src={currentFrame} alt="" draggable={false} />
            <div className="video-sheen" />
          </div>

          <div className="phase-rail" aria-label="阶段">
            <span className={progress < 0.34 ? "active" : ""}>执</span>
            <span className={progress >= 0.34 && progress < 0.74 ? "active" : ""}>息</span>
            <span className={progress >= 0.74 ? "active" : ""}>空</span>
          </div>
        </div>
      </section>
    </main>
  );
}
