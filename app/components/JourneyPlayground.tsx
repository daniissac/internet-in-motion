"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./JourneyPlayground.module.css";

type Transport = "tcp" | "quic";
type RunState = "idle" | "running" | "complete";

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
    { at: elapsed, label: "Request started", detail: "The browser needs google.com." },
  ];

  if (dnsCached) {
    events.push({ at: elapsed, label: "DNS cache hit", detail: "A usable address is already stored, so no DNS query is modeled." });
  } else {
    events.push({ at: elapsed, label: "DNS query sent", detail: "The browser asks its configured recursive resolver for an address." });
    elapsed += dns;
    events.push({ at: elapsed, label: "DNS answer received", detail: "The simplified model counts one round trip to the resolver." });
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

  events.push({ at: elapsed, label: "Response body transferring", detail: "An 800 KB teaching payload crosses the selected bandwidth." });
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
  const [dnsCached, setDnsCached] = useState(true);
  const [pathFailure, setPathFailure] = useState(false);
  const [transport, setTransport] = useState<Transport>("quic");
  const [latency, setLatency] = useState(40);
  const [bandwidth, setBandwidth] = useState(50);
  const [loss, setLoss] = useState(0);
  const [runState, setRunState] = useState<RunState>("idle");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [runNumber, setRunNumber] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<number | null>(null);

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
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  function runJourney() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    const nextResult = calculateJourney({ ...currentInputs });
    setResult(nextResult);
    setRunNumber((current) => current + 1);
    setRunState("running");

    timerRef.current = window.setTimeout(() => {
      setRunState("complete");
      timerRef.current = null;
    }, motionPaused || prefersReducedMotion ? 80 : 1450);
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
            Change the network, choose a transport, then follow one simplified request from name lookup to response.
          </p>
        </div>
        <span className={styles.simulationBadge}>Simulation, not a speed test</span>
      </header>

      <div className={styles.layout}>
        <form className={styles.controls} onSubmit={(event) => { event.preventDefault(); runJourney(); }}>
          <fieldset disabled={runState === "running"}>
            <legend>1. Choose the journey</legend>
            <label className={styles.switchRow}>
              <span>
                <strong>Use cached DNS answer</strong>
                <small>{dnsCached ? "Skip a new resolver query" : "Ask the resolver for an address"}</small>
              </span>
              <input type="checkbox" checked={dnsCached} onChange={(event) => setDnsCached(event.target.checked)} />
            </label>
            <label className={styles.switchRow}>
              <span>
                <strong>Simulate a path failure</strong>
                <small>{pathFailure ? "Recover onto an assumed alternate path" : "Use the available path"}</small>
              </span>
              <input type="checkbox" checked={pathFailure} onChange={(event) => setPathFailure(event.target.checked)} />
            </label>
          </fieldset>

          <fieldset disabled={runState === "running"}>
            <legend>2. Choose the transport</legend>
            <div className={styles.transportChoices}>
              <label className={transport === "tcp" ? styles.selectedChoice : undefined}>
                <input type="radio" name="journey-transport" value="tcp" checked={transport === "tcp"} onChange={() => setTransport("tcp")} />
                <span><strong>TCP + TLS</strong><small>HTTP/1.1 or HTTP/2</small></span>
              </label>
              <label className={transport === "quic" ? styles.selectedChoice : undefined}>
                <input type="radio" name="journey-transport" value="quic" checked={transport === "quic"} onChange={() => setTransport("quic")} />
                <span><strong>QUIC with TLS 1.3</strong><small>HTTP/3</small></span>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.sliders} disabled={runState === "running"}>
            <legend>3. Shape the network</legend>
            <label>
              <span><strong>Round-trip latency</strong><output>{latency} ms</output></span>
              <input aria-label="Playground round-trip latency" type="range" min="10" max="300" step="10" value={latency} onChange={(event) => setLatency(Number(event.target.value))} />
            </label>
            <label>
              <span><strong>Bandwidth</strong><output>{bandwidth} Mbps</output></span>
              <input aria-label="Playground bandwidth" type="range" min="1" max="200" step="1" value={bandwidth} onChange={(event) => setBandwidth(Number(event.target.value))} />
            </label>
            <label>
              <span><strong>Packet loss</strong><output>{loss}%</output></span>
              <input aria-label="Playground packet loss" type="range" min="0" max="10" step="1" value={loss} onChange={(event) => setLoss(Number(event.target.value))} />
            </label>
          </fieldset>

          <button className={styles.runButton} type="submit" disabled={runState === "running"}>
            {runState === "running" ? "Request in motion…" : result ? "Run again →" : "Run request →"}
          </button>
        </form>

        <div className={styles.experience}>
          <div
            className={`${styles.routeStage} ${activeInputs.pathFailure ? styles.failedRoute : ""} ${motionPaused ? styles.paused : ""}`.trim()}
            role="img"
            aria-label={routeDescription}
          >
            <div className={styles.dnsState}>
              <span>DNS</span>
              <strong>{activeInputs.dnsCached ? "cache hit" : "resolver query"}</strong>
            </div>
            <div className={styles.routeLine} aria-hidden="true">
              <span className={styles.primaryLine} />
              {activeInputs.pathFailure && <span className={styles.detourLine} />}
              {runState === "running" && <span key={runNumber} className={styles.movingPacket}>GET</span>}
            </div>
            <div className={styles.routeNodes} aria-hidden="true">
              <span><i>www.</i><strong>Browser</strong></span>
              <span><i>⌁</i><strong>Gateway</strong></span>
              <span className={activeInputs.pathFailure ? styles.failedNode : undefined}><i>↗</i><strong>{activeInputs.pathFailure ? "Detour" : "Routers"}</strong></span>
              <span><i>▤</i><strong>Server</strong></span>
            </div>
          </div>

          <p className={styles.liveStatus} role="status" aria-live="polite" aria-atomic="true">
            {runState === "idle" && "Ready. Choose conditions and run the request."}
            {runState === "running" && "Request running through the modeled journey."}
            {runState === "complete" && result && `${result.outcome} in a modeled ${milliseconds(result.total)}.`}
          </p>

          {result ? (
            <div className={`${styles.results} ${runState === "complete" ? styles.resultsVisible : ""}`} aria-busy={runState === "running"}>
              <div className={styles.resultSummary}>
                <span>Modeled total</span>
                <strong>{milliseconds(result.total)}</strong>
                <small>{result.outcome}</small>
              </div>

              <dl className={styles.breakdown}>
                <div><dt>DNS lookup</dt><dd>{milliseconds(result.dns)}</dd></div>
                <div><dt>Path recovery</dt><dd>{milliseconds(result.pathRecovery)}</dd></div>
                <div><dt>Secure transport setup</dt><dd>{milliseconds(result.transportSetup)}</dd></div>
                <div><dt>HTTP round trip</dt><dd>{milliseconds(result.request)}</dd></div>
                <div><dt>800 KB transfer</dt><dd>{milliseconds(result.transfer)}</dd></div>
                <div><dt>Loss recovery</dt><dd>{milliseconds(result.lossRecovery)}</dd></div>
              </dl>

              <section className={styles.eventLog} aria-labelledby="journey-event-log-title">
                <h3 id="journey-event-log-title">Ordered event log</h3>
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
              <strong>Your event log will appear here.</strong>
              <span>Try a cache miss, a failed path, or a little packet loss and compare the result.</span>
            </div>
          )}
        </div>
      </div>

      <p className={styles.assumptionNote}>
        <strong>What the model assumes:</strong> an 800 KB response, a new secure connection, one responsive DNS resolver, and an available alternate path after a modeled failure. DNS, route recovery, congestion, server work, browser rendering, and loss behavior vary in real networks, so these times teach relationships rather than predict a page load.
      </p>
    </section>
  );
}

export default JourneyPlayground;
