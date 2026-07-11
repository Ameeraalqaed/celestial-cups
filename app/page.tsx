"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RequestForm } from "./components/RequestForm";

type Star = { x: number; y: number; size: number; delay: number; dur: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Starfield() {
  const stars = useMemo<Star[]>(() => {
    const rand = mulberry32(9317);
    return Array.from({ length: 140 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      size: 0.6 + rand() * 1.8,
      delay: rand() * 6,
      dur: 3 + rand() * 4,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 50% -10%, #241a54 0%, #17123a 42%, #120f31 100%)",
      }}
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#ceaaff]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            boxShadow: "0 0 6px rgba(206,170,255,0.6)",
            animation: `cc-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const scrubRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const [hasVideo, setHasVideo] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const section = scrubRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setReduced(true);
      return;
    }

    let duration = 0;
    let raf = 0;
    let pendingTime = -1;
    let seeking = false;

    const onMeta = () => { duration = video.duration || 0; };
    if (video.readyState >= 1) onMeta();
    video.addEventListener("loadedmetadata", onMeta);

    const onSeeked = () => {
      seeking = false;
      if (pendingTime >= 0) {
        const t = pendingTime;
        pendingTime = -1;
        requestSeek(t);
      }
    };
    video.addEventListener("seeked", onSeeked);

    const requestSeek = (t: number) => {
      if (seeking) { pendingTime = t; return; }
      if (Math.abs(video.currentTime - t) < 0.015) return;
      seeking = true;
      try { video.currentTime = t; } catch { seeking = false; }
    };

    const update = () => {
      raf = 0;
      const total = section.offsetHeight - window.innerHeight;
      const top = -section.getBoundingClientRect().top;
      const p = total > 0 ? Math.min(Math.max(top / total, 0), 1) : 0;

      if (duration > 0) {
        requestSeek(Math.min(p * duration, duration - 0.05));
      }

      if (cueRef.current) {
        const visible = p < 0.015;
        cueRef.current.style.opacity = visible ? "1" : "0";
        cueRef.current.style.transform = visible ? "translateY(0)" : "translateY(12px)";
      }
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

    video.load();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hasVideo]);

  return (
    <main className="relative text-[#ceaaff]">
      <Starfield />

      <section ref={scrubRef} className="relative h-[4500vh]">
        <div className="sticky top-0 h-dvh w-full overflow-hidden">
          {hasVideo ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              src="/assets/landing.mp4"
              muted
              playsInline
              preload="auto"
              autoPlay={reduced}
              loop={reduced}
              onError={() => setHasVideo(false)}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 90% at 50% 30%, #2a2066 0%, #17123a 70%, #120f31 100%)",
              }}
            />
          )}

          <div
            ref={cueRef}
            className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 transition-all duration-500"
          >
            <span className="text-xs font-medium uppercase tracking-[0.5em] text-[#ceaaff] drop-shadow-[0_0_12px_rgba(18,15,49,0.9)]">
              Scroll down
            </span>
            <svg
              width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"
              className="text-[#ceaaff] drop-shadow-[0_0_12px_rgba(18,15,49,0.9)]"
              style={{ animation: "cc-drift 1.8s ease-in-out infinite alternate" }}
            >
              <path d="M4 8l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: "linear-gradient(to bottom, transparent, #120f31)" }}
          />
        </div>
      </section>

      <section id="request" className="relative px-6 pb-28 pt-16">
        <RequestForm />
      </section>

      <footer className="relative px-6 pb-10 text-center text-xs text-[#ceaaff]/35">
        Celestial Cups
      </footer>
    </main>
  );
}
