"use strict";

const byId = (id) => document.getElementById(id);
const motionToggle = byId("motion-toggle");
const activeAnimations = new Set();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

motionToggle.addEventListener("click", () => {
  const paused = document.body.classList.toggle("motion-paused");
  activeAnimations.forEach((animation) => paused ? animation.pause() : animation.play());
  motionToggle.setAttribute("aria-pressed", String(paused));
  motionToggle.textContent = paused ? "Resume motion" : "Pause motion";
});

function restartAnimation(element, className) {
  element.classList.remove(className);
  requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add(className)));
}

function play(element, keyframes, options) {
  element.getAnimations().forEach((animation) => animation.cancel());
  const animation = element.animate(keyframes, {
    duration: reducedMotion.matches ? 1 : 900,
    easing: "ease-in-out",
    fill: "forwards",
    ...options,
  });
  activeAnimations.add(animation);
  if (document.body.classList.contains("motion-paused")) animation.pause();
  animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
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

function playOverview() {
  const track = document.querySelector(".route-line");
  const request = track.querySelector(".request-token");
  const response = track.querySelector(".response-token");
  const distance = Math.max(0, track.clientWidth - request.offsetWidth / 2);
  play(request, [
    { opacity: 0, transform: "translate3d(-50%, -50%, 0)" },
    { opacity: 1, offset: .12 },
    { opacity: 1, offset: .88, transform: `translate3d(${distance}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${distance}px, -50%, 0)` },
  ], { duration: reducedMotion.matches ? 1 : 1500 });
  play(response, [
    { opacity: 0, transform: `translate3d(${distance}px, -50%, 0)` },
    { opacity: 1, offset: .12 },
    { opacity: 1, offset: .88, transform: "translate3d(-50%, -50%, 0)" },
    { opacity: 0, transform: "translate3d(-50%, -50%, 0)" },
  ], { duration: reducedMotion.matches ? 1 : 1500, delay: reducedMotion.matches ? 0 : 1650 });
}

function sendHello() {
  const route = document.querySelector(".hello-demo .mini-route");
  const nodes = route.querySelectorAll("b");
  const message = route.querySelector(".message");
  byId("hello-status").textContent = "Sending hello from the phone to the laptop…";
  const animation = play(message, horizontalFrames(message, route, nodes[0], nodes[1]), { duration: reducedMotion.matches ? 1 : 1200 });
  animation.finished.then(() => {
    byId("hello-status").textContent = "Hello delivered. The connection carried data from sender to receiver.";
  }).catch(() => {});
}

function sendLocal() {
  const route = document.querySelector(".local-route");
  const nodes = route.querySelectorAll("b");
  const packet = route.querySelector(".local-packet");
  const containerRect = route.getBoundingClientRect();
  const width = packet.getBoundingClientRect().width;
  const positions = [...nodes].map((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left + rect.width / 2 - containerRect.left - width / 2;
  });
  play(packet, [
    { opacity: 0, transform: `translate3d(${positions[0]}px, -50%, 0)` },
    { opacity: 1, offset: .08 },
    { opacity: 1, offset: .48, transform: `translate3d(${positions[1]}px, -50%, 0)` },
    { opacity: .55, offset: .54, transform: `translate3d(${positions[1]}px, -50%, 0)` },
    { opacity: 1, offset: .9, transform: `translate3d(${positions[2]}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${positions[2]}px, -50%, 0)` },
  ], { duration: reducedMotion.matches ? 1 : 1800 });
  byId("connection-status").textContent = `${document.querySelector('[name="connection"]:checked').value} carries the data to the gateway, which forwards it toward the internet.`;
}

function playAcross(token, { reverse = false, drop = false, delay = 0, duration = 850 } = {}) {
  const wire = token.parentElement;
  const distance = Math.max(0, wire.clientWidth - token.offsetWidth);
  const start = reverse ? distance : 0;
  const end = reverse ? 0 : distance;
  const finalX = drop ? start + (end - start) * .55 : end;
  const frames = [
    { opacity: 0, transform: `translate3d(${start}px, -50%, 0)` },
    { opacity: 1, offset: .12, transform: `translate3d(${start}px, -50%, 0)` },
    { opacity: 1, offset: drop ? .62 : .88, transform: `translate3d(${finalX}px, -50%, 0)` },
    { opacity: 0, transform: `translate3d(${finalX}px, ${drop ? "20%" : "-50%"}, 0)` },
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
    await playAcross(document.querySelector('[data-flight="3"]'), { duration: 900 }).finished.catch(() => {});
    receivedPiece.classList.remove("lost");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Drop #3";
    byId("packet-status").textContent = "Piece 3 arrived. The receiver can rebuild NETWORK in order.";
  } else {
    byId("packet-status").textContent = "Seven numbered packets leave the sender; watch piece 3 on the wire.";
    const animations = [...document.querySelectorAll("[data-flight]")].map((token, index) =>
      playAcross(token, { drop: index === 2, delay: index * 90 })
    );
    await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    receivedPiece.classList.add("lost");
    button.setAttribute("aria-pressed", "true");
    button.textContent = "Resend #3";
    byId("packet-status").textContent = "Pieces 1, 2, 4, 5, 6, and 7 arrived. The gap identifies piece 3 for retransmission.";
  }
  button.disabled = false;
}

async function runDnsLookup(button) {
  button.disabled = true;
  byId("dns-answer").textContent = "?";
  byId("dns-status").textContent = "The browser sends a DNS query to its resolver.";
  await playAcross(document.querySelector(".dns-query"), { duration: 750 }).finished.catch(() => {});
  byId("dns-status").textContent = "The resolver sends its answer back to the browser.";
  await playAcross(document.querySelector(".dns-response"), { reverse: true, duration: 750 }).finished.catch(() => {});
  byId("dns-answer").textContent = "142.250.183.14";
  byId("dns-status").textContent = "The response contains an example IPv4 address. A real answer can vary.";
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
    case "send-hello": {
      sendHello();
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
    case "dns-lookup": {
      runDnsLookup(button);
      break;
    }
    case "previous-step":
      showStep(stepIndex - 1);
      break;
    case "next-step":
      showStep(stepIndex + 1);
      break;
  }
});

