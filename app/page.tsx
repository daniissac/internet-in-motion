"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import JourneyPlayground from "./components/JourneyPlayground";
import PredictionCheck from "./components/PredictionCheck";
import RequestThread from "./components/RequestThread";

const chapters = [
  { id: "network", short: "Network", title: "Hello, Network!" },
  { id: "local-network", short: "Local", title: "Meet the Neighborhood" },
  { id: "packets", short: "Packets", title: "Message, Meet Pieces" },
  { id: "dns", short: "IP + DNS", title: "The Internet’s Name Game" },
  { id: "routing", short: "Routes", title: "Pick a Path" },
  { id: "tcp-udp", short: "Delivery", title: "TCP and UDP: Two Delivery Styles" },
  { id: "website", short: "Website", title: "Open Sesame, Website!" },
  { id: "performance", short: "Speed", title: "The Feel of Fast" },
];

type MissionStop = {
  label: string;
  note: string;
  icon: string;
  tone: string;
  lookupSpeech?: string;
  requestSpeech?: string;
};

const missionStops: MissionStop[] = [
  { label: "Your device", note: "The browser first checks for a saved address and a reusable connection. If needed, it asks DNS for an address, opens a secure connection, and asks for the page.", icon: "laptop", tone: "yellow", lookupSpeech: "Where is google.com?", requestSpeech: "Open google.com" },
  { label: "Wi-Fi router", note: "Wi-Fi carries the data by radio to an access point. In many homes, that access point and the router to other networks are combined in one box.", icon: "wifi", tone: "paper", lookupSpeech: "Pass on DNS question", requestSpeech: "First router" },
  { label: "Internet provider", note: "Your internet service provider (ISP) carries the packets toward the DNS resolver or toward google.com.", icon: "isp", tone: "mint", lookupSpeech: "Toward DNS", requestSpeech: "Across provider network" },
  { label: "Internet routers", note: "Each router sends the packet one hop—one router-to-router step—closer to its destination. The return trip can follow a different route.", icon: "router", tone: "yellow", requestSpeech: "Toward site address" },
  { label: "Web server", note: "The server receives the browser’s request and sends page data back. The browser may then ask for images, styles, scripts, and fonts.", icon: "server", tone: "sky", requestSpeech: "Page data returns" },
  { label: "DNS resolver", note: "The Domain Name System (DNS) resolver looks up one or more Internet Protocol (IP) addresses for google.com. This lookup is a side trip, not a stop on the later website-request path.", icon: "dns", tone: "coral", lookupSpeech: "IP address returns" },
];

const websiteStopIndexes = [0, 1, 2, 3, 4];
const exampleGoogleIpv4 = "192.178.173.100";
const teachingPayloadMegabits = 6.4;

const webSteps = [
  { label: "Find the address", detail: "If needed, the browser asks DNS for an IP address for google.com.", code: "DNS" },
  { label: "Open a connection", detail: "The browser starts a connection to that address, or reuses one that is already open.", code: "CONNECT" },
  { label: "Make it secure", detail: "The browser confirms it reached the right site and encrypts the exchange.", code: "SECURE" },
  { label: "Ask for the page", detail: "The browser sends an HTTP request asking google.com for its main page.", code: "GET /" },
  { label: "Receive page files", detail: "The browser receives HTML and asks for other files such as styles, scripts, images, and fonts.", code: "HTML + MORE" },
  { label: "Build the page", detail: "The browser reads those files and displays the page while remaining pieces may still arrive.", code: "DISPLAY" },
];

const useCases = {
  file: {
    name: "File download",
    protocol: "TCP, or QUIC over UDP",
    lane: "tcp",
    summary: "Downloads need every byte. TCP supplies reliable delivery; QUIC runs over UDP but adds its own reliability and recovery.",
  },
  call: {
    name: "Video call",
    protocol: "Usually UDP-based",
    lane: "udp",
    summary: "Fresh audio and video often matter more than late pieces, so the application may keep going instead of waiting. TCP-based fallback paths can still be used.",
  },
  game: {
    name: "Online game",
    protocol: "Often UDP-based",
    lane: "udp",
    summary: "Many games send time-sensitive updates over UDP and add their own recovery only for information that must arrive.",
  },
} as const;

type UseCase = keyof typeof useCases;

function PacketFace({ className = "" }: { className?: string }) {
  return <span className={"packet-face " + className} aria-hidden="true" />;
}

function RouteIcon({ type }: { type: string }) {
  if (type === "laptop") return <span className="icon-laptop" aria-hidden="true"><span>www.</span></span>;
  if (type === "wifi") return <span className="icon-wifi" aria-hidden="true"><i /><i /><i /><b /></span>;
  if (type === "dns") return <span className="icon-dns" aria-hidden="true"><strong>DNS</strong><small>name → addresses</small></span>;
  if (type === "isp") return <span className="icon-isp" aria-hidden="true"><strong>ISP</strong><small>provider network</small></span>;
  if (type === "router") return <span className="icon-router" aria-hidden="true"><i>↗</i><i>↘</i></span>;
  return <span className="icon-server" aria-hidden="true"><i /><i /><i /></span>;
}

