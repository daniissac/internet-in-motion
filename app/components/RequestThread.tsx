"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

import styles from "./RequestThread.module.css";

export type RequestThreadStage = {
  id: string;
  shortLabel: string;
  location: string;
  protocol: string;
  action: string;
  why: string;
  direction: "out" | "return" | "local";
  dnsOnly?: boolean;
};

export type RequestThreadProps = {
  siteName?: string;
  deviceName?: string;
  needsDns?: boolean;
  startPlaying?: boolean;
  motionPaused?: boolean;
  className?: string;
  onStageChange?: (stage: RequestThreadStage, index: number) => void;
};

const playbackDelay = 1650;

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getReducedMotionPreference() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function getServerReducedMotionPreference() {
  return false;
}

export default function RequestThread({
  siteName = "google.com",
  deviceName = "Your laptop",
  needsDns = true,
  startPlaying = false,
  motionPaused = false,
  className = "",
  onStageChange,
}: RequestThreadProps) {
  const scrubberId = useId();
  const [stageIndex, setStageIndex] = useState(0);
  const [playing, setPlaying] = useState(startPlaying);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    getServerReducedMotionPreference,
  );

  const stages = useMemo<RequestThreadStage[]>(() => {
    const allStages: RequestThreadStage[] = [
      {
        id: "device",
        shortLabel: "Device",
        location: deviceName,
        protocol: "Browser action",
        action: `Open ${siteName}`,
        why: "The browser needs an IP address before it can contact the site.",
        direction: "local",
      },
      {
        id: "dns-query",
        shortLabel: "DNS query",
        location: "Recursive DNS resolver",
        protocol: "DNS",
        action: `Ask for ${siteName}`,
        why: "DNS translates the host name into one or more usable IP addresses.",
        direction: "out",
        dnsOnly: true,
      },
      {
        id: "dns-answer",
        shortLabel: "DNS answer",
        location: deviceName,
        protocol: "DNS answer",
        action: "Return IP address(es)",
        why: "The answer gives the browser a destination; it may vary by network, place, and time.",
        direction: "return",
        dnsOnly: true,
      },
      {
        id: "connection",
        shortLabel: "Connect",
        location: "Device ↔ destination server",
        protocol: "TCP + TLS, or QUIC with TLS 1.3",
        action: "Create a secure transport",
        why: "The connection authenticates the server and protects the HTTP exchange.",
        direction: "out",
      },
      {
        id: "request",
        shortLabel: "Request",
        location: "Destination web server",
        protocol: "HTTPS",
        action: "Send GET /",
        why: "The HTTP request tells the server which resource the browser wants.",
        direction: "out",
      },
      {
        id: "response",
        shortLabel: "Response",
        location: "Server → browser",
        protocol: "HTTPS response",
        action: "Return HTML and data",
        why: "Response bytes travel back over the established secure connection.",
        direction: "return",
      },
      {
        id: "render",
        shortLabel: "Render",
        location: deviceName,
        protocol: "Browser processing",
        action: "Parse and display the page",
        why: "The browser can render progressively while it requests additional page resources.",
        direction: "local",
      },
    ];

    return allStages.filter((stage) => needsDns || !stage.dnsOnly);
  }, [deviceName, needsDns, siteName]);

  const currentIndex = Math.min(stageIndex, stages.length - 1);
  const currentStage = stages[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === stages.length - 1;
  const isPlaying = playing && !prefersReducedMotion && !motionPaused;
  const position = stages.length > 1 ? (currentIndex / (stages.length - 1)) * 100 : 0;
  const journeyStyle = {
    "--request-position": `${position}%`,
    "--stage-count": stages.length,
    "--stage-edge": `${50 / stages.length}%`,
  } as CSSProperties;

  useEffect(() => {
    if (!isPlaying || isLast) return;

    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(currentIndex + 1, stages.length - 1);
      setStageIndex(nextIndex);
      if (nextIndex === stages.length - 1) setPlaying(false);
    }, playbackDelay);

    return () => window.clearTimeout(timer);
  }, [currentIndex, isLast, isPlaying, stages.length]);

  useEffect(() => {
    onStageChange?.(currentStage, currentIndex);
  }, [currentIndex, currentStage, onStageChange]);

  function selectStage(index: number) {
    setPlaying(false);
    setStageIndex(Math.max(0, Math.min(index, stages.length - 1)));
  }

  function togglePlayback() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (isLast) setStageIndex(0);
    setPlaying(true);
  }

  function replay() {
    setStageIndex(0);
    setPlaying(!prefersReducedMotion && !motionPaused);
  }

  return (
    <section className={`${styles.requestThread} ${className}`.trim()} aria-labelledby={`${scrubberId}-title`}>
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Continuous journey thread</p>
          <h3 id={`${scrubberId}-title`}>Follow one page-opening journey from name to page</h3>
        </div>
        <span className={styles.requestIdentity} aria-label="Journey marker 27">
          <span className={styles.packetFace} aria-hidden="true" />
          JOURNEY 27
        </span>
      </div>

      <div
        className={styles.journey}
        style={journeyStyle}
        role="img"
        aria-label={`Journey marker 27 is at ${currentStage.shortLabel}, stage ${currentIndex + 1} of ${stages.length}.`}
      >
        <div className={styles.rail} aria-hidden="true">
          <span className={styles.completedRail} />
          <span className={styles.traveler} data-direction={currentStage.direction}>
            <span className={styles.miniFace} />
            <b>27</b>
          </span>
        </div>
        <ol className={styles.stages}>
          {stages.map((stage, index) => {
            const state = index === currentIndex ? "current" : index < currentIndex ? "complete" : "upcoming";
            return (
              <li key={stage.id} className={styles.stage} data-state={state}>
                <span className={styles.stageDot} aria-hidden="true">{index < stageIndex ? "✓" : index + 1}</span>
                <span>{stage.shortLabel}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.details} aria-live="polite" aria-atomic="true">
        <div className={styles.detailField}>
          <span>Current device / location</span>
          <strong>{currentStage.location}</strong>
        </div>
        <div className={styles.detailField}>
          <span>Protocol / action</span>
          <strong>{currentStage.protocol}</strong>
          <small>{currentStage.action}</small>
        </div>
        <div className={`${styles.detailField} ${styles.whyField}`}>
          <span>Why it matters</span>
          <strong>{currentStage.why}</strong>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.buttonGroup} aria-label="Request playback controls">
          <button type="button" onClick={() => selectStage(currentIndex - 1)} disabled={isFirst}>
            ← Previous
          </button>
          <button
            type="button"
            className={styles.primaryControl}
            onClick={togglePlayback}
            aria-pressed={isPlaying}
            aria-describedby={`${scrubberId}-note`}
            disabled={prefersReducedMotion || motionPaused}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => selectStage(currentIndex + 1)} disabled={isLast}>
            Next →
          </button>
          <button type="button" onClick={replay}>Replay ↻</button>
        </div>

        <label className={styles.scrubber} htmlFor={scrubberId}>
          <span>
            Request progress
            <output htmlFor={scrubberId}>Stage {currentIndex + 1} of {stages.length}</output>
          </span>
          <input
            id={scrubberId}
            type="range"
            min="0"
            max={stages.length - 1}
            step="1"
            value={currentIndex}
            onChange={(event) => selectStage(Number(event.currentTarget.value))}
            aria-valuetext={`${currentStage.shortLabel}: ${currentStage.action}`}
          />
        </label>
      </div>

      <p className={styles.note} id={`${scrubberId}-note`}>
        The same journey marker stays visible, but it does not represent one packet reused end to end: each stage can create different packets and exchanges. DNS stages disappear when a usable address is already cached.
        {prefersReducedMotion ? " Autoplay is off for your reduced-motion preference; use Previous, Next, Replay, or the scrubber." : ""}
        {motionPaused ? " Autoplay is also paused by the page-wide motion control." : ""}
      </p>
    </section>
  );
}