document.querySelector('[data-choice="connection"]').addEventListener("change", (event) => {
  byId("connection-status").textContent = `${event.target.value} selected. Send data to replay the local journey.`;
  sendLocal();
});

const transportStories = {
  tcp: {
    title: "TCP and TLS set up in sequence",
    summary: "Application data waits while the transport and encryption are prepared.",
    lanes: [
      ["TCP · SYN", "SYN →", "forward", 0],
      ["TCP · SYN-ACK", "← SYN-ACK", "reverse", 700],
      ["TLS · ClientHello", "HELLO →", "forward", 1400],
      ["TLS · Server flight", "← TLS", "reverse", 2100],
      ["HTTP · Request", "GET →", "forward", 2800],
    ],
    events: [
      ["Connect", "TCP establishes the connection."],
      ["Secure", "TLS negotiates encryption."],
      ["Request", "The browser can now send HTTP data."],
    ],
  },
  quic: {
    title: "QUIC prepares secure transport together",
    summary: "HTTP/3 can then carry independent streams without one lost stream holding up the others.",
    lanes: [
      ["QUIC · Initial + TLS", "INITIAL →", "forward", 0],
      ["QUIC · Handshake", "← SECURE", "reverse", 700],
      ["HTTP/3 · Request", "GET →", "forward", 1400],
      ["Stream A · HTML", "← HTML", "reverse", 2100],
      ["Stream B · Image", "← IMG", "reverse", 2200],
    ],
    events: [
      ["Connect + secure", "QUIC includes TLS in its transport handshake."],
      ["Send streams", "HTTP/3 resources use independent QUIC streams."],
      ["Isolate loss", "A delayed image stream need not stop the HTML stream."],
    ],
  },
};

