"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HiSparkles } from "react-icons/hi2";
import {
  FiArrowRight,
  FiPlayCircle,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiChevronDown,
} from "react-icons/fi";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* keyword → time-filter → LinkedIn datePosted code */
const DEMOS = [
  { keyword: "flutter developer", label: "2h", code: "r7200" },
  { keyword: "shopify agency", label: "24h", code: "r86400" },
  { keyword: "b2b saas founder", label: "7d", code: "r604800" },
];

const FILTERS = ["1h", "2h", "6h", "12h", "24h", "7d", "30d"];
const CYCLE_MS = 3200;

/* Build the real search URL from the parts */
const buildUrl = (keyword: string, code: string) =>
  `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
    keyword
  )}&datePosted=%22${code}%22`;

/* ------------------------------------------------------------------ */
/* Ambient Three.js background — a drifting "network" of nodes/edges,  */
/* standing in for the LinkedIn connection graph a search crawls.      */
/* Pure three.js (no extra renderer libs), mounted only on the client, */
/* fully torn down on unmount, and tuned down for mobile + reduced-    */
/* motion so it never fights the page for battery or attention.        */
/* ------------------------------------------------------------------ */
function NetworkField() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isMobile = window.innerWidth < 768;

    const NODE_COUNT = isMobile ? 26 : 58;
    const LINK_DIST = isMobile ? 105 : 150;
    const bounds = { x: isMobile ? 210 : 320, y: isMobile ? 260 : 220, z: 110 };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      // WebGL unavailable — silently skip the ambient layer, page still works.
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.z = 260;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds.x * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * bounds.y * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.z * 2;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.14,
          (Math.random() - 0.5) * 0.14,
          (Math.random() - 0.5) * 0.08
        )
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      color: new THREE.Color("#2D5BFF"),
      size: isMobile ? 3.2 : 4,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, pointsMaterial);
    scene.add(points);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#9AB0FF"),
      transparent: true,
      opacity: 0.16,
    });
    const lineGeometry = new THREE.BufferGeometry();
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    const updateLines = () => {
      const pos = geometry.attributes.position.array as Float32Array;
      const linePositions: number[] = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < LINK_DIST) {
            linePositions.push(
              pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
              pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
            );
          }
        }
      }
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(linePositions), 3)
      );
    };

    let frameId = 0;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      frameId = requestAnimationFrame(tick);
      if (document.hidden) return; // no work on hidden tabs

      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < NODE_COUNT; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;
        if (Math.abs(pos[i * 3]) > bounds.x) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > bounds.y) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > bounds.z) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;
      updateLines();
      scene.rotation.y += 0.0006;
      renderer.render(scene, camera);
    };

    updateLines();
    if (reducedMotion) {
      renderer.render(scene, camera); // one still frame, no ongoing animation
    } else {
      tick();
    }

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      pointsMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-80 [mask-image:radial-gradient(ellipse_65%_60%_at_50%_38%,black,transparent)]"
    />
  );
}

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [paused, setPaused] = useState(false);
  const demo = DEMOS[index];

  const url = buildUrl(demo.keyword, demo.code);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, [url]);

  /* Sends the visitor to the in-app generator (/new) with the current
     demo's keyword and filter pre-filled. */
  const handleOpen = useCallback(() => {
    const params = new URLSearchParams({
      keyword: demo.keyword,
      filter: demo.label,
    });
    router.push(`/new?${params.toString()}`);
  }, [router, demo]);

  const scrollToAbout = useCallback(() => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleGetStarted = useCallback(() => {
    router.push("/new");
  }, [router]);

  /* ---------- Intro timeline + ambient blobs + scroll parallax ---------- */
  useGSAP(
    () => {
      reduced.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-badge", { opacity: 0, y: 14, duration: 0.6 })
        .from(".hero-headline", { opacity: 0, y: 26, duration: 0.75 }, "-=0.35")
        .from(
          ".hero-headline-accent",
          { backgroundSize: "0% 100%", duration: 0.9, ease: "power2.inOut" },
          "-=0.4"
        )
        .from(".hero-sub", { opacity: 0, y: 16, duration: 0.6 }, "-=0.55")
        .from(
          ".hero-builder",
          { opacity: 0, y: 20, scale: 0.97, duration: 0.65 },
          "-=0.35"
        )
        .from(
          ".hero-cta",
          { opacity: 0, y: 16, duration: 0.6, stagger: 0.1 },
          "-=0.35"
        )
        .from(".hero-micro", { opacity: 0, duration: 0.5 })
        .from(".hero-scroll-cue", { opacity: 0, y: -8, duration: 0.5 }, "-=0.2");

      if (reduced.current) return;

      gsap.to(".blob-1", {
        x: 40,
        y: -30,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".blob-2", {
        x: -30,
        y: 20,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".hero-scroll-cue-icon", {
        y: 6,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const parallaxTl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      parallaxTl
        .to(".hero-content", { yPercent: -18, opacity: 0.2, ease: "none" }, 0)
        .to(".blob-1", { yPercent: 22, ease: "none" }, 0)
        .to(".blob-2", { yPercent: 14, ease: "none" }, 0)
        .to(".hero-scroll-cue", { opacity: 0, y: -10, ease: "none" }, 0);
    },
    { scope: container }
  );

  /* ---------- Cycle demos ----------
     WCAG 2.2.2 (Pause, Stop, Hide): pauses on hover, keyboard focus
     anywhere inside the builder card, and whenever the tab isn't
     visible. */
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || paused) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % DEMOS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ---------- Proper crossfade on every demo change ---------- */
  useGSAP(
    () => {
      if (reduced.current) return;
      gsap.fromTo(
        ".demo-fade",
        { opacity: 0, y: 6, filter: "blur(2px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.04,
        }
      );
    },
    { dependencies: [index], scope: builderRef }
  );

  return (
    <section
      ref={container}
      className="relative min-h-screen w-full overflow-hidden bg-[#F7F9FC]"
    >
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="blob-1 absolute left-1/2 top-[-12%] h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(45,91,255,0.18) 0%, rgba(45,91,255,0.10) 45%, rgba(255,255,255,0) 75%)",
          }}
        />
        <div
          className="blob-2 absolute bottom-[-16%] right-[-8%] h-[480px] w-[480px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245,165,36,0.14) 0%, rgba(245,165,36,0) 70%)",
          }}
        />
      </div>

      {/* Ambient Three.js network — sits behind content, above the blobs */}
      <NetworkField />

      {/* Faint grain texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.025] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Content */}
      <div className="hero-content relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-20 text-center">
       <br />
       <br />

        {/* Headline */}
        <h1 className="hero-headline max-w-2xl text-[34px] font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-[48px] lg:text-[54px]">
          FIND YOUR NEXT CLIENT IN{" "}
          <span
            className="hero-headline-accent relative inline-block bg-gradient-to-r from-[#2D5BFF] to-[#F5A524] bg-clip-text text-transparent"
            style={{ backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
          >
            SECONDS.
          </span>
        </h1>

        <p className="hero-sub mt-5 max-w-lg text-[15px] leading-relaxed text-slate-500">
          Leadly turns a keyword into an optimized LinkedIn search URL —
          sharpened by AI suggestions, filtered by exactly how fresh you want
          it.
        </p>

        {/* Signature: the self-assembling search URL */}
        <div
          ref={builderRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(document.hidden)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setPaused(document.hidden);
            }
          }}
          className="hero-builder relative mt-9 w-full max-w-xl"
        >
          <div className="absolute -inset-3 -z-10 rounded-[32px] bg-gradient-to-r from-blue-200/30 via-blue-100/20 to-amber-200/20 blur-2xl" />
          <div className="rounded-[24px] border border-white bg-white/90 p-5 text-left shadow-[0_8px_30px_rgba(0,0,0,0.07)] backdrop-blur-md">
            {/* keyword + AI tag */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[13px] text-slate-400">keyword:</span>
                <span className="demo-fade truncate font-mono text-[14px] font-medium text-slate-800">
                  {demo.keyword}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600">
                <HiSparkles className="h-3 w-3" />
                AI suggested
              </span>
            </div>

            {/* time filter pills */}
            <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
              {FILTERS.map((f) => (
                <span
                  key={f}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 ${
                    f === demo.label
                      ? "bg-[#2D5BFF] text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>

            {/* assembled URL */}
            <div className="mt-4 flex items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-3.5 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-slate-500">
                linkedin.com/search/results/content/?keywords=
                <span className="demo-fade font-semibold text-[#2D5BFF]">
                  {demo.keyword.replace(/ /g, "%20")}
                </span>
                &amp;datePosted=
                <span className="demo-fade font-semibold text-amber-600">
                  {demo.code}
                </span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy URL"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600"
              >
                {copied ? (
                  <FiCheck className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <FiCopy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Manual demo controls — gives users control over the
                auto-cycling content (WCAG 2.2.2) and doubles as a way to
                jump straight to the example that matches their situation. */}
            <div
              className="mt-3 flex items-center justify-center gap-1.5"
              role="tablist"
              aria-label="Example keywords"
            >
              {DEMOS.map((d, i) => (
                <button
                  key={d.keyword}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show example: ${d.keyword}`}
                  onClick={() => setIndex(i)}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? "w-5 bg-[#2D5BFF]"
                        : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpen}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-slate-900 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98]"
            >
              Generate my Own
              <FiExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleGetStarted}
            className="hero-cta group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2D5BFF] to-[#1B3FCF] bg-[length:200%_100%] bg-[position:0%_0%] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(45,91,255,0.3)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-[position:100%_0%] hover:shadow-[0_14px_36px_rgba(45,91,255,0.42)] active:scale-95"
          >
            Get started free
            <FiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={scrollToAbout}
            className="hero-cta group flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-6 py-3 text-[14px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <FiPlayCircle className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
            See how it works
          </button>
        </div>

        {/* Microcopy */}
        <p className="hero-micro mt-5 text-[13px] font-medium text-slate-400">
          No scraping. No automation. Just smarter search.
        </p>
      </div>

      {/* Scroll cue */}
      <button
        type="button"
        onClick={scrollToAbout}
        aria-label="Scroll to About section"
        className="hero-scroll-cue absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-slate-400 transition-colors hover:text-slate-600"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
          Scroll
        </span>
        <FiChevronDown className="hero-scroll-cue-icon h-4 w-4" />
      </button>
    </section>
  );
}