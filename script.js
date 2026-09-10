"use strict";

const byId = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const MOTION_SCALE = 1.65;

function motionTime(milliseconds) {
  return reducedMotion.matches ? 1 : Math.round(milliseconds * MOTION_SCALE);
}

function teachingPause(milliseconds) {
  return reducedMotion.matches ? Math.max(1200, milliseconds) : Math.round(milliseconds * MOTION_SCALE);
}

function restartAnimation(element, className) {
  element.classList.remove(className);
  requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add(className)));
}

function play(element, keyframes, options) {
  element.getAnimations().forEach((animation) => animation.cancel());
  const requestedDuration = options?.duration ?? 900;
  const requestedDelay = options?.delay ?? 0;
  const animation = element.animate(keyframes, {
    easing: "ease-in-out",
    fill: "forwards",
    ...options,
    duration: motionTime(requestedDuration),
    delay: reducedMotion.matches ? 0 : Math.round(requestedDelay * MOTION_SCALE),
  });
  return animation;
}

function horizontalFrames(element, container, start, end, reverse = false) {
  const containerRect = container.getBoundingClientRect();
  const startRect = start.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  const width = element.getBoundingClientRect().width;
  const from = startRect.left + startRect.width / 2 - containerRect.left - width / 2;
  const to = endRect.left + endRect.width / 2 - containerRect.left - width / 2;
  const a = reverse ? to : from;
  const b = reverse ? from : to;
  return [
    { opacity: 0, transform: `translate3d(${a}px, -50%, 0)` },
    { opacity: 1, offset: .12, transform: `translate3d(${a}px, -50%, 0)` },
    { opacity: 1, offset: .86, transform: `translate3d(${b}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${b}px, -50%, 0)` },
  ];
}

let overviewRun = 0;

async function playOverview() {
  const run = ++overviewRun;
  const track = document.querySelector(".route-line");
  const request = track.querySelector(".request-token");
  const response = track.querySelector(".response-token");
  const cached = byId("overview-dns-cached").checked;
  const status = byId("overview-status");

  if (cached) {
    status.textContent = "A usable DNS answer is cached, so the resolver side trip is skipped.";
  } else {
    status.textContent = "No cached answer: the browser sends a DNS query to its resolver.";
    await playAcross(document.querySelector(".overview-dns-query"), { duration: 760 }).finished.catch(() => {});
    if (run !== overviewRun) return;
    status.textContent = "The resolver returns an IP address. The browser now knows where to connect.";
    await playAcross(document.querySelector(".overview-dns-answer"), { reverse: true, duration: 760 }).finished.catch(() => {});
    if (run !== overviewRun) return;
  }

  const requestDistance = Math.max(0, track.clientWidth - request.offsetWidth / 2);
  status.textContent = "The browser sends an HTTP request across the gateway and routed internet path.";
  await play(request, [
    { opacity: 0, transform: "translate3d(-50%, -50%, 0)" },
    { opacity: 1, offset: .12 },
    { opacity: 1, offset: .88, transform: `translate3d(${requestDistance}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${requestDistance}px, -50%, 0)` },
  ], { duration: reducedMotion.matches ? 1 : 1500 }).finished.catch(() => {});
  if (run !== overviewRun) return;

  const responseDistance = Math.max(0, track.clientWidth - response.offsetWidth / 2);
  status.textContent = "The server’s response travels back toward the browser.";
  await play(response, [
    { opacity: 0, transform: `translate3d(${responseDistance}px, -50%, 0)` },
    { opacity: 1, offset: .12 },
    { opacity: 1, offset: .88, transform: "translate3d(-50%, -50%, 0)" },
    { opacity: 0, transform: "translate3d(-50%, -50%, 0)" },
  ], { duration: reducedMotion.matches ? 1 : 1500 }).finished.catch(() => {});
  if (run === overviewRun) status.textContent = "Journey complete: name resolved, secure connection prepared, request sent, and response returned.";
}

