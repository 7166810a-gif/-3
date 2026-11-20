(function () {
  "use strict";

  const HOST_ID = "media-helper-youtube-notice";
  const STUDIO_URL = "https://studio.youtube.com/channel/content";
  const TAKEOUT_URL = "https://takeout.google.com/";
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

  function makeButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function makeLink(label, href, className) {
    const link = document.createElement("a");
    link.textContent = label;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = className;
    return link;
  }

  function showNotice() {
    const videoId = getVideoId();
    if (!videoId || videoId === lastVideoId) return;

    lastVideoId = videoId;
    const dismissedKey = "media-helper-dismissed-" + videoId;
    try {
      if (sessionStorage.getItem(dismissedKey)) return;
    } catch {}

    chrome.storage.local.get({ showYoutubeNotice: true }, (settings) => {
      if (chrome.runtime.lastError || !settings.showYoutubeNotice) return;
      const previous = document.getElementById(HOST_ID);
      if (previous) previous.remove();

      const host = document.createElement("div");
      host.id = HOST_ID;
      host.style.cssText = "all:initial;position:fixed;z-index:2147483647;inset:auto 20px 20px auto;";
      const shadow = host.attachShadow({ mode: "closed" });

      const style = document.createElement("style");
      style.textContent = [
        "* { box-sizing: border-box; }",
        ".panel { width:min(390px,calc(100vw - 32px)); direction:rtl; color:#172033; background:#fff; border:1px solid #dce2ea; border-radius:16px; box-shadow:0 14px 44px rgba(0,0,0,.24); padding:18px; font:14px/1.55 Arial,sans-serif; }",
        ".top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }",
        ".heading { font-size:17px; font-weight:700; margin:0 0 6px; }",
        ".subheading { margin:0 0 13px; color:#455064; }",
        ".close { border:0; background:transparent; color:#64748b; padding:2px 6px; font-size:21px; line-height:1; cursor:pointer; }",
        ".primary,.secondary,.tertiary { display:flex; align-items:center; justify-content:center; width:100%; border-radius:10px; padding:10px 12px; font:700 13px Arial,sans-serif; text-decoration:none; cursor:pointer; margin-top:8px; border:1px solid transparent; }",
        ".primary { background:#1d4ed8; color:white; }",
        ".secondary { background:#edf3ff; border-color:#d7e4ff; color:#1d4ed8; }",
        ".tertiary { background:#f5f6f8; border-color:#e4e7ec; color:#273449; }",
        "button:focus-visible,a:focus-visible { outline:3px solid #93c5fd; outline-offset:2px; }",
        ".hint { margin:12px 0 0; padding:10px; border-radius:9px; background:#f7f8fa; color:#596579; font-size:11px; line-height:1.55; }",
        ".privacy { margin:9px 0 0; color:#667085; font-size:10px; }",
        ".status { min-height:18px; margin:7px 0 0; color:#166534; font-size:12px; }"
      ].join("\n");

      const panel = document.createElement("section");
      panel.className = "panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "false");
      panel.setAttribute("aria-label", "האם ברצונך לשמור את הסרטון?");

      const top = document.createElement("div");
      top.className = "top";
      const titleWrap = document.createElement("div");
      const heading = document.createElement("h2");
      heading.className = "heading";
      heading.textContent = "רוצה לשמור את הסרטון?";
      const subheading = document.createElement("p");
      subheading.className = "subheading";
      subheading.textContent = "בחר פעולה להמשך:";
      titleWrap.append(heading, subheading);

      const closeButton = makeButton("×", "close", () => {
        try { sessionStorage.setItem(dismissedKey, "1"); } catch {}
        host.remove();
      });
      closeButton.setAttribute("aria-label", "סגור הודעה");
      top.append(titleWrap, closeButton);

      const studioLink = makeLink("הסרטון שלי – הורדה דרך YouTube Studio", STUDIO_URL, "primary");
      const takeoutLink = makeLink("ייצוא כל הסרטונים שהעליתי – Google Takeout", TAKEOUT_URL, "secondary");

      const status = document.createElement("p");
      status.className = "status";
      status.setAttribute("aria-live", "polite");

      const copyButton = makeButton("העתק קישור לסרטון", "tertiary", async () => {
        try {
          await copyText(location.href);
          status.textContent = "הקישור הועתק.";
        } catch {
          status.textContent = "לא ניתן להעתיק את הקישור בדפדפן זה.";
        }
      });

      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "לסרטונים שהעלית לחשבון שלך אפשר להוריד MP4 דרך Studio ללא Premium (בדרך כלל 720p או 360p, לפי הסרטון). YouTube אינה מספקת דרך רשמית להוריד סרטונים של משתמשים אחרים דרך התוסף, או לבחור ממנו שמע בלבד ואיכות.";

      const privacy = document.createElement("p");
      privacy.className = "privacy";
      privacy.textContent = "פרטיות: התוסף אינו קורא, שומר או שולח עוגיות התחברות, סיסמאות או פרטי חשבון לשרת כלשהו.";

      panel.append(top, studioLink, takeoutLink, copyButton, status, hint, privacy);
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