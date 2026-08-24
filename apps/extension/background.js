/**
 * geezcodE ፩</> Chrome Extension Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu item: Send selection to geezcodE IDE
  chrome.contextMenus.create({
    id: "geezcode-send-to-ide",
    title: "⚡ Send '%s' to geezcodE IDE",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "geezcode-autofill-page",
    title: "🪄 Autofill African Grant Application",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "geezcode-send-to-ide" && info.selectionText) {
    // Open IDE with encoded concept
    const encodedPrompt = encodeURIComponent(info.selectionText);
    chrome.tabs.create({
      url: `http://localhost:3000/dashboard/ide?prompt=${encodedPrompt}`,
    });
  } else if (info.menuItemId === "geezcode-autofill-page" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "AUTOFILL_GRANT_FORM" });
  }
});
