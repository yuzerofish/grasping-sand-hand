import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const frameCount = 137;
const restingProgress = 0.52;
const openProgress = 0.92;
const closedProgress = 0.06;
const assetBase = import.meta.env.BASE_URL;
const framePath = (index: number) => `${assetBase}assets/release-cutout-frames/frame_${String(index).padStart(3, "0")}.webp`;
const normalizeWheelDelta = (event: WheelEvent) => {
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
  return Math.abs(event.deltaY) * unit;
};

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
  const speedRef = useRef(0);
  const inputImpulseRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const lastTouchYRef = useRef<number | null>(null);
  const lastTouchTimeRef = useRef(0);
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
      const instantScrollSpeed = clamp(Math.abs(delta) / elapsed / 0.48);

      if (Math.abs(delta) > 0.6) {
        hasInteractedRef.current = true;
      }

      const impulseDecay = Math.pow(0.16, elapsed / 1000);
      inputImpulseRef.current *= impulseDecay;

      const rawSpeed = hasInteractedRef.current ? Math.max(instantScrollSpeed, inputImpulseRef.current) : 0;
      const speedEasing = rawSpeed > speedRef.current ? 0.64 : 0.16;
      const nextSpeed = speedRef.current + (rawSpeed - speedRef.current) * speedEasing;
      speedRef.current = clamp(nextSpeed);

      const grip = Math.pow(speedRef.current, 0.72);
      const targetProgress = hasInteractedRef.current ? openProgress - grip * (openProgress - closedProgress) : restingProgress;
      const easing = speedRef.current > 0.18 ? 0.24 + grip * 0.34 : 0.095;
      const nextProgress = progressRef.current + (targetProgress - progressRef.current) * easing;

      progressRef.current = clamp(nextProgress);
      lastScrollYRef.current = scrollY;
      lastFrameTimeRef.current = time;

      setProgress(progressRef.current);
      setScrollSpeed(speedRef.current);
      rafRef.current = window.requestAnimationFrame(syncMotion);
    };

    const pushImpulse = (strength: number) => {
      hasInteractedRef.current = true;
      const impulse = clamp(strength);
      inputImpulseRef.current = Math.max(inputImpulseRef.current, impulse);
      progressRef.current = clamp(progressRef.current - impulse * 0.22);
      setProgress(progressRef.current);
    };

    const handleWheel = (event: WheelEvent) => {
      pushImpulse(normalizeWheelDelta(event) / 180);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!event.touches[0]) return;
      lastTouchYRef.current = event.touches[0].clientY;
      lastTouchTimeRef.current = performance.now();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!event.touches[0] || lastTouchYRef.current === null) return;
      const now = performance.now();
      const elapsed = Math.max(16, now - lastTouchTimeRef.current);
      const delta = Math.abs(event.touches[0].clientY - lastTouchYRef.current);
      pushImpulse((delta / elapsed) / 0.42);
      lastTouchYRef.current = event.touches[0].clientY;
      lastTouchTimeRef.current = now;
    };

    const handleKeyDown = () => {
      pushImpulse(0.62);
    };

    rafRef.current = window.requestAnimationFrame(syncMotion);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
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