async function sendNetworkExchange() {
  const route = document.querySelector(".hello-demo .mini-route");
  const nodes = route.querySelectorAll("b");
  const message = route.querySelector(".message");
  message.textContent = "REQUEST →";
  byId("hello-status").textContent = "The browser’s request is crossing the network toward the server…";
  await play(message, horizontalFrames(message, route, nodes[0], nodes[nodes.length - 1]), { duration: reducedMotion.matches ? 1 : 1200 }).finished.catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, teachingPause(350)));
  message.textContent = "← RESPONSE";
  byId("hello-status").textContent = "The server received the request and is sending a response back…";
  await play(message, horizontalFrames(message, route, nodes[0], nodes[nodes.length - 1], true), { duration: reducedMotion.matches ? 1 : 1200 }).finished.catch(() => {});
  byId("hello-status").textContent = "Exchange complete: the browser sent a request and received the server’s response.";
}

function setLocalMode(mode) {
  const route = document.querySelector(".local-route");
  const link = mode === "wifi"
    ? { label: "Wi-Fi radio", selected: "Wi-Fi selected. Radio waves carry the local frame to the access point in the gateway device." }
    : { label: "Ethernet cable", selected: "Ethernet selected. Electrical signals carry the local frame along the cable to the gateway." };
  route.dataset.link = mode;
  byId("local-medium-label").textContent = link.label;
  byId("connection-status").textContent = `${link.selected} Send data to continue toward the internet.`;
  return link;
}

function sendLocal() {
  const route = document.querySelector(".local-route");
  const mode = document.querySelector('[name="connection"]:checked').value;
  const link = setLocalMode(mode);
  const nodes = route.querySelectorAll("b");
  const packet = route.querySelector(".local-packet");
  const containerRect = route.getBoundingClientRect();
  const width = packet.getBoundingClientRect().width;
  const positions = [...nodes].map((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left + rect.width / 2 - containerRect.left - width / 2;
  });
  byId("connection-status").textContent = mode === "wifi"
    ? "The frame is crossing the Wi-Fi radio link to the gateway…"
    : "The frame is crossing the Ethernet cable to the gateway…";
  const animation = play(packet, [
    { opacity: 0, transform: `translate3d(${positions[0]}px, -50%, 0)` },
    { opacity: 1, offset: .08 },
    { opacity: 1, offset: .48, transform: `translate3d(${positions[1]}px, -50%, 0)` },
    { opacity: .55, offset: .54, transform: `translate3d(${positions[1]}px, -50%, 0)` },
    { opacity: 1, offset: .9, transform: `translate3d(${positions[2]}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${positions[2]}px, -50%, 0)` },
  ], { duration: reducedMotion.matches ? 1 : 1800 });
  animation.finished.then(() => {
    byId("connection-status").textContent = `${link.selected} The gateway forwarded the packet toward the internet.`;
  }).catch(() => {});
}

function playAcross(token, { reverse = false, drop = false, delay = 0, duration = 850 } = {}) {
  const wire = token.parentElement;
  const distance = Math.max(0, wire.clientWidth - token.offsetWidth);
  const start = reverse ? distance : 0;
  const end = reverse ? 0 : distance;
  const finalX = drop ? start + (end - start) * .55 : end;
  const frames = drop ? [
    { opacity: 0, transform: `translate3d(${start}px, -50%, 0)` },
    { opacity: 1, offset: .1, transform: `translate3d(${start}px, -50%, 0)` },
    { opacity: 1, offset: .55, transform: `translate3d(${finalX}px, -50%, 0)` },
    { opacity: 1, offset: .82, backgroundColor: "#b43c32", transform: `translate3d(${finalX}px, 35%, 0) scale(.9)` },
    { opacity: 0, backgroundColor: "#b43c32", transform: `translate3d(${finalX}px, 35%, 0) scale(.9)` },
  ] : [
    { opacity: 0, transform: `translate3d(${start}px, -50%, 0)` },
    { opacity: 1, offset: .12, transform: `translate3d(${start}px, -50%, 0)` },
    { opacity: 1, offset: .88, transform: `translate3d(${finalX}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${finalX}px, -50%, 0)` },
  ];
  return play(token, frames, {
    duration: reducedMotion.matches ? 1 : duration,
    delay: reducedMotion.matches ? 0 : delay,
  });
}

