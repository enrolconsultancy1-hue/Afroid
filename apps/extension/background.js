/**
 * AfroID — Startup Intake & Builder Portal service worker (Manifest V3).
 * The popup performs API calls directly; this worker is kept minimal.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("AfroID Intake & Builder Portal installed.");
});