function ChapterMasthead({ number, id, title }: { number: string; id: string; title: string }) {
  return (
    <header className="chapter-masthead">
      <span className="chapter-tag">Chapter {number} / 08</span>
      <h2 id={id}>{title}</h2>
    </header>
  );
}

function ConceptLayout({
  explanation,
  takeaway,
  status,
  children,
  className = "",
}: {
  explanation: ReactNode;
  takeaway: ReactNode;
  status: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"concept-layout " + className}>
      <p className="concept-explanation"><span className="concept-label">What the motion means</span>{explanation}</p>
      <div className="motion-stage">{children}</div>
      <div className="stage-feedback">
        <p className="result-line" role="status" aria-live="polite" aria-atomic="true">{status}</p>
        <p className="takeaway"><strong>Remember:</strong> {takeaway}</p>
      </div>
    </div>
  );
}

function WebStageArt({ step }: { step: number }) {
  return (
    <div className={"web-art web-art-" + step} aria-hidden="true">
      {step === 0 && (
        <div className="web-dns-art">
          <span className="web-ticket">google.com</span>
          <span className="web-art-path"><PacketFace className="web-moving-packet" /></span>
          <span className="web-dns-book">DNS</span>
          <span className="web-ip-ticket">Current IP address(es)</span>
        </div>
      )}
      {step === 1 && (
        <div className="web-handshake-art">
          <span className="handshake-node">Browser<PacketFace className="handshake-out" /></span>
          <span className="handshake-line"><i>setup</i><i>ready</i></span>
          <span className="handshake-node server-handshake">Server<PacketFace className="handshake-back" /></span>
        </div>
      )}
      {step === 2 && (
        <div className="web-lock-art"><span className="secure-tunnel"><PacketFace className="secure-packet" /></span><span className="lock-shape"><i /></span><strong>TLS-secured channel</strong></div>
      )}
      {step === 3 && (
        <div className="web-request-art"><span className="request-card">GET /</span><span className="request-track"><PacketFace className="request-packet" /></span><span className="request-server"><RouteIcon type="server" /></span></div>
      )}
      {step === 4 && (
        <div className="web-files-art"><span className="file-source"><RouteIcon type="server" /></span><span className="file-stream">{["HTML", "CSS", "JS", "IMG"].map((file, index) => <i key={file} className={"file-packet file-" + index}>{file}</i>)}</span><span className="file-browser"><RouteIcon type="laptop" /></span></div>
      )}
      {step === 5 && (
        <div className="web-ready-art"><span className="ready-heading" /><span className="ready-line long" /><span className="ready-line" /><span className="ready-cards"><i /><i /><i /></span><b>Page ready!</b></div>
      )}
    </div>
  );
}

