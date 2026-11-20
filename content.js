(function () {
  const HOST_ID = "media-helper-youtube-notice";
  let lastVideoId = "";

  function getVideoId() {
    if (location.pathname !== "/watch") return "";
    return new URLSearchParams(location.search).get("v") || "";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.documentElement.appendChild(field);
      field.select();

      try {
        const copied = document.execCommand("copy");
        field.remove();
        copied ? resolve() : reject(new Error("ההעתקה נכשלה"));
      } catch (error) {
        field.remove();
        reject(error);
      }
    });
  }

  function showNotice() {
    const videoId = getVideoId();
    if (!videoId || videoId === lastVideoId) return;

    lastVideoId = videoId;
    const dismissedKey = "media-helper-dismissed-" + videoId;
    if (sessionStorage.getItem(dismissedKey)) return;

    chrome.storage.local.get({ showYoutubeNotice: true }, (settings) => {
      if (chrome.runtime.lastError || !settings.showYoutubeNotice) return;
      if (document.getElementById(HOST_ID)) return;

      const host = document.createElement("div");
      host.id = HOST_ID;
      host.style.cssText = "all:initial;position:fixed;z-index:2147483647;inset:auto 20px 20px auto;";
      const shadow = host.attachShadow({ mode: "closed" });

      const style = document.createElement("style");
      style.textContent = `
        * { box-sizing: border-box; }
        .panel {
          width: min(370px, calc(100vw - 32px));
          direction: rtl;
          color: #172033;
          background: #fff;
          border: 1px solid #dce2ea;
          border-radius: 14px;
          box-shadow: 0 12px 38px rgba(0,0,0,.22);
          padding: 17px;
          font: 14px/1.55 Arial, sans-serif;
        }
        .heading { font-size: 16px; font-weight: 700; margin: 0 0 7px; }
        .message { margin: 0 0 13px; color: #455064; }
        .actions { display: flex; gap: 8px; }
        button {
          border: 0; border-radius: 9px; padding: 9px 12px;
          font: inherit; cursor: pointer;
        }
        .primary { background: #1d4ed8; color: white; }
        .secondary { background: #edf1f6; color: #172033; }
        button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
        .status { min-height: 20px; margin: 8px 0 0; color: #166534; }
      `;

      const panel = document.createElement("section");
      panel.className = "panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "הודעה על הורדות YouTube");

      const heading = document.createElement("h2");
      heading.className = "heading";
      heading.textContent = "רוצה לשמור את הסרטון?";
      const message = document.createElement("p");
      message.className = "message";
      message.textContent =
        "התוסף אינו מוריד זרמי וידאו או שמע מ־YouTube ואינו עוקף את מגבלות האתר. הורדה אפשרית רק דרך האפשרות הרשמית של YouTube, כאשר היא זמינה. אפשר להעתיק את הקישור או לסגור את ההודעה.";

      const actions = document.createElement("div");
      actions.className = "actions";
      const copyButton = document.createElement("button");
      copyButton.className = "primary";
      copyButton.type = "button";
      copyButton.textContent = "העתק קישור";
      const closeButton = document.createElement("button");
      closeButton.className = "secondary";
      closeButton.type = "button";
      closeButton.textContent = "סגור";
      const status = document.createElement("p");
      status.className = "status";
      status.setAttribute("aria-live", "polite");

      copyButton.addEventListener("click", async () => {
        try {
          await copyText(location.href);
          status.textContent = "הקישור הועתק.";
        } catch {
          status.textContent = "לא ניתן להעתיק את הקישור בדפדפן זה.";
        }
      });

      closeButton.addEventListener("click", () => {
        sessionStorage.setItem(dismissedKey, "1");
        host.remove();
      });

      actions.append(copyButton, closeButton);
      panel.append(heading, message, actions, status);
      shadow.append(style, panel);
      document.documentElement.appendChild(host);
    });
  }

  function handleNavigation() {
    const nextId = getVideoId();
    if (!nextId) {
      lastVideoId = "";
      const existing = document.getElementById(HOST_ID);
      if (existing) existing.remove();
      return;
    }
    window.setTimeout(showNotice, 300);
  }

  window.addEventListener("yt-navigate-finish", handleNavigation);
  window.addEventListener("popstate", handleNavigation);
  window.setTimeout(showNotice, 700);
})();