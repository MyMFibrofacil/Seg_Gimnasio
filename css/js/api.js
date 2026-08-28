import { APP_CONFIG } from "./config.js";

function assertConfigured() {
  if (!APP_CONFIG.apiUrl || APP_CONFIG.apiUrl.includes("PEGAR_AQUI")) {
    throw new Error("Falta configurar la URL del backend de Google Apps Script.");
  }
}

async function request(url, options = {}) {
  assertConfigured();
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "No se pudo completar la operación.");
  }
  return payload;
}

export function getBootstrap() {
  const url = new URL(APP_CONFIG.apiUrl);
  url.searchParams.set("action", "bootstrap");
  return request(url);
}

export function saveEntry(type, data) {
  return request(APP_CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ type, data })
  });
}
