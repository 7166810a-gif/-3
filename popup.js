const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "mkv", "avi"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "aac", "ogg", "opus", "wav", "flac"]);

const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("mediaUrl");
const typeInput = document.getElementById("mediaType");
const nameInput = document.getElementById("fileName");
const downloadButton = document.getElementById("downloadButton");
const statusNode = document.getElementById("status");
const folderInfo = document.getElementById("folderInfo");

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
}

function normalizeFolder(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim().replace(/[<>:"|?*\x00-\x1F]/g, "_"))
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function getUrlExtension(url) {
  const finalPart = url.pathname.split("/").filter(Boolean).pop() || "";
  const match = finalPart.match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1].toLowerCase() : "";
}

function isYoutubeHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com") ||
    host === "googlevideo.com" ||
    host.endsWith(".googlevideo.com");
}

function safeFileName(value, extension, fallback) {
  const raw = (value || fallback || "media").trim();
  let clean = raw.replace(/[\\/:*?"<>|\x00-\x1F]/g, "_").replace(/\.\./g, "_");
  clean = clean.replace(/[. ]+$/g, "").slice(0, 110);
  if (!clean) clean = "media";
  const existingExtension = clean.match(/\.([a-z0-9]{2,5})$/i);
  if (existingExtension) clean = clean.slice(0, -existingExtension[0].length);
  return clean + "." + extension;
}

async function detectMediaType(url, extension) {
  if (extension) {
    return { type: VIDEO_EXTENSIONS.has(extension) ? "video" : AUDIO_EXTENSIONS.has(extension) ? "audio" : "" };
  }

  try {
    const response = await fetch(url.href, { method: "HEAD", redirect: "follow" });
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType.startsWith("video/")) return { type: "video", extension: "mp4" };
    if (contentType.startsWith("audio/")) return { type: "audio", extension: "mp3" };
    if (contentType === "text/html") throw new Error("הקישור מוביל לעמוד אינטרנט ולא לקובץ מדיה ישיר.");
    if (response.ok && contentType === "application/octet-stream") {
      throw new Error("השרת לא ציין את סוג המדיה. השתמש בקישור שמסתיים בסיומת קובץ מוכרת.");
    }
    throw new Error("לא ניתן לזהות קובץ וידאו או שמע בקישור הזה.");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("לא ניתן לבדוק את הקישור. ודא שזהו קישור ישיר לקובץ מדיה עם סיומת מוכרת.");
    }
    throw error;
  }
}

async function startDownload(event) {
  event.preventDefault();
  setStatus("");

  let url;
  try {
    url = new URL(urlInput.value.trim());
  } catch {
    setStatus("הזן כתובת אינטרנט תקינה.", true);
    return;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    setStatus("אפשר להוריד רק קישורי HTTP או HTTPS.", true);
    return;
  }
  if (isYoutubeHost(url.hostname)) {
    setStatus("הורדה מ־YouTube אינה נתמכת. השתמש באפשרויות הרשמיות של האתר.", true);
    return;
  }

  const extension = getUrlExtension(url);
  const selectedType = typeInput.value;
  if (extension) {
    const allowed = selectedType === "video" ? VIDEO_EXTENSIONS : AUDIO_EXTENSIONS;
    if (!allowed.has(extension)) {
      setStatus("סיומת הקובץ אינה תואמת לסוג המדיה שנבחר.", true);
      return;
    }
  }

  downloadButton.disabled = true;
  downloadButton.textContent = "בודק קישור…";

  try {
    const detected = await detectMediaType(url, extension);
    const actualType = detected.type;
    const finalExtension = extension || detected.extension;
    if (!actualType || actualType !== selectedType) {
      throw new Error("סוג הקובץ בקישור אינו תואם לבחירה שלך.");
    }

    const permissionGranted = await new Promise((resolve) => {
      chrome.permissions.request({ origins: [url.origin + "/*"] }, resolve);
    });
    if (!permissionGranted) {
      throw new Error("נדרשת הרשאת גישה לאתר שממנו מורידים את הקובץ.");
    }

    const settings = await chrome.storage.local.get({ downloadFolder: "MediaHelper", saveAs: false });
    const folder = normalizeFolder(settings.downloadFolder);
    const sourceName = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "media");
    const filename = safeFileName(nameInput.value, finalExtension, sourceName);
    const downloadPath = folder ? folder + "/" + filename : filename;

    downloadButton.textContent = "מתחיל הורדה…";
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url.href,
        filename: downloadPath,
        saveAs: Boolean(settings.saveAs),
        conflictAction: "uniquify"
      }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "ההורדה נכשלה."));
        } else if (typeof id !== "number") {
          reject(new Error("Chrome לא הצליח להתחיל את ההורדה."));
        } else {
          resolve(id);
        }
      });
    });

    setStatus("ההורדה התחילה (מספר " + downloadId + "). אפשר לעקוב אחריה במנהל ההורדות של Chrome.");
  } catch (error) {
    setStatus(error.message || "אירעה שגיאה בהורדה.", true);
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = "הורד קובץ";
  }
}

form.addEventListener("submit", startDownload);

document.getElementById("settingsButton").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById("optionsLink").addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

chrome.storage.local.get({ downloadFolder: "MediaHelper" }, (settings) => {
  const folder = normalizeFolder(settings.downloadFolder);
  folderInfo.textContent = "תיקיית שמירה: Downloads/" + (folder || "(ראשית)");
});