async function runPacketDemo(button, recover) {
  button.disabled = true;
  const receivedPiece = document.querySelector('[data-packet="3"]');
  if (recover) {
    byId("packet-status").textContent = "The sender retransmits only missing piece 3.";
    await playAcross(document.querySelector('[data-flight="3"]'), { duration: 1400 }).finished.catch(() => {});
    receivedPiece.classList.remove("lost");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Drop #3";
    byId("packet-status").textContent = "Piece 3 arrived. The receiver can rebuild NETWORK in order.";
  } else {
    byId("packet-status").textContent = "Seven numbered packets leave the sender. Watch piece 3 turn red and fall out halfway across.";
    const animations = [...document.querySelectorAll("[data-flight]")].map((token, index) => {
      const drop = index === 2;
      return playAcross(token, { drop, delay: index * 180, duration: drop ? 2200 : 1500 });
    });
    await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    receivedPiece.classList.add("lost");
    button.setAttribute("aria-pressed", "true");
    button.textContent = "Resend #3";
    byId("packet-status").textContent = "Pieces 1, 2, 4, 5, 6, and 7 arrived. The gap identifies piece 3 for retransmission.";
  }
  button.disabled = false;
}

async function playPacketDelivery() {
  const dropButton = document.querySelector('[data-action="drop-packet"]');
  const receivedPiece = document.querySelector('[data-packet="3"]');
  receivedPiece.classList.remove("lost");
  dropButton.setAttribute("aria-pressed", "false");
  dropButton.textContent = "Drop #3";
  byId("packet-status").textContent = "Seven numbered teaching pieces are crossing the reliable-transport path…";
  const animations = [...document.querySelectorAll("[data-flight]")].map((token, index) =>
    playAcross(token, { delay: index * 90 })
  );
  await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
  byId("packet-status").textContent = "All seven teaching pieces arrived and rebuild NETWORK in order.";
}

async function runDnsLookup(button) {
  button.disabled = true;
  byId("dns-answer").textContent = "?";
  byId("dns-status").textContent = "No cached answer is available, so the browser asks its configured DNS resolver.";
  await playAcross(document.querySelector(".dns-query"), { duration: 750 }).finished.catch(() => {});
  byId("dns-status").textContent = "The resolver returns an address the browser can use to contact the website.";
  await playAcross(document.querySelector(".dns-response"), { reverse: true, duration: 750 }).finished.catch(() => {});
  byId("dns-answer").textContent = "142.250.183.14";
  byId("dns-status").textContent = "DNS is complete for this example. The browser can now start a connection to 142.250.183.14; a real answer can vary.";
  button.textContent = "Look up again ↻";
  button.disabled = false;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  switch (button.dataset.action) {
    case "replay-route": {
      playOverview();
      break;
    }
    case "send-network-exchange": {
      sendNetworkExchange();
      break;
    }
    case "send-local": {
      sendLocal();
      break;
    }
    case "drop-packet": {
      runPacketDemo(button, button.getAttribute("aria-pressed") === "true");
      break;
    }
    case "replay-packets": {
      playPacketDelivery();
      break;
    }
    case "dns-lookup": {
      runDnsLookup(button);
      break;
    }
    case "replay-routing": {
      clearTimeout(routeConvergenceTimer);
      const route = byId("route-choice");
      const failed = byId("path-failure").checked;
      route.classList.toggle("failed", failed);
      route.classList.remove("converging");
      restartAnimation(route, "playing");
      byId("route-status").textContent = failed
        ? "Replaying the available alternate multi-hop path."
        : "Replaying the simplified primary multi-hop path after the device reaches its gateway.";
      break;
    }
    case "replay-transport": {
      showTransport(document.querySelector('[name="transport-demo"]:checked').value);
      break;
    }
    case "previous-step":
      stopStepPlayback();
      showStep(stepIndex - 1);
      break;
    case "next-step":
      stopStepPlayback();
      showStep(stepIndex + 1);
      break;
    case "select-step":
      stopStepPlayback();
      showStep(Number(button.dataset.stepIndex));
      break;
    case "play-steps":
      toggleStepPlayback();
      break;
    case "replay-steps":
      replaySteps();
      break;
    case "run-experiment":
      runExperiment(button.dataset.experiment);
      break;
  }
});

