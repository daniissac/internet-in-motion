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
  { id: "tcp-udp", short: "TCP / UDP", title: "Stream or Datagrams?" },
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
  { label: "Your device", note: "The browser reuses cached answers and connections when possible. Otherwise it resolves the site name, sets up a secure transport, and sends HTTP requests.", icon: "laptop", tone: "yellow", lookupSpeech: "Where is google.com?", requestSpeech: "Open google.com" },
  { label: "Wi-Fi router", note: "Wi-Fi is the local radio link to an access point. In many homes, the access point and gateway router are combined in one box.", icon: "wifi", tone: "paper", lookupSpeech: "Forward DNS packet", requestSpeech: "Local gateway" },
  { label: "ISP network", note: "Your provider’s network carries packets toward the DNS resolver or the website’s destination network.", icon: "isp", tone: "mint", lookupSpeech: "Toward resolver", requestSpeech: "Across provider network" },
  { label: "Internet routers", note: "Routers forward packets hop by hop toward the destination IP. Different packets or replies can take different routes.", icon: "router", tone: "yellow", requestSpeech: "Route to server IP" },
  { label: "Web server", note: "After a secure transport is established, the server receives HTTP requests and returns response data. The browser may request more resources next.", icon: "server", tone: "sky", requestSpeech: "Response data returns" },
  { label: "DNS resolver", note: "A recursive resolver returns one or more IP addresses from cache or asks authoritative DNS servers. It is a lookup destination, not a hop on the later website-request path.", icon: "dns", tone: "coral", lookupSpeech: "IP answer returns" },
];

const websiteStopIndexes = [0, 1, 2, 3, 4];
const exampleGoogleIpv4 = "192.178.173.100";

const webSteps = [
  { label: "Find address", detail: "The browser resolves the host name unless it already has a usable cached answer.", code: "DNS" },
  { label: "Start transport", detail: "It starts or reuses a transport connection: TCP for HTTP/1.1 or HTTP/2, or QUIC for HTTP/3.", code: "TCP / QUIC" },
  { label: "Secure it", detail: "TLS authenticates the server and protects HTTP data. With HTTP/3, this overlaps with QUIC setup.", code: "TLS" },
  { label: "Request document", detail: "The browser sends an HTTP request for the HTML document.", code: "GET /" },
  { label: "Fetch resources", detail: "As HTML arrives, the browser requests styles, scripts, images, and fonts—sometimes from other servers.", code: "RESPONSES" },
  { label: "Render page", detail: "The browser parses the content and progressively renders the page while more resources may still arrive.", code: "READY" },
];

