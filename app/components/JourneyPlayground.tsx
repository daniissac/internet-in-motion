"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import styles from "./JourneyPlayground.module.css";

type Transport = "tcp" | "quic";
type RunState = "idle" | "positioning" | "running" | "complete";

type JourneyInputs = {
  dnsCached: boolean;
  pathFailure: boolean;
  transport: Transport;
  latency: number;
  bandwidth: number;
  loss: number;
};

type TimelineEvent = {
  at: number;
  label: string;
  detail: string;
};

type SimulationResult = {
  inputs: JourneyInputs;
  total: number;
  dns: number;
  pathRecovery: number;
  transportSetup: number;
  request: number;
  transfer: number;
  lossRecovery: number;
  outcome: string;
  events: TimelineEvent[];
};

export type JourneyPlaygroundProps = {
  className?: string;
  /** Connect this to the page-level motion toggle when the component is embedded. */
  motionPaused?: boolean;
};

const payloadMegabits = 6.4; // A fixed 800 KB teaching payload.

function calculateJourney(inputs: JourneyInputs): SimulationResult {
  const { dnsCached, pathFailure, transport, latency, bandwidth, loss } = inputs;
  const dns = dnsCached ? 0 : latency;
  const pathRecovery = pathFailure ? Math.max(300, latency * 2) : 0;
  const transportSetup = transport === "tcp" ? latency * 2 : latency;
  const request = latency;
  const transfer = Math.ceil((payloadMegabits / bandwidth) * 1000);
  const lossRate = loss / 100;
  const lossRecovery = loss === 0
    ? 0
    : Math.ceil(transfer * (lossRate / (1 - lossRate)) + latency);
  const total = dns + pathRecovery + transportSetup + request + transfer + lossRecovery;

  let elapsed = 0;
  const events: TimelineEvent[] = [
    { at: elapsed, label: "Request started", detail: "The browser needs an IP address for google.com before it can contact the site." },
  ];

  if (dnsCached) {
    events.push({ at: elapsed, label: "Saved address used", detail: "A usable address is already available on the device, so no DNS query is modeled." });
  } else {
    events.push({ at: elapsed, label: "Address lookup sent", detail: "The device asks its configured DNS resolver for an IP address for google.com." });
    elapsed += dns;
    events.push({ at: elapsed, label: "Address received", detail: "The configured resolver returns an address. This model counts one round trip between the device and resolver." });
  }

  if (pathFailure) {
    events.push({ at: elapsed, label: "Path failure detected", detail: "The first modeled path cannot carry the connection." });
    elapsed += pathRecovery;
    events.push({ at: elapsed, label: "Alternate path selected", detail: "The simulation assumes another working path is available." });
  } else {
    events.push({ at: elapsed, label: "Destination path available", detail: "Packets can proceed toward the server address." });
  }

  events.push({
    at: elapsed,
    label: transport === "tcp" ? "TCP and TLS setup started" : "QUIC with TLS 1.3 setup started",
    detail: transport === "tcp"
      ? "A new TCP connection and TLS 1.3 security are modeled as two round trips."
      : "A new QUIC connection integrates the TLS 1.3 handshake in one modeled round trip.",
  });
  elapsed += transportSetup;
  events.push({ at: elapsed, label: "Secure connection ready", detail: transport === "tcp" ? "HTTP can now use the TCP connection." : "HTTP/3 can now use the QUIC connection." });

  events.push({ at: elapsed, label: "HTTP request sent", detail: "The browser requests the document from the server." });
  elapsed += request;
  events.push({ at: elapsed, label: "First response data arrives", detail: "The model counts one request/response round trip." });

  events.push({ at: elapsed, label: "Response data transferring", detail: "An 800 KB teaching payload crosses the available bandwidth." });
  elapsed += transfer;

  if (lossRecovery > 0) {
    events.push({ at: elapsed, label: "Missing data detected", detail: "Reliable transport must recover data lost in transit." });
    elapsed += lossRecovery;
    events.push({ at: elapsed, label: "Lost data recovered", detail: "Both TCP and QUIC retransmit missing reliable data." });
  }

  events.push({ at: elapsed, label: "Request complete", detail: "The modeled response is available to the browser." });

  const outcome = pathFailure
    ? loss > 0
      ? "Completed on an alternate path after loss recovery"
      : "Completed on an alternate path"
    : loss > 0
      ? "Completed after loss recovery"
      : "Completed on the available path";

  return {
    inputs,
    total,
    dns,
    pathRecovery,
    transportSetup,
    request,
    transfer,
    lossRecovery,
    outcome,
    events,
  };
}

function milliseconds(value: number) {
  return `${value.toLocaleString()} ms`;
}