document.querySelectorAll(".prediction").forEach((form) => {
  const feedback = form.querySelector(".prediction-feedback");
  form.addEventListener("change", () => {
    form.querySelectorAll("label").forEach((label) => label.classList.remove("correct", "incorrect"));
    feedback.classList.remove("correct", "incorrect");
    feedback.textContent = "Answer changed. Check your reasoning when ready.";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const choice = new FormData(form).get(form.querySelector('input[type="radio"]').name);
    form.querySelectorAll("label").forEach((label) => label.classList.remove("correct", "incorrect"));
    feedback.classList.remove("correct", "incorrect");
    if (!choice) {
      feedback.textContent = "Choose an answer first.";
      return;
    }
    const correct = choice === form.dataset.answer;
    const selected = form.querySelector(`input[value="${choice}"]`).closest("label");
    selected.classList.add(correct ? "correct" : "incorrect");
    feedback.classList.add(correct ? "correct" : "incorrect");
    feedback.textContent = correct ? form.dataset.correct : form.dataset.incorrect;
  });
});

document.querySelector('[data-choice="connection"]').addEventListener("change", (event) => {
  setLocalMode(event.target.value);
});

byId("overview-dns-cached").addEventListener("change", (event) => {
  overviewRun += 1;
  byId("overview-status").textContent = event.target.checked
    ? "Cached answer selected. The next journey will skip the DNS resolver side trip."
    : "Cache cleared for this teaching run. The next journey will query the DNS resolver.";
});

const transportStories = {
  tcp: {
    title: "TCP connects, then TLS 1.3 secures it",
    summary: "This full new-connection example shows the messages required before normal HTTP application data.",
    lanes: [
      ["TCP · SYN", "SYN →", "forward", 0],
      ["TCP · SYN-ACK", "← SYN-ACK", "reverse", 550],
      ["TCP · final ACK", "ACK →", "forward", 1100],
      ["TLS · ClientHello", "HELLO →", "forward", 1650],
      ["TLS · ServerHello + certificate", "← SERVER TLS", "reverse", 2200],
      ["TLS · Client Finished", "FINISHED →", "forward", 2750],
      ["HTTP · Request", "GET →", "forward", 3300],
    ],
    events: [
      ["Connect", "SYN, SYN-ACK, and ACK establish TCP."],
      ["Secure", "The client sends ClientHello. The server returns ServerHello, certificate and authentication messages, then Finished; the client replies with Finished."],
      ["Request", "The browser can now send normal HTTP application data."],
    ],
  },
  quic: {
    title: "QUIC integrates transport and TLS 1.3 setup",
    summary: "This new 1-RTT connection completes its combined handshake before the normal HTTP/3 exchange.",
    lanes: [
      ["QUIC · Initial + ClientHello", "INITIAL →", "forward", 0],
      ["QUIC · Server handshake", "← HANDSHAKE", "reverse", 650],
      ["QUIC · Finished + request", "FINISHED + GET →", "forward", 1300],
      ["Stream A · HTML", "← HTML", "reverse", 1950],
      ["Stream B · Image", "← IMG", "reverse", 2050],
    ],
    events: [
      ["Connect + secure", "QUIC integrates TLS 1.3 into its transport handshake."],
      ["Request at 1-RTT", "After the server’s handshake response, the client completes the handshake and sends normal HTTP/3 data."],
      ["Isolate loss", "A delayed image stream need not stop the HTML stream."],
    ],
  },
};

function showTransport(mode, animate = true) {
  const story = transportStories[mode];
  const output = byId("transport-output");
  output.dataset.mode = mode;
  output.innerHTML = `<div class="transport-result-head"><span class="eyebrow">Result</span><strong>${story.title}</strong><span>${story.summary}</span></div><div class="transport-journey" aria-hidden="true"><span class="transport-endpoint">Browser</span><div class="transport-lanes">${story.lanes.map(([label, token, direction, delay]) => `<div class="transport-lane"><span>${label}</span><i data-direction="${direction}" data-delay="${delay}">${token}</i></div>`).join("")}</div><span class="transport-endpoint">Server</span></div><ol class="transport-events">${story.events.map(([title, copy], index) => `<li><b>${index + 1}</b><span><strong>${title}</strong>${copy}</span></li>`).join("")}</ol>`;
  if (animate) output.querySelectorAll(".transport-lane i").forEach((token) => {
    playAcross(token, {
      reverse: token.dataset.direction === "reverse",
      delay: Number(token.dataset.delay),
      duration: 760,
    });
  });
}