const useCases = {
  file: {
    name: "File download",
    protocol: "TCP or QUIC",
    lane: "mixed",
    summary: "Reliable transport recovers missing data. HTTP/1.1 and HTTP/2 use TCP; HTTP/3 uses QUIC over UDP.",
  },
  call: {
    name: "Video call",
    protocol: "Usually UDP-based",
    lane: "udp",
    summary: "Fresh media often matters more than late media, though TCP-based fallback paths can be used.",
  },
  game: {
    name: "Online game",
    protocol: "Often UDP-based",
    lane: "udp",
    summary: "Many games send time-sensitive updates over UDP and add reliability only where needed.",
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
      <p className="concept-explanation">{explanation}</p>
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
  const [activeChapter, setActiveChapter] = useState(0);
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
  const [latency, setLatency] = useState(40);
  const [bandwidth, setBandwidth] = useState(50);
  const [packetLoss, setPacketLoss] = useState(0);
  const hasAutoPlayedWebsite = useRef(false);
  const dnsTimer = useRef<number | null>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".chapter-section"));
    sections.forEach((section) => section.classList.add("reveal-ready"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (!entry.isIntersecting) {
            target.classList.remove("is-active");
            return;
          }
          sections.forEach((section) => section.classList.remove("is-active"));
          target.classList.add("is-visible");
          target.classList.add("is-active");
          const index = Number(target.dataset.chapterIndex || 0);
          setActiveChapter(index);
        });
      },
      { rootMargin: "-32% 0px -46% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
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
    }, 950);
    return () => window.clearInterval(timer);
  }, [activeChapter, motionPaused, webPlaying]);

  useEffect(() => {
    if (motionPaused || activeChapter !== 6 || hasAutoPlayedWebsite.current) return;
    hasAutoPlayedWebsite.current = true;
    const timer = window.setTimeout(() => {
      setWebStep(0);
      setWebPlaying(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeChapter, motionPaused]);

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
      { label: "round-trip latency", seconds: (latency * 2) / 1000 },
      { label: "transfer time from available bandwidth", seconds: 18 / Math.max(bandwidth, 1) },
      { label: "loss recovery", seconds: packetLoss * 0.22 },
    ];
    const estimatedSeconds = Math.max(
      0.5,
      contributions.reduce((total, contribution) => total + contribution.seconds, 0),
    );
    const biggest = contributions.reduce((largest, contribution) => contribution.seconds > largest.seconds ? contribution : largest);
    return { estimatedSeconds, biggest };
  }, [latency, bandwidth, packetLoss]);

  const currentUseCase = useCases[useCase];
  const routeStatus = selectedStop === null
    ? "Use a cached DNS answer or resolve the name. Then set up secure transport, send HTTP requests, and receive responses."
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
    setWebPlaying(true);
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
          <span className="beginner-pill">Beginner friendly · no jargon required</span>
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

      <nav className="chapter-progress" aria-label="Eight chapter journey">
        <div className="progress-label">
          <span>Your route</span>
          <strong>{activeChapter + 1} / 8 · {chapters[activeChapter].short}</strong>
        </div>
        <div className="progress-track" style={{ "--active-chapter": activeChapter } as CSSProperties}>
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
              <a className="primary-button" href="#network" onClick={replayRoute}>Start the journey <em>→</em></a>
              <span>8 chapters · one guided playground</span>
            </div>
          </div>
        </section>

        <section className="route-lab" aria-labelledby="route-lab-title">
          <div className="lab-heading">
            <div>
              <p className="lab-kicker">Today’s mission</p>
              <h2 id="route-lab-title">Simulate one tiny website request.</h2>
            </div>
            <div className="lab-actions">
              <span className="live-pill"><i aria-hidden="true" /> Request journey</span>
              <button className="small-button yellow-button" type="button" onClick={replayRoute}>Replay packets ↻</button>
            </div>
          </div>

          <div className="mission-flow">
            <section className="mission-phase combined-phase" aria-labelledby="mission-journey-title">
              <div className="mission-phase-heading">
                <div><h3 id="mission-journey-title">Resolve the name. Reach the site. Return the page.</h3><p>If your device lacks a usable cached address, it sends a DNS query through the Wi-Fi router and ISP to a resolver. Once it has an IP address, the browser establishes a secure connection, sends HTTP requests to the web server, and receives response data.</p></div>
              </div>
              <p className="traffic-key"><span className="outbound-key">DNS query + answer ⇅</span><span className="outbound-key request-key">Secure connection + request →</span><span className="return-key">Response data ←</span></p>
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
                          <span className="dns-side-label">If no usable cached address</span>
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
              <p className="route-caveat">Simulation only: caches or reused connections can skip steps, and exact hops—including the return path—can differ.</p>
            </section>
          </div>

          <p className="status-strip" aria-live="polite">
            <strong>{selectedStop === null ? "One journey" : missionStops[selectedStop].label}</strong>
            <span>{routeStatus}</span>
          </p>
        </section>

        <RequestThread className="request-thread-shell" motionPaused={motionPaused} />

        <section id="network" data-chapter-index="0" className="chapter-section chapter-blue" aria-labelledby="network-title">
          <ChapterMasthead number="01" id="network-title" title="Hello, Network!" />
          <div className="play-card hello-simulator">
            <div className="play-card-heading">
              <div><span className="mini-kicker">Try it</span><h3>Send a message across a tiny network.</h3></div>
              <button className="small-button coral-button" type="button" onClick={() => setHelloRun((value) => value + 1)}>Send “hello” →</button>
            </div>
            <ConceptLayout
              explanation="A network is a group of connected devices that exchange information through wired or wireless links."
              takeaway="A network lets connected devices communicate."
              status={helloRun ? "Hello delivered! The connection carried a message from sender to receiver." : "The scene starts automatically. Press send to replay the hello."}
            >
              <div className="hello-scene" aria-hidden="true">
                <div className="device-tile"><small className="attached-label">Sender</small><span className="phone-shape" />Your phone</div>
                <div className="hello-track"><span className="path-caption">Connection carries data</span><PacketFace key={helloRun} className={helloRun ? "hello-moving" : ""} /><PacketFace className="ambient-packet ambient-one" /><PacketFace className="ambient-packet ambient-two" /></div>
                <div className="device-tile mint-device"><small className="attached-label">Receiver</small><span className="screen-shape" />Friend’s laptop</div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="local-network" data-chapter-index="1" className="chapter-section chapter-sky" aria-labelledby="local-title">
          <ChapterMasthead number="02" id="local-title" title="Meet the Neighborhood" />
          <div className="play-card local-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Choose a path</span><h3>How should the laptop connect?</h3></div>
              <div className="segmented" role="group" aria-label="Connection type">
                <button type="button" aria-pressed={connection === "wifi"} onClick={() => setConnection("wifi")}>Wi-Fi</button>
                <button type="button" aria-pressed={connection === "cable"} onClick={() => setConnection("cable")}>Cable</button>
              </div>
            </div>
            <ConceptLayout
              explanation="Devices on the same home or office network can often communicate locally when network policy allows it. A home router often combines a Wi-Fi access point with the gateway to other networks."
              takeaway="A gateway router links the local network to other networks."
              status={<>{connection === "wifi" ? "Radio waves carry packets through the air." : "A cable carries packets over a physical link."} The router remains the gateway.</>}
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

        <section id="packets" data-chapter-index="2" className="chapter-section chapter-yellow" aria-labelledby="packets-title">
          <ChapterMasthead number="03" id="packets-title" title="Message, Meet Pieces" />
          <div className="play-card packet-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Simplified TCP lab</span><h3>Watch “NETWORK” split, travel, and reassemble.</h3></div>
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
              question="If simplified TCP data piece #3 is lost, what should happen?"
              choices={[
                { id: "guess", label: "The receiver guesses the missing data" },
                { id: "recover", label: "The gap is detected and the sender retransmits the missing data" },
                { id: "restart", label: "Every packet starts again from the beginning" },
              ]}
              correctChoiceId="recover"
              explanation="TCP acknowledgments and timers help the sender detect unacknowledged data and retransmit it. This scene simplifies the exact acknowledgment exchange."
            />
            <ConceptLayout
              explanation="Data is carried in packets. In this simplified TCP example, sequence information helps detect missing data and rebuild the byte stream in order—even when packets arrive out of order."
              takeaway="Internet data travels in packets; reliable transports recover losses and rebuild ordered data."
              status={missingPacket ? "Packet 3 was dropped. TCP acknowledgments help the sender detect the gap and retransmit that data." : packetRun ? "All seven simplified TCP data pieces arrived and reassembled into NETWORK." : "The simplified TCP data splits automatically when this chapter enters view."}
            >
              <div className="packet-motion" role="img" aria-label="The word NETWORK is shown as seven simplified TCP data pieces; one can be dropped and retransmitted">
                <div className="packet-message" aria-hidden="true"><span>NETWORK</span><i>split into pieces</i></div>
                <div className="packet-lane" aria-hidden="true">
                  {Array.from("NETWORK").map((letter, index) => (
                    <span key={packetRun + "-" + index} className={"letter-packet packet-color-" + (index % 4) + (missingPacket && index === 2 ? " missing" : "")}><b>{index + 1}</b>{letter}</span>
                  ))}
                </div>
                <div className="packet-callouts" aria-hidden="true"><span><b>Byte positions</b> help restore data order</span><span><b>Payload</b> carries part of the message</span></div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="dns" data-chapter-index="3" className="chapter-section chapter-coral" aria-labelledby="dns-title">
          <ChapterMasthead number="04" id="dns-title" title="The Internet’s Name Game" />
          <div className="play-card dns-simulator">
            <div className="play-card-heading">
              <div><span className="mini-kicker">Animated lookup</span><h3>Send a name out. Bring an address back.</h3></div>
              <div className="dns-controls">
                <button className="small-button yellow-button" type="button" onClick={replayDnsLookup}>{dnsRun ? "Replay lookup ↻" : "Run lookup →"}</button>
                <button className="small-button blue-button" type="button" disabled={!dnsResolved} onClick={() => setDnsIpRevealed(true)}>Reveal example IP</button>
              </div>
            </div>
            <ConceptLayout
              explanation="For this web lookup, DNS maps a domain name to one or more IPv4 or IPv6 addresses. A recursive resolver may answer from cache or ask other DNS servers."
              takeaway="DNS helps devices find address records associated with domain names."
              status={!dnsResolved
                ? "Select Run lookup to send the simulated DNS query for google.com."
                : dnsIpRevealed
                  ? `One possible IPv4 answer is ${exampleGoogleIpv4}. DNS answers for google.com can vary by location and time.`
                  : "The resolver returned an address. Select Reveal example IP to inspect one possible IPv4 answer."}
            >
              <div className={"dns-flow " + (dnsResolved ? "resolved " : "") + (dnsIpRevealed ? "ip-revealed" : "")} aria-hidden="true">
                <div className="dns-value domain-value"><small>Example domain</small><strong>google.com</strong></div>
                <div className="dns-book"><span>DNS</span><i>?</i><b className="page-flip" /></div>
                <div className="dns-value ip-value"><small>{dnsIpRevealed ? "Example A record" : "DNS response"}</small><strong>{dnsIpRevealed ? exampleGoogleIpv4 : dnsResolved ? "Address ready" : "Waiting…"}</strong></div>
                <PacketFace key={dnsRun + "-query"} className="dns-packet dns-query" />
                {dnsResolved && <PacketFace key={dnsRun + "-response"} className="dns-packet dns-response" />}
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="routing" data-chapter-index="4" className="chapter-section chapter-mint" aria-labelledby="routing-title">
          <ChapterMasthead number="05" id="routing-title" title="Pick a Path" />
          <div className="play-card routing-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Route lab</span><h3>Watch every hop, then remove the direct path.</h3></div>
              <button
                className="small-button coral-button"
                type="button"
                aria-label={routeBlocked ? "Direct path blocked. Restore direct path" : "Direct path open. Block direct path"}
                aria-pressed={routeBlocked}
                onClick={toggleRoute}
              >
                {routeBlocked ? "Restore direct path" : "Block direct path"}
              </button>
            </div>
            <PredictionCheck
              question="If the direct link fails and routers learn an alternate route, what can happen next?"
              choices={[
                { id: "stop", label: "All later traffic must stop permanently" },
                { id: "instant", label: "Every router switches paths at exactly the same instant" },
                { id: "alternate", label: "Later packets can use the alternate path after routing updates" },
              ]}
              correctChoiceId="alternate"
              explanation="Routing protocols and forwarding tables need time to update. Once an alternate route is available, later packets can be forwarded along it."
            />
            <ConceptLayout
              explanation="Each router uses the destination IP and its forwarding table to select the next hop. If a link fails and another route exists, later packets can use it after routes update."
              takeaway="When routing has an alternate, later packets can take a different path to the same destination."
              status={routeBlocked ? "Direct link failed. After routes update: You → A → C → D → Site (3 routers)." : "Shorter route available: You → A → B → Site (2 routers)."}
            >
              <div className={"route-map " + (routeBlocked ? "detour" : "direct")} aria-hidden="true">
                <div className="map-endpoint start-point">You<small>start</small></div>
                <div className="path-stack">
                  <div className="route-junction"><i className="map-router shared-router">A</i><small>shared first hop</small></div>
                  <div className="map-path direct-path"><span className="path-name">Shorter · 2 routers</span><i className="map-router">B</i><PacketFace key={routeRun + "-direct"} className="map-packet" /><PacketFace className="map-packet map-echo" /><b className="blocked-mark">Blocked</b></div>
                  <div className="map-path detour-path"><span className="path-name">Alternate · 3 routers</span><i className="map-router">C</i><i className="map-router">D</i><PacketFace key={routeRun + "-detour"} className="map-packet" /><PacketFace className="map-packet map-echo" /></div>
                </div>
                <div className="map-endpoint end-point">Site<small>same destination</small></div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="tcp-udp" data-chapter-index="5" className="chapter-section chapter-blue" aria-labelledby="tcp-title">
          <ChapterMasthead number="06" id="tcp-title" title="Stream or Datagrams?" />
          <div className="play-card protocol-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Transport behavior</span><h3>Compare built-in reliability with direct datagram delivery.</h3></div>
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
              explanation="Real-time media commonly uses UDP-based transports and application-level recovery so late data does not always stall newer audio or video. TCP-based fallback paths can still be used."
            />
            <ConceptLayout
              explanation="TCP acknowledges data, retransmits missing data, and delivers a reliable byte stream in order. UDP sends independent datagrams without built-in delivery, ordering, or retransmission."
              takeaway="TCP provides reliable, ordered delivery. UDP leaves recovery and timing strategies to the application, but it does not guarantee arrival or low delay."
              status={<><strong>{currentUseCase.name}: {currentUseCase.protocol}</strong> — {currentUseCase.summary}</>}
            >
              <div className="protocol-motion">
                <div className="use-case-buttons" role="group" aria-label="Choose a network use case">
                  {(Object.keys(useCases) as UseCase[]).map((key) => (
                    <button key={key} type="button" aria-pressed={useCase === key} onClick={() => { setUseCase(key); setRaceRun((value) => value + 1); }}>{useCases[key].name}</button>
                  ))}
                </div>
                <div className="protocol-lanes" aria-hidden="true">
                  <div className="protocol-lane tcp-lane">
                    <strong>TCP <small>acknowledge · retry · order</small></strong>
                    <div className="protocol-track">{[1, 2, 3, 4].map((item) => <span key={raceRun + "-t-" + item} className={"mini-packet tcp-packet p-" + item}>{item}</span>)}<i className="ack ack-one">ACK ✓</i><i className="ack ack-two">ACK ✓</i><b className="retry-flag">retry #3</b></div>
                  </div>
                  <div className={"protocol-lane udp-lane " + (currentUseCase.lane === "udp" ? "recommended" : "")}>
                    <strong>UDP <small>datagrams · no built-in retry</small></strong>
                    <div className="protocol-track">{[1, 2, 3, 4].map((item) => <span key={raceRun + "-u-" + item} className={"mini-packet udp-packet p-" + item}>{item === 3 ? "×" : item}</span>)}<i className="keep-going">No built-in retry →</i></div>
                  </div>
                </div>
              </div>
            </ConceptLayout>
          </div>
        </section>

        <section id="website" data-chapter-index="6" className="chapter-section chapter-sky" aria-labelledby="website-title">
          <ChapterMasthead number="07" id="website-title" title="Open Sesame, Website!" />
          <div className="play-card website-simulator">
            <div className="play-card-heading stacked-mobile">
              <div><span className="mini-kicker">Six-scene payoff</span><h3>Watch the key exchanges that make a website appear.</h3></div>
              <button className="small-button blue-button" type="button" onClick={playWebsiteJourney}>{webPlaying ? "Playing…" : "Play all steps"}</button>
            </div>
            <ConceptLayout
              className="website-concept-layout"
              explanation="On a first visit, a browser often resolves the name, establishes a secure transport, sends HTTP requests, receives responses, and renders the page. Cached answers, cached files, and reused connections can skip work, and some steps overlap."
              takeaway="Loading a page usually involves multiple request–response exchanges, often overlapping."
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

        <section id="performance" data-chapter-index="7" className="chapter-section chapter-yellow" aria-labelledby="performance-title">
          <ChapterMasthead number="08" id="performance-title" title="The Feel of Fast" />
          <div className="play-card performance-simulator">
            <div className="play-card-heading"><div><span className="mini-kicker">Teaching-model mixer</span><h3>Change the connection and watch traffic react.</h3></div><button className="small-button coral-button" type="button" onClick={() => { setLatency(40); setBandwidth(50); setPacketLoss(0); }}>Reset</button></div>
            <ConceptLayout
              className="performance-concept-layout"
              explanation="Round-trip latency adds waiting to connection and request–response exchanges. Available bandwidth limits large transfers. Loss can trigger recovery or leave gaps in real-time media."
              takeaway="Real quality depends on delay, available bandwidth, loss—and sometimes jitter—not one speed number."
              status={<>Within this teaching model, the largest time contribution is <strong>{performance.biggest.label}</strong> (~{performance.biggest.seconds.toFixed(1)} seconds).</>}
            >
              <div className="performance-grid">
                <label><span>Round-trip latency <small>waiting per round trip</small></span><output>{latency} ms</output><input aria-label="Round-trip latency" type="range" min="10" max="400" step="10" value={latency} onChange={(event) => setLatency(Number(event.target.value))} /></label>
                <label><span>Available bandwidth <small>transfer capacity</small></span><output>{bandwidth} Mbps</output><input aria-label="Available bandwidth" type="range" min="2" max="100" step="2" value={bandwidth} onChange={(event) => setBandwidth(Number(event.target.value))} /></label>
                <label><span>Packet loss <small>dropped packets</small></span><output>{packetLoss}%</output><input aria-label="Packet loss" type="range" min="0" max="10" step="1" value={packetLoss} onChange={(event) => setPacketLoss(Number(event.target.value))} /></label>
              </div>
              <div className="quality-scene">
                <div
                  key={latency + "-" + bandwidth + "-" + packetLoss}
                  className="quality-browser"
                  style={{ "--flow-duration": Math.min(5, Math.max(0.9, performance.estimatedSeconds * 1.25)) + "s", "--lane-size": Math.min(34, 12 + bandwidth * 0.22) + "px" } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className="quality-flow-note">Illustrative packet flow · icons are not proportional</span>
                  <span className="quality-fill" style={{ "--load-time": Math.min(6, performance.estimatedSeconds) + "s" } as CSSProperties} />
                  <PacketFace className="quality-packet q1" /><PacketFace className={"quality-packet q2 " + (packetLoss >= 2 ? "lost" : "")} /><PacketFace className="quality-packet q3" /><PacketFace className={"quality-packet q4 " + (packetLoss >= 5 ? "lost" : "")} /><PacketFace className="quality-packet q5" />
                </div>
                <div className="quality-result"><span>Illustrative load model</span><strong>~{performance.estimatedSeconds.toFixed(1)} sec</strong><b>18 Mb · 2 round trips</b><small>Teaching model—not a measurement.</small></div>
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
          <h2 id="finish-title">You followed one request across the internet and back.</h2>
          <p>Networks connect devices. Packets carry data. DNS returns records. Routing builds paths; routers forward packets. Transport protocols add delivery behavior. Performance shapes the experience.</p>
          <a className="primary-button" href="#top">Replay the journey <em>↑</em></a>
        </section>
      </main>

      <footer className="site-footer">
        <span>Internet in Motion</span>
        <span>Networking, visually explained.</span>
        <a href="https://github.com/daniissac/internet-in-motion" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
      </footer>
    </div>
  );
}
