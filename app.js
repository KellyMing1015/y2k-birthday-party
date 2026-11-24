(() => {
  const experience = document.querySelector("#experience");
  const status = document.querySelector("#ritual-status");
  const reset = document.querySelector("[data-reset]");
  const dialog = document.querySelector(".memory-dialog");
  const prefersMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
  const { photos, voice } = window.birthdayContent;
  const params = new URLSearchParams(window.location.search);
  const selected = params.get("theme");
  const themes = window.birthdayThemes;
  if (!Object.hasOwn(themes, selected)) {
    window.mountY2KParty(experience, params);
    return;
  }
  const theme = selected;
  const current = themes[theme];
  const finalStep = current.finalStep ?? 2;
  const framed = params.get("frame") === "1";

  let step = 0;
  let photoIndex = 0;
  let activePhotoButton = null;

  if (framed) document.documentElement.dataset.frame = "";
  document.querySelector(`[data-theme-link="${theme}"]`).setAttribute("aria-current", "page");
  document.title = `${current.title} · 给她的生日`;
  experience.dataset.theme = theme;

  function photoArt(photo) {
    const art = document.createElement("span");
    art.className = "photo-art";

    if (photo.src) {
      const image = document.createElement("img");
      image.src = photo.src;
      image.alt = photo.alt || photo.title;
      image.loading = "lazy";
      art.append(image);
    } else {
      art.classList.add("is-empty");
      art.setAttribute("aria-hidden", "true");
    }
    return art;
  }

  function mountPhotos() {
    const grid = document.createElement("div");
    grid.className = "photo-grid";
    photos.forEach((photo, index) => {
      const card = document.createElement("button");
      const caption = document.createElement("span");
      card.type = "button";
      card.className = "photo-card";
      card.dataset.photo = index;
      card.setAttribute("aria-haspopup", "dialog");
      caption.className = "photo-caption";
      caption.textContent = photo.title;
      card.append(photoArt(photo), caption);
      grid.append(card);
    });
    experience.querySelector("[data-photo-mount]").append(grid);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  }

  function mountVoice() {
    const mount = experience.querySelector("[data-voice-mount]");
    mount.innerHTML = `
      <div class="voice-deck">
        <button type="button" class="voice-toggle" aria-label="播放">▶</button>
        <div class="voice-meta">
          <strong class="voice-heading"></strong>
          <input class="voice-wave" type="range" min="0" max="0" step=".05" value="0" aria-label="语音播放进度" disabled>
          <div class="voice-time"><span data-elapsed>0:00</span><span data-duration>0:00</span></div>
        </div>
        <p class="voice-error" role="status" hidden></p>
        <audio preload="metadata"></audio>
      </div>`;

    const audio = mount.querySelector("audio");
    const button = mount.querySelector(".voice-toggle");
    const progress = mount.querySelector(".voice-wave");
    const elapsed = mount.querySelector("[data-elapsed]");
    const duration = mount.querySelector("[data-duration]");
    const error = mount.querySelector(".voice-error");
    const label = voice.src ? "语音" : "提示音";
    audio.src = voice.src || voice.previewSrc;
    button.setAttribute("aria-label", `播放${label}`);
    progress.setAttribute("aria-label", `${label}播放进度`);
    mount.querySelector(".voice-heading").textContent = voice.src ? voice.title : "试听提示音";

    function updateProgress() {
      elapsed.textContent = formatTime(audio.currentTime);
      duration.textContent = formatTime(audio.duration);
      if (Number.isFinite(audio.duration)) {
        progress.disabled = false;
        progress.max = audio.duration;
        progress.value = audio.currentTime;
        progress.setAttribute("aria-valuetext", `已播放 ${formatTime(audio.currentTime)}，共 ${formatTime(audio.duration)}`);
      }
    }

    function updateButton() {
      button.textContent = audio.paused ? "▶" : "Ⅱ";
      button.setAttribute("aria-label", `${audio.paused ? "播放" : "暂停"}${label}`);
    }

    function showAudioError() {
      error.textContent = "音频暂时无法播放，可以再试一次。";
      error.hidden = false;
    }

    button.addEventListener("click", async () => {
      error.hidden = true;
      if (audio.paused) {
        if (audio.error) audio.load();
        try { await audio.play(); } catch (playError) {
          if (playError.name !== "AbortError") showAudioError();
        }
      } else {
        audio.pause();
      }
    });
    progress.addEventListener("input", () => { audio.currentTime = Number(progress.value); });
    for (const event of ["loadedmetadata", "timeupdate", "durationchange"]) audio.addEventListener(event, updateProgress);
    for (const event of ["play", "pause", "ended"]) audio.addEventListener(event, updateButton);
    audio.addEventListener("error", showAudioError);
  }

  function setStep(nextStep, announce = false) {
    step = nextStep;
    experience.dataset.step = step;
    for (const item of experience.querySelectorAll("[data-stage]")) {
      item.hidden = Number(item.dataset.stage) !== step;
    }
    const memories = experience.querySelector("[data-memories]");
    memories.hidden = step < finalStep;
    if (!memories.hidden && !memories.querySelector(".photo-grid")) {
      mountPhotos();
      mountVoice();
      if (announce) memories.classList.add("is-revealed");
    }
    reset.hidden = step === 0;
    if (announce) status.textContent = current.announcements?.[step] ?? (step === finalStep ? "照片和语音已打开。" : "");
  }

  function render(startingStep = 0) {
    experience.querySelector("audio")?.pause();
    experience.innerHTML = current.render();
    setStep(startingStep);
    current.mount?.(experience);
  }

  function showPhoto(index) {
    photoIndex = (index + photos.length) % photos.length;
    const photo = photos[photoIndex];
    dialog.querySelector("[data-dialog-image]").replaceChildren(photoArt(photo));
    dialog.querySelector("#photo-title").textContent = photo.title;
    dialog.querySelector("[data-dialog-caption]").textContent = photo.caption;
    dialog.querySelector("[data-dialog-count]").textContent = `${photoIndex + 1} / ${photos.length}`;
    if (!dialog.open) {
      dialog.showModal();
      dialog.querySelector("[data-dialog-close]").focus();
    }
  }

  function advanceRitual() {
    setStep(step + 1, true);
    const stage = `[data-stage="${step}"]`;
    const nextAction = experience.querySelector(`${stage} [data-ritual], ${stage}[data-ritual], ${stage} a[href^="#"], a${stage}[href^="#"]`);
    const destination = nextAction || experience.querySelector("[data-memories]");
    if (destination && !destination.hidden) destination.focus({ preventScroll: true });
  }

  function resetRitual() {
    render();
    window.scrollTo(0, 0);
    experience.querySelector("[data-ritual='advance']")?.focus({ preventScroll: true });
    status.textContent = "仪式已重置。";
  }

  experience.addEventListener("click", event => {
    if (event.target.closest("[data-ritual='reset']")) {
      resetRitual();
      return;
    }
    const advance = event.target.closest("[data-ritual='advance']");
    if (advance && step < finalStep) {
      advanceRitual();
      return;
    }

    const card = event.target.closest("[data-photo]");
    if (card) {
      activePhotoButton = card;
      showPhoto(Number(card.dataset.photo));
      return;
    }

    const link = event.target.closest('a[href^="#"]');
    const destination = link && document.getElementById(link.hash.slice(1));
    if (destination) {
      event.preventDefault();
      destination.focus({ preventScroll: true });
      destination.scrollIntoView({ behavior: prefersMotion.matches ? "smooth" : "instant" });
    }
  });

  dialog.addEventListener("click", event => {
    if (event.target === dialog || event.target.closest("[data-dialog-close]")) dialog.close();
    const direction = event.target.closest("[data-photo-shift]");
    if (direction) showPhoto(photoIndex + Number(direction.dataset.photoShift));
  });
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") showPhoto(photoIndex - 1);
    if (event.key === "ArrowRight") showPhoto(photoIndex + 1);
  });
  dialog.addEventListener("close", () => activePhotoButton?.focus());
  reset.addEventListener("click", resetRitual);
  const previewStates = new Map([["ready", 1], ["done", finalStep]]);
  render(previewStates.get(params.get("state")) ?? 0);
})();