document.querySelector('[data-choice="transport"]').addEventListener("change", (event) => {
  showTransport(event.target.value);
});
showTransport("tcp", false);

let routeConvergenceTimer;

byId("path-failure").addEventListener("change", (event) => {
  const route = byId("route-choice");
  clearTimeout(routeConvergenceTimer);
  route.classList.remove("playing", "converging", "failed");
  if (!event.target.checked) {
    restartAnimation(route, "playing");
    byId("route-status").textContent = "The device sends to its gateway; traffic then crosses the simplified primary multi-hop path.";
    return;
  }

  route.classList.add("converging");
  byId("route-status").textContent = "The primary path failed. Packets pause while routing information converges…";
  routeConvergenceTimer = setTimeout(() => {
    route.classList.remove("converging");
    route.classList.add("failed");
    restartAnimation(route, "playing");
    byId("route-status").textContent = "After convergence, routers forward the packet along the available alternate multi-hop path.";
  }, motionTime(900));
});

const pageSteps = [
  { short: "Device", title: "Enter the site name", where: "Your browser", copy: "The browser receives the name of the site you want to open.", why: "It needs to know which site you want." },
  { short: "DNS query", title: "Ask DNS for an address", where: "Browser to DNS resolver", copy: "With no usable cached answer, the device sends a DNS query to its configured resolver.", why: "A new site connection needs a destination IP address.", dns: true },
  { short: "DNS answer", title: "Receive the destination address", where: "DNS resolver to browser", copy: "The resolver returns an IP address that can be used to reach the site.", why: "Routers forward toward IP destinations, not the human-friendly name.", dns: true },
  { short: "Connect", title: "Create or reuse secure transport", where: "Browser to web server", copy: "TCP with TLS or QUIC handshake messages cross the local gateway and routed path.", why: "The browser needs protected transport before normal HTTP data." },
  { short: "Request", title: "Send the HTTP request", where: "Browser to web server", copy: "The browser asks for the page document. That request is carried in packets across the network.", why: "HTTP identifies the resource and describes what the browser wants." },
  { short: "Response", title: "Receive and process resources", where: "Web server to browser", copy: "The browser parses arriving data and can discover more CSS, JavaScript, images, fonts, and other resources.", why: "A real page is usually assembled from multiple responses." },
  { short: "Render", title: "Render progressively", where: "Inside the browser", copy: "The browser performs layout and painting as enough content becomes available.", why: "Useful content can appear before every resource has finished." },
];
let stepIndex = 0;
let stepPlaybackTimer;

function visiblePageSteps() {
  return byId("journey-dns-cached").checked ? pageSteps.filter((step) => !step.dns) : pageSteps;
}

function renderJourneyStages() {
  const steps = visiblePageSteps();
  byId("journey-stages").innerHTML = steps.map((step, index) =>
    `<li><button type="button" data-action="select-step" data-step-index="${index}"${index === stepIndex ? ' aria-current="step"' : ""}><i>${index + 1}</i><span>${step.short}</span></button></li>`
  ).join("");
  const progress = byId("journey-progress");
  progress.max = steps.length;
  progress.value = stepIndex + 1;
  progress.textContent = `${stepIndex + 1} of ${steps.length}`;
}

function showStep(nextIndex) {
  const steps = visiblePageSteps();
  stepIndex = Math.max(0, Math.min(steps.length - 1, nextIndex));
  const step = steps[stepIndex];
  byId("step-count").textContent = `Stage ${stepIndex + 1} of ${steps.length}`;
  byId("step-title").textContent = step.title;
  byId("step-copy").textContent = step.copy;
  byId("step-where").textContent = step.where;
  byId("step-why").textContent = step.why;
  document.querySelector('[data-action="previous-step"]').disabled = stepIndex === 0;
  const next = document.querySelector('[data-action="next-step"]');
  next.disabled = stepIndex === steps.length - 1;
  next.textContent = stepIndex === steps.length - 1 ? "Complete ✓" : "Next →";
  renderJourneyStages();
}

