"use strict";

const byId = (id) => document.getElementById(id);
const motionToggle = byId("motion-toggle");

motionToggle.addEventListener("click", () => {
  const paused = document.body.classList.toggle("motion-paused");
  motionToggle.setAttribute("aria-pressed", String(paused));
  motionToggle.textContent = paused ? "Resume motion" : "Pause motion";
});

function restartAnimation(element, className) {
  element.classList.remove(className);
  requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add(className)));
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  switch (button.dataset.action) {
    case "replay-route": {
      const traveller = document.querySelector(".traveller");
      traveller.style.animation = "none";
      requestAnimationFrame(() => { traveller.style.animation = ""; });
      break;
    }
    case "send-hello": {
      const demo = button.closest(".hello-demo");
      restartAnimation(demo, "running");
      byId("hello-status").textContent = "Hello delivered. The connection carried data from sender to receiver.";
      break;
    }
    case "drop-packet": {
      const dropped = button.getAttribute("aria-pressed") === "true";
      const packet = document.querySelector('[data-packet="3"]');
      button.setAttribute("aria-pressed", String(!dropped));
      button.textContent = dropped ? "Drop #3" : "Resend #3";
      packet.classList.toggle("lost", !dropped);
      byId("packet-status").textContent = dropped
        ? "All seven teaching pieces rebuild NETWORK."
        : "Piece 3 is missing. Reliable delivery detects the gap and sends that piece again.";
      break;
    }
    case "dns-lookup": {
      byId("dns-answer").textContent = "142.250.183.14";
      byId("dns-status").textContent = "An example IPv4 answer appeared. A real answer can change by time and location.";
      button.textContent = "Lookup complete ✓";
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
  byId("connection-status").textContent = `${event.target.value} carries the data to the gateway.`;
});

document.querySelector('[data-choice="transport"]').addEventListener("change", (event) => {
  byId("transport-status").textContent = event.target.value;
});

byId("path-failure").addEventListener("change", (event) => {
  byId("route-choice").classList.toggle("failed", event.target.checked);
  byId("route-status").textContent = event.target.checked
    ? "The primary path failed. After routing converges, traffic uses the available alternate path."
    : "The primary path is available.";
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
}
