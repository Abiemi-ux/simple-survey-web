const API_BASE = "simple-survey-api-iow2.onrender.com/api";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function textOf(el, tag) {
  const child = el.querySelector(tag);
  return child ? (child.textContent || "").trim() : "";
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

async function apiRequest(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    options.headers = { ...(options.headers || {}), "X-CSRFToken": getCsrfToken() };
  }
  options.credentials = "include";

  const response = await fetch(url, options);
  const raw = await response.text();
  if (!response.ok) {
    const doc = raw ? parseXml(raw) : null;
    const message = doc && doc.querySelector("error") ? doc.querySelector("error").textContent.trim() : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return raw ? parseXml(raw) : null;
}

function showError(bannerEl, message) {
  bannerEl.textContent = message;
  bannerEl.classList.add("visible");
}

function hideError(bannerEl) {
  bannerEl.classList.remove("visible");
  bannerEl.textContent = "";
}