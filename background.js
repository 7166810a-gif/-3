const DEFAULT_SETTINGS = {
  downloadFolder: "MediaHelper",
  saveAs: false,
  showYoutubeNotice: true
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") return;

  chrome.storage.local.set(DEFAULT_SETTINGS, () => {
    if (chrome.runtime.lastError) {
      console.error("Media Helper settings could not be initialized:", chrome.runtime.lastError.message);
    }
  });
});