function stopStepPlayback() {
  clearTimeout(stepPlaybackTimer);
  stepPlaybackTimer = undefined;
  const playButton = document.querySelector('[data-action="play-steps"]');
  if (playButton) playButton.textContent = "Play all";
}

function advanceStepPlayback() {
  const steps = visiblePageSteps();
  if (stepIndex >= steps.length - 1) {
    stopStepPlayback();
    return;
  }
  showStep(stepIndex + 1);
  stepPlaybackTimer = setTimeout(advanceStepPlayback, teachingPause(1700));
}

function toggleStepPlayback() {
  if (stepPlaybackTimer) {
    stopStepPlayback();
    return;
  }
  if (stepIndex >= visiblePageSteps().length - 1) showStep(0);
  document.querySelector('[data-action="play-steps"]').textContent = "Pause";
  stepPlaybackTimer = setTimeout(advanceStepPlayback, teachingPause(900));
}

function replaySteps() {
  stopStepPlayback();
  showStep(0);
  toggleStepPlayback();
}

byId("journey-dns-cached").addEventListener("change", (event) => {
  stopStepPlayback();
  stepIndex = 0;
  showStep(0);
  byId("step-copy").textContent = event.target.checked
    ? "A usable cached DNS answer is available, so this playback skips the DNS query and answer stages."
    : pageSteps[0].copy;
});

showStep(0);

function updateRangeOutput(input) {
  const suffix = input.id === "latency" || input.id === "jitter" || input.id === "route-recovery" ? " ms" : input.id === "bandwidth" ? " Mbps" : "%";
  byId(`${input.id}-output`).textContent = `${input.value}${suffix}`;
}

for (const input of document.querySelectorAll('.sliders input[type="range"]')) {
  input.addEventListener("input", () => updateRangeOutput(input));
}

const payloadMegabits = 6.4;

function calculateJourney(inputs) {
  const { dnsCached, pathFailure, transport, latency, bandwidth, loss, jitter, routeRecovery } = inputs;
  const dns = dnsCached ? 0 : latency;
  const pathRecovery = pathFailure ? routeRecovery : 0;
  const transportSetup = transport === "tcp" ? latency * 2 : latency;
  const request = latency;
  const transfer = Math.ceil((payloadMegabits / bandwidth) * 1000);
  const lossRate = loss / 100;
  const lossPenalty = loss === 0 ? 0 : Math.ceil(transfer * (lossRate / (1 - lossRate)) + latency);
  const total = dns + pathRecovery + transportSetup + request + transfer + lossPenalty;
  let elapsed = 0;
  const events = [[elapsed, "Navigation started", "The browser needs an IP address before it can start a new connection to the site."]];

  if (dnsCached) {
    events.push([elapsed, "Cached DNS answer used", "No DNS query is counted in this run."]);
  } else {
    events.push([elapsed, "DNS query sent", "The device asks its configured DNS resolver for the site’s IP address."]);
    elapsed += dns;
    events.push([elapsed, "DNS answer received", "The model counts one resolver round trip; real resolution and caching behavior can vary."]);
  }

  if (pathFailure) {
    events.push([elapsed, "Path failure detected", "The first modeled routed path cannot carry the connection."]);
    elapsed += pathRecovery;
    events.push([elapsed, "Alternate path selected", `The model uses your ${routeRecovery.toLocaleString()} ms route-recovery assumption.`]);
  } else {
    events.push([elapsed, "Destination path available", "Packets can proceed toward the server."]);
  }

  events.push([elapsed, transport === "tcp" ? "TCP and TLS setup started" : "QUIC setup started", "A new secure connection is modeled."]);
  elapsed += transportSetup;
  events.push([elapsed, "Secure connection ready", transport === "tcp" ? "HTTP can use the TCP connection." : "HTTP/3 can use the QUIC connection."]);
  events.push([elapsed, "HTTP request sent", "The browser asks for the document."]);
  elapsed += request;
  events.push([elapsed, "First response data arrives", "One request and response round trip completes."]);
  events.push([elapsed, "Response data transferring", "An 800 KB teaching payload crosses the available bandwidth."]);
  elapsed += transfer;

  if (lossPenalty > 0) {
    events.push([elapsed, "Illustrative loss penalty", "The model adds a teaching approximation; real loss recovery depends on the transport, congestion control, timing, and which data is lost."]);
    elapsed += lossPenalty;
    events.push([elapsed, "Reliable data recovered", "A reliable transport retransmits missing data when recovery is required."]);
  }
  if (jitter > 0) {
    events.push([elapsed, "Variable delay observed", `Jitter can vary individual packet delay by roughly ${jitter} ms in this scenario. It is reported but not added as a fixed total.`]);
  }
  events.push([elapsed, "Network model complete", "The response bytes are available to the browser; parsing and rendering time are not included."]);

  const baseOutcome = pathFailure
    ? loss > 0 ? "Modeled response transferred on an alternate path with a loss penalty" : "Modeled response transferred on an alternate path"
    : loss > 0 ? "Modeled response transferred with a loss penalty" : "Modeled response transferred on the available path";
  const outcome = jitter > 0 ? `${baseOutcome}; packet delay also varies` : baseOutcome;
  return { total, dns, pathRecovery, transportSetup, request, transfer, lossPenalty, jitter, outcome, events };
}