function showTransport(mode) {
  const story = transportStories[mode];
  const output = byId("transport-output");
  output.dataset.mode = mode;
  byId("transport-result-title").textContent = story.title;
  byId("transport-summary").textContent = story.summary;
  byId("transport-lanes").innerHTML = story.lanes
    .map(([label, token, direction, delay]) => `<div class="transport-lane"><span>${label}</span><i data-direction="${direction}" data-delay="${delay}">${token}</i></div>`)
    .join("");
  byId("transport-events").innerHTML = story.events
    .map(([title, copy], index) => `<li><b>${index + 1}</b><span><strong>${title}</strong>${copy}</span></li>`)
    .join("");
  output.querySelectorAll(".transport-lane i").forEach((token) => {
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

byId("path-failure").addEventListener("change", (event) => {
  const route = byId("route-choice");
  route.classList.toggle("failed", event.target.checked);
  restartAnimation(route, "playing");
  byId("route-status").textContent = event.target.checked
    ? "The route through Router A failed. After convergence, the packet uses Router B."
    : "The packet is using the primary route through Router A.";
});

const pageSteps = [
  ["Enter the address", "The browser receives the site name you want to open."],
  ["Find an IP address", "DNS supplies an address unless a usable answer is already cached."],
  ["Create a secure connection", "TCP with TLS or QUIC prepares encrypted transport."],
  ["Send the HTTP request", "The browser asks the server for the page document."],
  ["Receive page resources", "The server returns data; the page may request more files."],
  ["Render the page", "The browser turns the received HTML, CSS, and JavaScript into the visible page."],
];
let stepIndex = 0;

function showStep(nextIndex) {
  stepIndex = Math.max(0, Math.min(pageSteps.length - 1, nextIndex));
  byId("step-count").textContent = `Step ${stepIndex + 1} of ${pageSteps.length}`;
  byId("step-title").textContent = pageSteps[stepIndex][0];
  byId("step-copy").textContent = pageSteps[stepIndex][1];
  document.querySelector('[data-action="previous-step"]').disabled = stepIndex === 0;
  const next = document.querySelector('[data-action="next-step"]');
  next.disabled = stepIndex === pageSteps.length - 1;
  next.textContent = stepIndex === pageSteps.length - 1 ? "Complete ✓" : "Next →";
}

for (const input of document.querySelectorAll('.sliders input[type="range"]')) {
  input.addEventListener("input", () => {
    const suffix = input.id === "latency" ? " ms" : input.id === "bandwidth" ? " Mbps" : "%";
    byId(`${input.id}-output`).textContent = `${input.value}${suffix}`;
  });
}

const payloadMegabits = 6.4;

function calculateJourney(inputs) {
  const { dnsCached, pathFailure, transport, latency, bandwidth, loss } = inputs;
  const dns = dnsCached ? 0 : latency;
  const pathRecovery = pathFailure ? Math.max(300, latency * 2) : 0;
  const transportSetup = transport === "tcp" ? latency * 2 : latency;
  const request = latency;
  const transfer = Math.ceil((payloadMegabits / bandwidth) * 1000);
  const lossRate = loss / 100;
  const lossRecovery = loss === 0 ? 0 : Math.ceil(transfer * (lossRate / (1 - lossRate)) + latency);
  const total = dns + pathRecovery + transportSetup + request + transfer + lossRecovery;
  let elapsed = 0;
  const events = [[elapsed, "Request started", "The browser needs an address before it can contact the site."]];

  if (dnsCached) {
    events.push([elapsed, "Saved address used", "No DNS query is modeled."]);
  } else {
    events.push([elapsed, "Address lookup sent", "The device asks its configured DNS resolver."]);
    elapsed += dns;
    events.push([elapsed, "Address received", "The model counts one resolver round trip."]);
  }

  if (pathFailure) {
    events.push([elapsed, "Path failure detected", "The first modeled path cannot carry the connection."]);
    elapsed += pathRecovery;
    events.push([elapsed, "Alternate path selected", "The model assumes another working path."]);
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

  if (lossRecovery > 0) {
    events.push([elapsed, "Missing data detected", "Reliable transport must recover lost data."]);
    elapsed += lossRecovery;
    events.push([elapsed, "Lost data recovered", "Missing reliable data is retransmitted."]);
  }
  events.push([elapsed, "Request complete", "The modeled response is available to the browser."]);

  const outcome = pathFailure
    ? loss > 0 ? "Completed on an alternate path after loss recovery" : "Completed on an alternate path"
    : loss > 0 ? "Completed after loss recovery" : "Completed on the available path";
  return { total, dns, pathRecovery, transportSetup, request, transfer, lossRecovery, outcome, events };
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
  addBreakdown("Loss recovery", result.lossRecovery);
  result.events.forEach(addEvent);
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

  const motionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (entry.target.classList.contains("route-card")) playOverview();
      if (entry.target.id === "route-choice") restartAnimation(entry.target, "playing");
      if (entry.target.id === "transport-output") showTransport(document.querySelector('[name="transport-demo"]:checked').value);
      motionObserver.unobserve(entry.target);
    }
  }, { threshold: .35 });
  [document.querySelector(".route-card"), byId("route-choice"), byId("transport-output")].forEach((element) => motionObserver.observe(element));
} else {
  playOverview();
  restartAnimation(byId("route-choice"), "playing");
  showTransport("tcp");
}