export default function Home() {
  const [activeChapter, setActiveChapter] = useState(-1);
  const [motionPaused, setMotionPaused] = useState(false);
  const [heroRun, setHeroRun] = useState(0);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [helloRun, setHelloRun] = useState(0);
  const [connection, setConnection] = useState<"wifi" | "cable">("wifi");
  const [packetRun, setPacketRun] = useState(0);
  const [missingPacket, setMissingPacket] = useState(false);
  const [dnsResolved, setDnsResolved] = useState(false);
  const [dnsIpRevealed, setDnsIpRevealed] = useState(false);
  const [dnsRun, setDnsRun] = useState(0);
  const [routeBlocked, setRouteBlocked] = useState(false);
  const [routeRun, setRouteRun] = useState(0);
  const [useCase, setUseCase] = useState<UseCase>("file");
  const [raceRun, setRaceRun] = useState(0);
  const [webStep, setWebStep] = useState(0);
  const [webPlaying, setWebPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [latency, setLatency] = useState(40);
  const [bandwidth, setBandwidth] = useState(50);
  const [packetLoss, setPacketLoss] = useState(0);
  const dnsTimer = useRef<number | null>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".chapter-section"));
    const progressSections = Array.from(document.querySelectorAll<HTMLElement>("[data-progress-index]"));
    sections.forEach((section) => section.classList.add("reveal-ready"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (!entry.isIntersecting) {
            if (target.classList.contains("chapter-section")) target.classList.remove("is-active");
            return;
          }
          sections.forEach((section) => section.classList.remove("is-active"));
          if (target.classList.contains("chapter-section")) {
            target.classList.add("is-visible");
            target.classList.add("is-active");
          }
          const index = Number(target.dataset.progressIndex ?? -1);
          setActiveChapter(index);
        });
      },
      { rootMargin: "-32% 0px -46% 0px", threshold: 0 },
    );

    progressSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
      if (media.matches) setWebPlaying(false);
    };
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!webPlaying || motionPaused || activeChapter !== 6) return;
    const timer = window.setInterval(() => {
      setWebStep((current) => {
        if (current >= webSteps.length - 1) {
          setWebPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 3500);
    return () => window.clearInterval(timer);
  }, [activeChapter, motionPaused, webPlaying]);

  useEffect(() => () => {
    if (dnsTimer.current !== null) window.clearTimeout(dnsTimer.current);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".chapter-section"));
    let frame = 0;
    const updateScrollMotion = () => {
      const viewport = window.innerHeight;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
        const centered = progress - 0.5;
        section.style.setProperty("--scene-drift", motionPaused ? "0px" : Math.round(centered * 36) + "px");
        section.style.setProperty("--scene-tilt", motionPaused ? "0deg" : (centered * 1.2).toFixed(2) + "deg");
      });
      frame = 0;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollMotion);
    };
    updateScrollMotion();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [motionPaused]);

  const performance = useMemo(() => {
    const contributions = [
      { label: "waiting for two round trips", seconds: (latency * 2) / 1000 },
      { label: "transferring the 800 KB example at the available bandwidth", seconds: teachingPayloadMegabits / Math.max(bandwidth, 1) },
    ];
    const baselineSeconds = Math.max(
      0.1,
      contributions.reduce((total, contribution) => total + contribution.seconds, 0),
    );
    const biggest = contributions.reduce((largest, contribution) => contribution.seconds > largest.seconds ? contribution : largest);
    const lossSummary = packetLoss === 0
      ? "No packet drops are shown."
      : packetLoss <= 2
        ? "Occasional packet drops are shown."
        : packetLoss <= 5
          ? "Several packet drops are shown."
          : "Frequent packet drops are shown.";
    return { baselineSeconds, biggest, lossSummary };
  }, [latency, bandwidth, packetLoss]);

  const currentUseCase = useCases[useCase];
  const routeStatus = selectedStop === null
    ? "First find the site’s address if needed. Then open a secure connection, ask for the page, and bring the response back."
    : missionStops[selectedStop].note;

  const replayRoute = () => {
    setHeroRun((value) => value + 1);
    setSelectedStop(null);
  };

  const toggleRoute = () => {
    setRouteBlocked((value) => !value);
    setRouteRun((value) => value + 1);
  };

  const playWebsiteJourney = () => {
    setWebStep(0);
    setWebPlaying(!motionPaused && !prefersReducedMotion);
  };

  const toggleMotion = () => {
    if (!motionPaused) setWebPlaying(false);
    setMotionPaused((value) => !value);
  };

  const replayDnsLookup = () => {
    if (dnsTimer.current !== null) window.clearTimeout(dnsTimer.current);
    setDnsResolved(false);
    setDnsIpRevealed(false);
    setDnsRun((value) => value + 1);
    dnsTimer.current = window.setTimeout(() => {
      setDnsResolved(true);
      dnsTimer.current = null;
    }, 1450);
  };

  return (
    <div className={"site " + (motionPaused ? "motion-paused" : "") }>
      <a className="skip-link" href="#main">Skip to the journey</a>
      <div className="page-dots" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Internet in Motion home">
          <span className="brand-face" aria-hidden="true" />
          <span>Internet in Motion</span>
        </a>
        <div className="header-actions">
          <span className="beginner-pill">Beginner friendly · technical terms explained as you go</span>
          <button
            className="motion-toggle"
            type="button"
            aria-pressed={motionPaused}
            onClick={toggleMotion}
          >
            {motionPaused ? "Resume motion" : "Pause motion"}
          </button>
        </div>
      </header>

      <nav className={"chapter-progress " + (activeChapter < 0 ? "is-overview" : "")} aria-label="Eight chapter journey">
        <div className="progress-label">
          <span>Your route</span>
          <strong>{activeChapter < 0 ? "Overview · start here" : `${activeChapter + 1} / 8 · ${chapters[activeChapter].short}`}</strong>
        </div>
        <div className="progress-track" style={{ "--active-chapter": Math.max(activeChapter, 0) } as CSSProperties}>
          <span className="journey-progress-marker" aria-hidden="true"><PacketFace /></span>
          <ol>
            {chapters.map((chapter, index) => (
              <li key={chapter.id} className={index === activeChapter ? "active" : index < activeChapter ? "passed" : ""}>
                <a href={"#" + chapter.id} aria-current={index === activeChapter ? "step" : undefined}>
                  <b>{index + 1}</b>
                  <span>{chapter.short}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <main className="site-shell" id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-title-wrap">
            <p className="eyebrow"><i aria-hidden="true" /> Networking, visually explained</p>
            <h1 id="hero-title">See the Internet<br /><span>in Motion.</span></h1>
          </div>
          <div className="hero-intro">
            <p>Follow one request from your device to a website — and all the way back again.</p>
            <div className="hero-cta-row">
              <a className="primary-button" href="#overview" onClick={replayRoute}>Preview the journey <em>→</em></a>
              <span>8 chapters · one guided playground</span>
            </div>
          </div>
        </section>

        <section id="overview" className="route-lab" data-progress-index="-1" aria-labelledby="route-lab-title">
          <div className="lab-heading">
            <div>
              <p className="lab-kicker">Today’s mission</p>
              <h2 id="route-lab-title">Open google.com and watch the trip.</h2>
            </div>
            <div className="lab-actions">
              <span className="live-pill"><i aria-hidden="true" /> Request journey</span>
              <button className="small-button yellow-button" type="button" onClick={replayRoute}>Replay packets ↻</button>
            </div>
          </div>

          <div className="mission-flow">
            <section className="mission-phase combined-phase" aria-labelledby="mission-journey-title">
              <div className="mission-phase-heading">
                <div><h3 id="mission-journey-title">Find the address. Ask for the page. Bring it back.</h3><p>Your browser needs the site’s address and a secure way to exchange data. If that address is not already saved, DNS briefly branches to a resolver. The website request then continues to the server, and the response returns to your browser. Select any stop to see what it does.</p></div>
              </div>
              <p className="traffic-key"><span className="outbound-key">DNS question + answer ⇅</span><span className="outbound-key connection-key">Secure connection setup ↔</span><span className="outbound-key request-key">Website request →</span><span className="return-key">Website response ←</span></p>
              <ol className="mission-route hero-route combined-route" aria-label="One website journey: the device, local router and provider are shared; DNS branches to a resolver when needed; the request then continues through Internet routers to the web server and responses return">
                {websiteStopIndexes.map((stopIndex, index) => {
                  const stop = missionStops[stopIndex];
                  return (
                    <li className="route-stage" key={"request-" + stop.label}>
                      <button className={"route-station station-" + stop.tone} type="button" onClick={() => setSelectedStop(stopIndex)} aria-pressed={selectedStop === stopIndex}>
                        <span className="speech-bubble">{stop.requestSpeech}</span>
                        <span className="station-tile"><RouteIcon type={stop.icon} /></span>
                        <span className="station-label">{stop.label}</span>
                      </button>
                      {stopIndex === 2 && (
                        <div className="dns-side-lookup">
                          <span className="dns-side-label">Optional DNS side trip · if the site address is not already saved</span>
                          <span className="dns-branch-connector" aria-hidden="true">
                            <PacketFace key={heroRun + "-lookup-out-2"} className="mission-packet lookup-query lookup-query-2" />
                            <PacketFace key={heroRun + "-lookup-back-2"} className="mission-packet lookup-answer lookup-answer-2" />
                          </span>
                          <button className="route-station dns-branch-station station-coral" type="button" onClick={() => setSelectedStop(5)} aria-pressed={selectedStop === 5}>
                            <span className="speech-bubble">{missionStops[5].lookupSpeech}</span>
                            <span className="station-tile"><RouteIcon type="dns" /></span>
                            <span className="station-label">DNS resolver</span>
                          </button>
                        </div>
                      )}
                      {index < websiteStopIndexes.length - 1 && (
                        <span className="route-connector request-connector" aria-hidden="true">
                          {index < 2 && <PacketFace key={heroRun + "-lookup-out-" + index} className={"mission-packet lookup-query lookup-query-" + index} />}
                          {index < 2 && <PacketFace key={heroRun + "-lookup-back-" + index} className={"mission-packet lookup-answer lookup-answer-" + index} />}
                          <PacketFace key={heroRun + "-request-out-" + index} className={"mission-packet website-request website-request-" + index} />
                          <PacketFace key={heroRun + "-response-back-" + index} className={"mission-packet website-response website-response-" + index} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="route-caveat">This is a teaching picture. Saved answers or reused connections can skip steps, and the response may travel along a different route.</p>
            </section>
          </div>

          <p className="status-strip" aria-live="polite">
            <strong>{selectedStop === null ? "One journey" : missionStops[selectedStop].label}</strong>
            <span>{routeStatus}</span>
          </p>
        </section>

        <section id="network" data-chapter-index="0" data-progress-index="0" className="chapter-section chapter-blue" aria-labelledby="network-title">
          <ChapterMasthead number="01" id="network-title" title="Hello, Network!" />
          <p className="chapter-lead"><strong>Goal: Understand what a network does.</strong><span>Start with two connected devices and one message.</span></p>
          <div className="play-card hello-simulator">
            <div className="play-card-heading">
              <div><span className="mini-kicker">Try it</span><h3>Send a message across a tiny network.</h3></div>
              <button className="small-button coral-button" type="button" onClick={() => setHelloRun((value) => value + 1)}>Send “hello” →</button>
            </div>
            <ConceptLayout
              explanation="A network is a group of connected devices that can exchange information. The connection can use a cable, radio waves such as Wi-Fi, or several links joined together."
              takeaway="A network lets connected devices communicate."
              status={helloRun ? "Hello delivered! The connection carried a message from sender to receiver." : "The scene starts automatically. Select Send “hello” to replay it."}
            >
              <div className="hello-scene" aria-hidden="true">
                <div className="device-tile"><small className="attached-label">Sender</small><span className="phone-shape" />Your phone</div>
                <div className="hello-track"><span className="path-caption">Connection carries data</span><PacketFace key={helloRun} className={helloRun ? "hello-moving" : ""} /><PacketFace className="ambient-packet ambient-one" /><PacketFace className="ambient-packet ambient-two" /></div>
                <div className="device-tile mint-device"><small className="attached-label">Receiver</small><span className="screen-shape" />Friend’s laptop</div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="local-network" data-chapter-index="1" data-progress-index="1" className="chapter-section chapter-sky" aria-labelledby="local-title">
          <ChapterMasthead number="02" id="local-title" title="Meet the Neighborhood" />
          <p className="chapter-lead"><strong>Goal: See how your device reaches the first router.</strong><span>Meet the local links around your phone or laptop.</span></p>
          <div className="play-card local-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Choose a path</span><h3>How should the laptop connect?</h3></div>
              <div className="segmented" role="group" aria-label="Connection type">
                <button type="button" aria-pressed={connection === "wifi"} onClick={() => setConnection("wifi")}>Wi-Fi</button>
                <button type="button" aria-pressed={connection === "cable"} onClick={() => setConnection("cable")}>Ethernet cable</button>
              </div>
            </div>
            <ConceptLayout
              explanation="An access point is the Wi-Fi radio your device joins. A gateway is the router that sends traffic from your local network to other networks. Home equipment often combines both jobs in one box."
              takeaway="Your device uses a local link to reach its gateway—the first router on the way to other networks."
              status={<>{connection === "wifi" ? "Wi-Fi radio waves carry the data to the access point." : "An Ethernet cable carries the data to the router."} In this home example, the same box is also the gateway.</>}
            >
              <div className={"local-map " + connection} aria-hidden="true">
                <div className="local-node device-node"><small className="attached-label">Local device</small><span className="icon-laptop"><span>hello</span></span><b>Laptop</b></div>
                <div className="local-path"><PacketFace key={connection + "-out"} className="local-packet" /><PacketFace className="local-packet local-loop" /><span>{connection === "wifi" ? "radio waves" : "ethernet cable"}</span></div>
                <div className="local-node router-node"><span className="wifi-ripples"><i /><i /><i /></span><RouteIcon type="wifi" /><b>Router · gateway</b></div>
                <div className="local-path internet-path"><PacketFace key={connection + "-internet"} className="local-packet second" /><PacketFace className="local-packet local-loop return-loop" /><span>to the internet</span></div>
                <div className="local-node cloud-node"><span className="cloud-shape" /><b>Other networks</b></div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="packets" data-chapter-index="2" data-progress-index="2" className="chapter-section chapter-yellow" aria-labelledby="packets-title">
          <ChapterMasthead number="03" id="packets-title" title="Message, Meet Pieces" />
          <p className="chapter-lead"><strong>Goal: See why data travels in smaller pieces.</strong><span>Local links carry many packets—not one giant message.</span></p>
          <div className="play-card packet-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Reliable-delivery example</span><h3>Watch “NETWORK” split, travel, and come back together.</h3></div>
              <div className="button-pair">
                <button className="small-button blue-button" type="button" onClick={() => setPacketRun((value) => value + 1)}>Replay split ↻</button>
                <button
                  className="small-button coral-button"
                  type="button"
                  aria-pressed={missingPacket}
                  onClick={() => {
                    if (missingPacket) {
                      setMissingPacket(false);
                      setPacketRun((value) => value + 1);
                    } else {
                      setMissingPacket(true);
                    }
                  }}
                >
                  {missingPacket ? "Resend #3" : "Drop #3"}
                </button>
              </div>
            </div>
            <PredictionCheck
              question="In this reliable-delivery example, what should happen if piece #3 is lost?"
              choices={[
                { id: "guess", label: "The receiver guesses the missing part" },
                { id: "recover", label: "The sender notices the gap and sends piece #3 again" },
                { id: "restart", label: "The whole message starts again from the beginning" },
              ]}
              correctChoiceId="recover"
              explanation="With reliable delivery, the receiver reports what arrived. If piece #3 is missing, the sender can send that piece again. Chapter 6 names the transport rules behind this behavior."
              nextAction="Now select Drop #3 to watch the missing piece return."
            />
            <ConceptLayout
              explanation="Networks carry data in packets. This teaching picture uses one letter per packet so the motion is easy to see. Real packet sizes vary, and one packet usually carries many bytes plus header information. Reliable delivery rules can notice missing data and put received bytes back in order."
              takeaway="Packets carry pieces of data, and reliable delivery rules can recover a missing piece and restore the right order."
              status={missingPacket ? "Piece #3 was dropped. Reliable delivery notices the gap and sends that piece again." : packetRun ? "All seven teaching pieces arrived and rebuilt the word NETWORK." : "The message splits automatically when this chapter enters view. Use Replay split to watch again."}
            >
              <div className="packet-motion" role="img" aria-label="The word NETWORK is shown as seven teaching packets; piece three can be dropped and sent again">
                <div className="packet-message" aria-hidden="true"><span>NETWORK</span><i>split into pieces</i></div>
                <div className="packet-lane" aria-hidden="true">
                  {Array.from("NETWORK").map((letter, index) => (
                    <span key={packetRun + "-" + index} className={"letter-packet packet-color-" + (index % 4) + (missingPacket && index === 2 ? " missing" : "")}><b>{index + 1}</b>{letter}</span>
                  ))}
                </div>
                <div className="packet-callouts" aria-hidden="true"><span><b>Order numbers</b> help rebuild data correctly</span><span><b>Data area</b> carries part of the message</span></div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="dns" data-chapter-index="3" data-progress-index="3" className="chapter-section chapter-coral" aria-labelledby="dns-title">
          <ChapterMasthead number="04" id="dns-title" title="The Internet’s Name Game" />
          <p className="chapter-lead"><strong>Goal: Turn a readable site name into a destination address.</strong><span>Routers need an IP address before they can send packets toward google.com.</span></p>
          <div className="play-card dns-simulator">
            <div className="play-card-heading">
              <div><span className="mini-kicker">Animated directory lookup</span><h3>Turn google.com into a destination address.</h3></div>
              <div className="dns-controls">
                <button className="small-button yellow-button" type="button" onClick={replayDnsLookup}>{dnsRun ? "Replay DNS lookup ↻" : "Run DNS lookup →"}</button>
                <button className="small-button blue-button" type="button" disabled={!dnsResolved} onClick={() => setDnsIpRevealed(true)}>Reveal IP address</button>
              </div>
            </div>
            <ConceptLayout
              explanation="An Internet Protocol (IP) address is the number-like destination routers use. The Domain Name System (DNS) is the internet’s directory: it finds one or more IP addresses for a name such as google.com. A DNS resolver may use a saved answer or ask other DNS servers."
              takeaway="DNS turns a human-friendly site name into an IP address that the network can route toward."
              status={!dnsResolved
                ? "Select Run DNS lookup to ask for the address of google.com."
                : dnsIpRevealed
                  ? `One possible IPv4 address is ${exampleGoogleIpv4}. The address for google.com can vary by location and time.`
                  : "The resolver found an address. Select Reveal IP address to see one possible answer."}
            >
              <div className={"dns-flow " + (dnsResolved ? "resolved " : "") + (dnsIpRevealed ? "ip-revealed" : "")} aria-hidden="true">
                <div className="dns-value domain-value"><small>Example domain</small><strong>google.com</strong></div>
                <div className="dns-book"><span>DNS</span><i>?</i><b className="page-flip" /></div>
                <div className="dns-value ip-value"><small>{dnsIpRevealed ? "Example IPv4 address" : "DNS answer"}</small><strong>{dnsIpRevealed ? exampleGoogleIpv4 : dnsResolved ? "Address ready" : "Waiting…"}</strong></div>
                <PacketFace key={dnsRun + "-query"} className="dns-packet dns-query" />
                {dnsResolved && <PacketFace key={dnsRun + "-response"} className="dns-packet dns-response" />}
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="routing" data-chapter-index="4" data-progress-index="4" className="chapter-section chapter-mint" aria-labelledby="routing-title">
          <ChapterMasthead number="05" id="routing-title" title="Pick a Path" />
          <p className="chapter-lead"><strong>Goal: See how routers move a packet one step at a time.</strong><span>Each router chooses the packet’s next hop toward its IP address.</span></p>
          <div className="play-card routing-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Route lab</span><h3>Watch each hop, then block the primary path.</h3></div>
              <button
                className="small-button coral-button"
                type="button"
                aria-label={routeBlocked ? "Primary path blocked. Restore primary path" : "Primary path open. Block primary path"}
                aria-pressed={routeBlocked}
                onClick={toggleRoute}
              >
                {routeBlocked ? "Restore primary path" : "Block primary path"}
              </button>
            </div>
            <PredictionCheck
              question="If the primary link fails and routers learn an alternate route, what can happen next?"
              choices={[
                { id: "stop", label: "All later traffic must stop permanently" },
                { id: "instant", label: "Every router switches paths at exactly the same instant" },
                { id: "alternate", label: "Later packets can use the alternate path after routing updates" },
              ]}
              correctChoiceId="alternate"
              explanation="Routers need time to learn and use the changed route. Once an alternate route is available, later packets can follow it."
              nextAction="Now block the primary path to see the alternate route take over."
            />
            <ConceptLayout
              explanation="A hop is one router-to-router step. In this picture, the route is the sequence of hops a packet follows. Each router chooses only the next hop. Real networks compare metrics (cost scores) and policy (network rules)—not simply the fewest router icons."
              takeaway="Routers forward packets hop by hop, and later packets can use an alternate route after the network learns about a failure."
              status={routeBlocked ? "The primary path failed. After the route updates: You → A → C → D → Site." : "Primary path: You → A → B → Site. Each arrow is one hop in this teaching picture."}
            >
              <div className={"route-map " + (routeBlocked ? "detour" : "direct")} aria-hidden="true">
                <div className="map-endpoint start-point">You<small>start</small></div>
                <div className="path-stack">
                  <div className="route-junction"><i className="map-router shared-router">A</i><small>shared first hop</small></div>
                  <span className="route-fork" aria-hidden="true" />
                  <div className="map-path direct-path"><span className="path-name">Primary path</span><i className="map-router">B</i><PacketFace key={routeRun + "-direct"} className="map-packet" /><PacketFace className="map-packet map-echo" /><b className="blocked-mark">Blocked</b></div>
                  <div className="map-path detour-path"><span className="path-name">Alternate path</span><i className="map-router">C</i><i className="map-router">D</i><PacketFace key={routeRun + "-detour"} className="map-packet" /><PacketFace className="map-packet map-echo" /></div>
                  <span className="route-join" aria-hidden="true" />
                </div>
                <div className="map-endpoint end-point">Site<small>same destination</small></div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="tcp-udp" data-chapter-index="5" data-progress-index="5" className="chapter-section chapter-blue" aria-labelledby="tcp-title">
          <ChapterMasthead number="06" id="tcp-title" title="TCP and UDP: Two Delivery Styles" />
          <p className="chapter-lead"><strong>Goal: Compare two ways applications transport data.</strong><span>Routing chooses where packets go; transport rules shape end-to-end delivery.</span></p>
          <div className="play-card protocol-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">TCP and UDP basics</span><h3>Compare built-in recovery with simpler delivery.</h3></div>
              <button className="small-button yellow-button" type="button" onClick={() => setRaceRun((value) => value + 1)}>Replay comparison ↻</button>
            </div>
            <PredictionCheck
              question="For a live video call, which delivery tradeoff is commonly useful?"
              choices={[
                { id: "fresh", label: "Favor fresh media over waiting for every late packet" },
                { id: "wait", label: "Always pause the call until every packet is recovered" },
                { id: "none", label: "Use no transport protocol at all" },
              ]}
              correctChoiceId="fresh"
              explanation="Real-time media often uses UDP-based delivery and decides for itself whether a missing piece is still useful. That keeps one late piece from always delaying newer audio or video."
              nextAction="Now choose a use case and compare how its delivery needs change."
            />
            <ConceptLayout
              explanation="Transmission Control Protocol (TCP) delivers bytes reliably and in order, sending missing data again. User Datagram Protocol (UDP) alone sends separate packets called datagrams without built-in retry or ordering. QUIC is the name of a modern secure transport: it runs over UDP but adds reliability, encryption, and loss recovery for applications such as HTTP/3."
              takeaway="UDP alone is not the same as QUIC. Applications choose TCP, UDP-based systems, or QUIC based on the delivery behavior they need."
              status={<><strong>{currentUseCase.name}: {currentUseCase.protocol}</strong> — {currentUseCase.summary}</>}
            >
              <div className="protocol-motion">
                <div className="use-case-buttons" role="group" aria-label="Choose a network use case">
                  {(Object.keys(useCases) as UseCase[]).map((key) => (
                    <button key={key} type="button" aria-pressed={useCase === key} onClick={() => { setUseCase(key); setRaceRun((value) => value + 1); }}>{useCases[key].name}</button>
                  ))}
                </div>
                <div className="protocol-lanes" aria-hidden="true">
                  <div className={"protocol-lane tcp-lane " + (currentUseCase.lane === "tcp" ? "recommended" : "")}>
                    <strong>TCP <small>confirm · retry · put in order</small></strong>
                    <div className="protocol-track">{[1, 2, 3, 4].map((item) => <span key={raceRun + "-t-" + item} className={"mini-packet tcp-packet p-" + item}>{item}</span>)}<i className="ack ack-one">received ✓</i><i className="ack ack-two">received ✓</i><b className="retry-flag">retry #3</b></div>
                  </div>
                  <div className={"protocol-lane udp-lane " + (currentUseCase.lane === "udp" ? "recommended" : "")}>
                    <strong>UDP alone <small>separate packets · no built-in retry</small></strong>
                    <div className="protocol-track">{[1, 2, 3, 4].map((item) => <span key={raceRun + "-u-" + item} className={"mini-packet udp-packet p-" + item}>{item === 3 ? "×" : item}</span>)}<i className="keep-going">No built-in retry</i></div>
                  </div>
                </div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="website" data-chapter-index="6" data-progress-index="6" className="chapter-section chapter-sky" aria-labelledby="website-title">
          <ChapterMasthead number="07" id="website-title" title="Open Sesame, Website!" />
          <p className="chapter-lead"><strong>Goal: Put the parts together into one page load.</strong><span>Follow them in order as the browser opens google.com.</span></p>
          <div className="play-card website-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Six-step page load</span><h3>Move through the actions that make google.com appear.</h3></div>
              <button className="small-button blue-button" type="button" disabled={motionPaused || prefersReducedMotion} onClick={playWebsiteJourney}>{motionPaused || prefersReducedMotion ? "Use the steps below" : webPlaying ? "Playing slowly…" : "Play all slowly"}</button>
            </div>
            <ConceptLayout
              className="website-concept-layout"
              explanation="On a first visit, the browser may find the site’s address, open a secure connection, ask for files, receive them, and build the page. Hypertext Transfer Protocol (HTTP) describes the requests and responses; Transport Layer Security (TLS) encrypts them. Saved answers, files, and connections can skip work, and some steps can overlap."
              takeaway="A page appears through several exchanges between the browser and servers—not one single request."
              status={<>Step {webStep + 1} of 6: {webSteps[webStep].detail}</>}
            >
              <ol className="web-stepper" aria-label="Steps for opening a website">
                {webSteps.map((step, index) => (
                  <li key={step.label} className={index === webStep ? "active" : index < webStep ? "complete" : ""}>
                    <button type="button" aria-current={index === webStep ? "step" : undefined} onClick={() => { setWebPlaying(false); setWebStep(index); }}><b>{index + 1}</b><span>{step.label}</span></button>
                  </li>
                ))}
              </ol>
              <div className="browser-scene">
                <div className="browser-window" aria-hidden="true">
                  <div className="browser-bar"><i /><i /><i /><span>https://google.com</span></div>
                  <div key={webStep} className={"browser-page step-" + webStep}><b>{webSteps[webStep].code}</b><WebStageArt step={webStep} /></div>
                </div>
                <div className="web-step-detail">
                  <span>Step {webStep + 1} of 6</span>
                  <h3>{webSteps[webStep].label}</h3>
                  <p>{webSteps[webStep].detail}</p>
                  <div className="step-controls">
                    <button type="button" disabled={webStep === 0} onClick={() => { setWebPlaying(false); setWebStep((value) => Math.max(0, value - 1)); }}>← Previous</button>
                    <button type="button" disabled={webStep === webSteps.length - 1} onClick={() => { setWebPlaying(false); setWebStep((value) => Math.min(webSteps.length - 1, value + 1)); }}>Next →</button>
                  </div>
                </div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <div className="request-thread-shell chapter-seven-thread">
          <p className="synthesis-intro"><strong>Put it together:</strong> Follow one marker from the browser’s first action to the finished page. Choose each stage at your own pace.</p>
          <RequestThread motionPaused={motionPaused} />
        </div>

        <section id="performance" data-chapter-index="7" data-progress-index="7" className="chapter-section chapter-yellow" aria-labelledby="performance-title">
          <ChapterMasthead number="08" id="performance-title" title="The Feel of Fast" />
          <p className="chapter-lead"><strong>Goal: See what makes a connection feel fast or slow.</strong><span>A request can reach the right server and still feel slow or uneven.</span></p>
          <div className="play-card performance-simulator">
            <div className="play-card-heading"><div><span className="mini-kicker">Guided experiment</span><h3>Change one condition at a time and watch the traffic react.</h3></div><button className="small-button coral-button" type="button" onClick={() => { setLatency(40); setBandwidth(50); setPacketLoss(0); }}>Reset</button></div>
            <ConceptLayout
              className="performance-concept-layout"
              explanation="Latency is waiting time; round-trip latency measures there and back in milliseconds (ms). Bandwidth is transfer capacity in megabits per second (Mbps). Packet loss is the percentage of packets that do not arrive. Jitter is how much delay changes from packet to packet."
              takeaway="Real quality depends on latency, bandwidth, packet loss, jitter, the protocol, and the content—not one speed number."
              status={<>No-loss teaching estimate: <strong>~{performance.baselineSeconds.toFixed(1)} seconds</strong>. The largest modeled part is {performance.biggest.label}. {performance.lossSummary} Real loss-recovery time depends on the protocol, round-trip latency, and which packets are lost.</>}
            >
              <p className="performance-guide"><strong>Try this:</strong> First raise latency, then lower bandwidth, then add packet loss. Reset between changes so you can see what each one does.</p>
              <div className="performance-grid">
                <label><span>Round-trip latency <small>there-and-back waiting time</small></span><output>{latency} ms</output><input aria-label="Round-trip latency in milliseconds" type="range" min="10" max="400" step="10" value={latency} onChange={(event) => setLatency(Number(event.target.value))} /></label>
                <label><span>Available bandwidth <small>megabits moved each second</small></span><output>{bandwidth} Mbps</output><input aria-label="Available bandwidth in megabits per second" type="range" min="2" max="100" step="2" value={bandwidth} onChange={(event) => setBandwidth(Number(event.target.value))} /></label>
                <label><span>Packet loss <small>share of packets that do not arrive</small></span><output>{packetLoss}%</output><input aria-label="Packet loss percentage" type="range" min="0" max="10" step="1" value={packetLoss} onChange={(event) => setPacketLoss(Number(event.target.value))} /></label>
              </div>
              <div className="quality-scene">
                <div
                  key={latency + "-" + bandwidth + "-" + packetLoss}
                  className="quality-browser"
                  style={{ "--flow-duration": Math.min(5, Math.max(0.9, performance.baselineSeconds * 1.25)) + "s", "--lane-size": Math.min(34, 12 + bandwidth * 0.22) + "px" } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className="quality-flow-note">Illustrative packet flow · icons are not proportional</span>
                  <span className="quality-fill" style={{ "--load-time": Math.min(6, performance.baselineSeconds) + "s" } as CSSProperties} />
                  <PacketFace className="quality-packet q1" /><PacketFace className={"quality-packet q2 " + (packetLoss >= 2 ? "lost" : "")} /><PacketFace className="quality-packet q3" /><PacketFace className={"quality-packet q4 " + (packetLoss >= 5 ? "lost" : "")} /><PacketFace className="quality-packet q5" />
                </div>
                <div className="quality-result"><span>Simple no-loss estimate</span><strong>~{performance.baselineSeconds.toFixed(1)} sec</strong><b>800 KB (6.4 megabits) · 2 round trips</b><small>Loss is shown visually, not added as a fixed time penalty.</small></div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <div id="playground" className="playground-wrap">
          <JourneyPlayground motionPaused={motionPaused} />
        </div>

        <section className="finish-panel" aria-labelledby="finish-title">
          <span className="finish-burst" aria-hidden="true">★</span>
          <p className="eyebrow"><i aria-hidden="true" /> Journey complete</p>
          <h2 id="finish-title">You can now explain how a website reaches your screen.</h2>
          <p>Your device joins a network and sends data in packets. DNS finds the site’s IP address. Routers move packets hop by hop. TCP, UDP-based systems, or QUIC shape delivery. The browser asks for files and builds the page, while latency, bandwidth, loss, and jitter shape how it feels.</p>
          <a className="primary-button" href="#top">Replay the journey <em>↑</em></a>
        </section>
      </main>

      <footer className="site-footer"><span>Internet in Motion</span><span>Networking, visually explained.</span></footer>
    </div>
  );
}