function addBreakdown(label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = `${value.toLocaleString()} ms`;
  row.append(term, detail);
  byId("breakdown").append(row);
}

function addEvent([time, label, detail]) {
  const item = document.createElement("li");
  const timestamp = document.createElement("time");
  const copy = document.createElement("div");
  const heading = document.createElement("strong");
  const description = document.createElement("span");
  timestamp.textContent = `+${time.toLocaleString()} ms`;
  heading.textContent = label;
  description.textContent = detail;
  copy.append(heading, description);
  item.append(timestamp, copy);
  byId("event-log").append(item);
}

byId("playground").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const result = calculateJourney({
    dnsCached: byId("dns-cached").checked,
    pathFailure: byId("journey-path-failure").checked,
    transport: form.get("journey-transport"),
    latency: Number(byId("latency").value),
    bandwidth: Number(byId("bandwidth").value),
    loss: Number(byId("loss").value),
    jitter: Number(byId("jitter").value),
    routeRecovery: Number(byId("route-recovery").value),
  });
  byId("result-empty").hidden = true;
  byId("result").hidden = false;
  byId("result-total").textContent = `${result.total.toLocaleString()} ms`;
  byId("result-outcome").textContent = result.outcome;
  byId("breakdown").replaceChildren();
  byId("event-log").replaceChildren();
  addBreakdown("DNS lookup", result.dns);
  addBreakdown("Path recovery", result.pathRecovery);
  addBreakdown("Secure setup", result.transportSetup);
  addBreakdown("HTTP round trip", result.request);
  addBreakdown("800 KB transfer", result.transfer);
  addBreakdown("Illustrative loss penalty", result.lossPenalty);
  addBreakdown("Jitter variation (not added)", result.jitter);
  result.events.forEach(addEvent);
});

function runExperiment(name) {
  const form = byId("playground");
  form.reset();
  if (name === "latency") byId("latency").value = 200;
  if (name === "bandwidth") byId("bandwidth").value = 5;
  if (name === "loss") byId("loss").value = 3;
  if (name === "jitter") byId("jitter").value = 60;
  if (name === "dns") byId("dns-cached").checked = true;
  if (name === "quic") document.querySelector('[name="journey-transport"][value="quic"]').checked = true;
  if (name === "route") byId("journey-path-failure").checked = true;
  requestAnimationFrame(() => form.requestSubmit());
}

byId("playground").addEventListener("reset", () => {
  requestAnimationFrame(() => {
    document.querySelectorAll('.sliders input[type="range"]').forEach(updateRangeOutput);
    byId("result").hidden = true;
    byId("result-empty").hidden = false;
  });
});

if ("IntersectionObserver" in window) {
  const links = new Map([...document.querySelectorAll(".chapter-nav a")].map((link) => [link.hash.slice(1), link]));
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.removeAttribute("aria-current"));
    links.get(visible.target.id)?.setAttribute("aria-current", "true");
  }, { rootMargin: "-25% 0px -60%", threshold: [0, .2, .5] });
  document.querySelectorAll(".lesson[id]").forEach((section) => observer.observe(section));

}