export function JourneyPlayground({ className = "", motionPaused = false }: JourneyPlaygroundProps) {
  const [dnsCached, setDnsCached] = useState(false);
  const [pathFailure, setPathFailure] = useState(false);
  const [transport, setTransport] = useState<Transport>("tcp");
  const [latency, setLatency] = useState(40);
  const [bandwidth, setBandwidth] = useState(50);
  const [loss, setLoss] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [runNumber, setRunNumber] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const routeStageRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const positioningTimerRef = useRef<number | null>(null);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);
  const activeRunRef = useRef(0);
  const startedRunRef = useRef(0);
  const busyRef = useRef(false);

  const noMotion = motionPaused || prefersReducedMotion;
  const isBusy = runState === "positioning" || runState === "running";
  const noMotionRef = useRef(noMotion);

  const currentInputs = useMemo<JourneyInputs>(() => ({
    dnsCached,
    pathFailure,
    transport,
    latency,
    bandwidth,
    loss,
  }), [bandwidth, dnsCached, latency, loss, pathFailure, transport]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => () => {
    activeRunRef.current += 1;
    visibilityObserverRef.current?.disconnect();
    if (positioningTimerRef.current !== null) window.clearTimeout(positioningTimerRef.current);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  useLayoutEffect(() => {
    noMotionRef.current = noMotion;
  }, [noMotion]);

  useEffect(() => {
    if (!noMotion || !isBusy) return;

    const runId = activeRunRef.current;
    const finishWithoutMotionTimer = window.setTimeout(() => {
      if (runId !== activeRunRef.current || !busyRef.current) return;

      visibilityObserverRef.current?.disconnect();
      visibilityObserverRef.current = null;
      if (positioningTimerRef.current !== null) {
        window.clearTimeout(positioningTimerRef.current);
        positioningTimerRef.current = null;
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      routeStageRef.current?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      if (startedRunRef.current !== runId) {
        startedRunRef.current = runId;
        setRunNumber((current) => current + 1);
      }
      busyRef.current = false;
      setRunState("complete");
    }, 0);

    return () => window.clearTimeout(finishWithoutMotionTimer);
  }, [isBusy, noMotion]);

  function clearPendingRunWork() {
    visibilityObserverRef.current?.disconnect();
    visibilityObserverRef.current = null;

    if (positioningTimerRef.current !== null) {
      window.clearTimeout(positioningTimerRef.current);
      positioningTimerRef.current = null;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function routeIsVisible(stage: HTMLDivElement) {
    const bounds = stage.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const topInset = 96;
    const bottomInset = 24;
    const usableViewportHeight = Math.max(1, viewportHeight - topInset - bottomInset);
    const visibleHeight = Math.max(
      0,
      Math.min(bounds.bottom, viewportHeight - bottomInset) - Math.max(bounds.top, topInset),
    );
    const requiredHeight = Math.min(bounds.height * 0.8, usableViewportHeight * 0.7);
    return visibleHeight >= requiredHeight;
  }

  function beginVisibleRun(runId: number) {
    if (
      runId !== activeRunRef.current
      || startedRunRef.current === runId
      || !busyRef.current
    ) return;
    startedRunRef.current = runId;

    visibilityObserverRef.current?.disconnect();
    visibilityObserverRef.current = null;
    if (positioningTimerRef.current !== null) {
      window.clearTimeout(positioningTimerRef.current);
      positioningTimerRef.current = null;
    }

    setRunNumber((current) => current + 1);

    if (noMotionRef.current) {
      busyRef.current = false;
      setRunState("complete");
      return;
    }

    setRunState("running");
    timerRef.current = window.setTimeout(() => {
      if (runId !== activeRunRef.current) return;
      busyRef.current = false;
      setRunState("complete");
      timerRef.current = null;
    }, 1450);
  }

  function runJourney() {
    if (busyRef.current) return;

    clearPendingRunWork();
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    busyRef.current = true;

    const nextResult = calculateJourney({ ...currentInputs });
    setResult(nextResult);
    setRunState("positioning");

    const routeStage = routeStageRef.current;
    if (!routeStage) {
      beginVisibleRun(runId);
      return;
    }

    const alreadyVisible = routeIsVisible(routeStage);

    if (alreadyVisible) {
      positioningTimerRef.current = window.setTimeout(
        () => beginVisibleRun(runId),
        noMotionRef.current ? 0 : 80,
      );
      return;
    }

    if ("IntersectionObserver" in window) {
      visibilityObserverRef.current = new IntersectionObserver((entries) => {
        if (
          runId !== activeRunRef.current
          || startedRunRef.current === runId
          || !busyRef.current
        ) return;

        const routeEntry = entries[0];
        if (!routeEntry?.isIntersecting || routeEntry.intersectionRatio < 0.8) return;

        visibilityObserverRef.current?.disconnect();
        visibilityObserverRef.current = null;
        if (positioningTimerRef.current !== null) {
          window.clearTimeout(positioningTimerRef.current);
        }
        positioningTimerRef.current = window.setTimeout(
          () => beginVisibleRun(runId),
          noMotionRef.current ? 0 : 120,
        );
      }, { rootMargin: "-96px 0px -24px", threshold: [0.8] });
      visibilityObserverRef.current.observe(routeStage);
    }

    routeStage.scrollIntoView({
      behavior: noMotionRef.current ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });

    positioningTimerRef.current = window.setTimeout(() => {
      if (runId !== activeRunRef.current || !busyRef.current) return;
      routeStage.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      window.requestAnimationFrame(() => beginVisibleRun(runId));
    }, 1400);
  }

  const activeInputs = result?.inputs ?? currentInputs;
  const routeDescription = activeInputs.pathFailure
    ? "The request starts on a failed path, then takes the available alternate path to the server."
    : "The request follows the available path from the browser to the server.";

  return (
    <section className={`${styles.playground} ${className}`.trim()} aria-labelledby="journey-playground-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Final playground / teaching simulation</p>
          <h2 id="journey-playground-title">Packet Playground: run the whole request journey</h2>
          <p className={styles.intro}>
            Follow one simplified request from finding the site address to receiving its response.
          </p>
          <p className={styles.guidance}>
            <strong>Start here:</strong> run the default journey first. Then change one setting at a time and compare what changes.
          </p>
        </div>
        <span className={styles.simulationBadge}>Simulation, not a speed test</span>
      </header>

      <div className={styles.layout}>
        <form className={styles.controls} onSubmit={(event) => { event.preventDefault(); runJourney(); }}>
          <fieldset disabled={isBusy}>
            <legend>1. Choose the journey</legend>
            <label className={styles.switchRow}>
              <span>
                <strong>Site address already saved</strong>
                <small>{dnsCached ? "Use an address available on the device" : "Ask the device’s configured DNS resolver"}</small>
              </span>
              <input type="checkbox" checked={dnsCached} onChange={(event) => setDnsCached(event.target.checked)} />
            </label>
            <label className={styles.switchRow}>
              <span>
                <strong>First network path fails</strong>
                <small>{pathFailure ? "Move to an assumed working path" : "Use the first available path"}</small>
              </span>
              <input type="checkbox" checked={pathFailure} onChange={(event) => setPathFailure(event.target.checked)} />
            </label>
          </fieldset>

          <fieldset disabled={isBusy}>
            <legend>2. Choose the transport</legend>
            <div className={styles.transportChoices}>
              <label className={transport === "tcp" ? styles.selectedChoice : undefined}>
                <input type="radio" name="journey-transport" value="tcp" checked={transport === "tcp"} onChange={() => setTransport("tcp")} />
                <span><strong>TCP + TLS</strong><small>A secure connection for HTTP/1.1 or HTTP/2</small></span>
              </label>
              <label className={transport === "quic" ? styles.selectedChoice : undefined}>
                <input type="radio" name="journey-transport" value="quic" checked={transport === "quic"} onChange={() => setTransport("quic")} />
                <span><strong>QUIC with TLS 1.3</strong><small>HTTP/3 uses QUIC over UDP with reliable delivery</small></span>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.sliders} disabled={isBusy}>
            <legend>3. Shape the network</legend>
            <label>
              <span><strong>Round-trip latency</strong><output>{latency} ms</output></span>
              <small className={styles.unitHelp}>Delay there and back · ms means milliseconds</small>
              <input aria-label="Playground round-trip latency" type="range" min="10" max="300" step="10" value={latency} onChange={(event) => setLatency(Number(event.target.value))} />
            </label>
            <label>
              <span><strong>Available bandwidth</strong><output>{bandwidth} Mbps</output></span>
              <small className={styles.unitHelp}>Transfer capacity · Mbps means megabits per second</small>
              <input aria-label="Playground available bandwidth" type="range" min="1" max="200" step="1" value={bandwidth} onChange={(event) => setBandwidth(Number(event.target.value))} />
            </label>
            <label>
              <span><strong>Packet loss</strong><output>{loss}%</output></span>
              <small className={styles.unitHelp}>Percent of packets that do not arrive</small>
              <input aria-label="Playground packet loss" type="range" min="0" max="10" step="1" value={loss} onChange={(event) => setLoss(Number(event.target.value))} />
            </label>
          </fieldset>

          <button
            className={styles.runButton}
            type="submit"
            aria-controls="journey-route-stage journey-live-status"
            aria-disabled={isBusy}
          >
            {runState === "positioning"
              ? "Bringing route into view…"
              : runState === "running"
                ? "Request in motion…"
                : result
                  ? "Run again →"
                  : "Run request →"}
          </button>
        </form>

        <div className={styles.experience}>
          <div
            id="journey-route-stage"
            ref={routeStageRef}
            className={`${styles.routeStage} ${activeInputs.pathFailure ? styles.failedRoute : ""} ${noMotion ? styles.paused : ""}`.trim()}
            role="img"
            aria-label={routeDescription}
            aria-busy={isBusy}
          >
            <div className={styles.dnsState}>
              <span>DNS</span>
              <strong>{activeInputs.dnsCached ? "address saved" : "lookup needed"}</strong>
            </div>
            <div className={styles.routeLine} aria-hidden="true">
              <span className={styles.primaryLine} />
              {activeInputs.pathFailure && <span className={styles.detourLine} />}
              {(runState === "running" || (runState === "complete" && noMotion)) && (
                <span key={runNumber} className={styles.movingPacket}>GET</span>
              )}
            </div>
            <div className={styles.routeNodes} aria-hidden="true">
              <span><i>www.</i><strong>Browser</strong></span>
              <span><i>⌁</i><strong>Wi-Fi router</strong></span>
              <span className={activeInputs.pathFailure ? styles.failedNode : undefined}><i>↗</i><strong>{activeInputs.pathFailure ? "Detour" : "Routers"}</strong></span>
              <span><i>▤</i><strong>Server</strong></span>
            </div>
          </div>

          <p id="journey-live-status" className={styles.liveStatus} role="status" aria-live="polite" aria-atomic="true">
            {runState === "idle" && "Ready. Run these beginner-friendly defaults first."}
            {runState === "positioning" && "Bringing the request route into view. The packet will move next."}
            {runState === "running" && "Request running through the modeled journey."}
            {runState === "complete" && result && `${result.outcome} in a modeled ${milliseconds(result.total)}.`}
          </p>

          {result ? (
            <div className={`${styles.results} ${runState === "complete" ? styles.resultsVisible : ""}`} aria-busy={isBusy}>
              <div className={styles.resultSummary}>
                <span>Modeled total</span>
                <strong>{milliseconds(result.total)}</strong>
                <small>{result.outcome}</small>
              </div>

              <dl className={styles.breakdown}>
                <div><dt>DNS address lookup</dt><dd>{milliseconds(result.dns)}</dd></div>
                <div><dt>Path recovery</dt><dd>{milliseconds(result.pathRecovery)}</dd></div>
                <div><dt>Secure transport setup</dt><dd>{milliseconds(result.transportSetup)}</dd></div>
                <div><dt>HTTP round trip</dt><dd>{milliseconds(result.request)}</dd></div>
                <div><dt>800 KB data transfer</dt><dd>{milliseconds(result.transfer)}</dd></div>
                <div><dt>Loss recovery</dt><dd>{milliseconds(result.lossRecovery)}</dd></div>
              </dl>

              <section className={styles.eventLog} aria-labelledby="journey-event-log-title">
                <h3 id="journey-event-log-title">What happened, in order</h3>
                <p className={styles.logNote}>Each time is milliseconds after the request started.</p>
                <ol>
                  {result.events.map((event, index) => (
                    <li key={`${event.at}-${event.label}-${index}`}>
                      <time>+{event.at.toLocaleString()} ms</time>
                      <span><strong>{event.label}</strong><small>{event.detail}</small></span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : (
            <div className={styles.emptyResult}>
              <strong>Your request story will appear here.</strong>
              <span>Keep the default settings for your first run.</span>
            </div>
          )}
        </div>
      </div>

      <aside className={styles.experimentGuide} aria-labelledby="journey-experiments-title">
        <h3 id="journey-experiments-title">Try four one-change comparisons</h3>
        <ol>
          <li><strong>Saved address:</strong> turn on “Site address already saved,” then rerun.</li>
          <li><strong>QUIC:</strong> turn the saved address off, choose QUIC, then rerun.</li>
          <li><strong>Route problem:</strong> choose TCP again, turn on “First network path fails,” then rerun.</li>
          <li><strong>Loss:</strong> turn the path failure off, move packet loss to 3%, then rerun.</li>
        </ol>
      </aside>

      <p className={styles.assumptionNote}>
        <strong>Model assumptions:</strong> This simulation uses an 800 KB response, a new secure connection, one responsive configured DNS resolver, and a working alternate path after a modeled failure. Real DNS, routes, congestion, servers, browsers, and loss recovery vary, so these times show relationships rather than predict a page load.
      </p>
    </section>
  );
}

export default JourneyPlayground;
