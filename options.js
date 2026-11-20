const folderInput = document.getElementById("downloadFolder");
const saveAsInput = document.getElementById("saveAs");
const noticeInput = document.getElementById("showYoutubeNotice");
const statusNode = document.getElementById("status");

function normalizeFolder(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim().replace(/[<>:"|?*\x00-\x1F]/g, "_"))
    .filter((part) => part && part !== "." && part !== "..")
    .join("/")
    .slice(0, 100);
}

chrome.storage.local.get({
  downloadFolder: "MediaHelper",
  saveAs: false,
  showYoutubeNotice: true
}, (settings) => {
  folderInput.value = settings.downloadFolder || "";
  saveAsInput.checked = Boolean(settings.saveAs);
  noticeInput.checked = Boolean(settings.showYoutubeNotice);
});

document.getElementById("saveButton").addEventListener("click", () => {
  const settings = {
    downloadFolder: normalizeFolder(folderInput.value),
    saveAs: saveAsInput.checked,
    showYoutubeNotice: noticeInput.checked
  };

  chrome.storage.local.set(settings, () => {
    if (chrome.runtime.lastError) {
      statusNode.textContent = "שמירת ההגדרות נכשלה: " + chrome.runtime.lastError.message;
      return;
    }
    folderInput.value = settings.downloadFolder;
    statusNode.textContent = "ההגדרות נשמרו בהצלחה.";
  });
});