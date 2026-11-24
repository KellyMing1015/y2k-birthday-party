(() => {
  const devices = [
    { skin: "horn", label: "铜喇叭留声机" },
    { skin: "suitcase", label: "薄荷绿唱片机" },
    { skin: "petal", label: "粉色唱片机" },
  ];

  // Forty normalized amplitude bands for each recording, measured locally.
  const recordedWaves = {
    "assets/party-voices/ou.m4a": [10, 7, 10, 4, 10, 7, 7, 6, 5, 4, 4, 10, 2, 10, 7, 5, 4, 7, 9, 5, 6, 5, 5, 3, 2, 6, 4, 5, 5, 6, 5, 4, 6, 6, 4, 5, 6, 4, 4, 3],
    "assets/party-voices/ting.m4a": [8, 8, 6, 9, 9, 7, 5, 10, 5, 9, 9, 4, 7, 9, 7, 7, 6, 9, 6, 8, 10, 9, 8, 5, 9, 7, 9, 4, 9, 9, 8, 7, 6, 10, 9, 9, 10, 7, 9, 6],
    "assets/party-voices/min-clean.m4a": [4, 10, 9, 9, 8, 9, 8, 7, 7, 6, 7, 7, 6, 5, 7, 5, 10, 9, 10, 10, 8, 6, 7, 7, 6, 6, 9, 7, 6, 7, 7, 10, 10, 10, 10, 7, 8, 8, 5, 4],
  };
  const idleWave = [2, 3, 5, 8, 7, 4, 3, 5, 8, 9, 5, 6, 4, 8, 7, 9, 6, 4, 5, 8, 10, 6, 4, 3, 8, 9, 7, 4, 6, 9, 6, 5, 3, 4, 7, 6, 4, 5, 3, 2];

  function mount(scene, { voices, onNext, onPlayback }) {
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    scene.innerHTML = `
      <div class="jukebox">
        <header class="jukebox-header">
          <h2 data-scene-heading tabindex="-1">生日点歌机</h2>
        </header>
        <div class="jukebox-devices"></div>
        <div class="jukebox-waveform" data-player-state="idle" role="progressbar" aria-label="播放进度" aria-valuenow="0">
          <div class="jukebox-wavebars" aria-hidden="true">
            ${idleWave.map((level, index) => `<i style="--wave-level: ${level / 10}; --wave-index: ${index}"></i>`).join("")}
          </div>
        </div>
        <div class="jukebox-footer">
          <button class="jukebox-next" type="button">去许愿</button>
        </div>
        <p class="visually-hidden jukebox-announcement" aria-live="polite"></p>
      </div>`;

    const list = scene.querySelector(".jukebox-devices");
    const announcement = scene.querySelector(".jukebox-announcement");
    const waveform = scene.querySelector(".jukebox-waveform");
    const bars = waveform.querySelectorAll(".jukebox-wavebars i");
    let active = null;
    let revision = 0;
    let playing = false;
    let disposed = false;

    function notePlaying(next) {
      if (next === playing) return;
      playing = next;
      onPlayback?.(playing);
    }

    function update(track, state) {
      track.state = state;
      const { button, display, label } = track;
      display.dataset.playerState = state;
      const action = {
        idle: "播放",
        loading: "暂停",
        playing: "暂停",
        paused: "继续播放",
        ended: "重播",
        error: "重试播放",
        empty: "音频待添加"
      }[state];
      button.setAttribute("aria-label", `${action}${label}`);
      if (active === track) waveform.dataset.playerState = state;
    }

    function updateProgress(track, fromStart = false) {
      const { audio, display } = track;
      const seconds = fromStart ? 0 : audio.currentTime;
      const progress = Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.min(1, seconds / audio.duration)
        : 0;
      display.style.setProperty("--track-progress", progress);
      if (active !== track) return;
      waveform.style.setProperty("--wave-progress", `${progress * 100}%`);
      waveform.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    }

    function fail(track) {
      update(track, "error");
      announcement.textContent = `${track.label}播放失败，可以重试。`;
      notePlaying(false);
    }

    async function play(track, fromStart = false) {
      if (!track.audio || disposed) return;
      const { audio } = track;
      const request = ++revision;
      if (active && active !== track) {
        const previous = active;
        previous.audio.pause();
        previous.restart.hidden = true;
        delete previous.display.dataset.current;
        if (previous.state === "playing" || previous.state === "loading") update(previous, "paused");
      }
      if (active !== track) {
        bars.forEach((bar, index) => bar.style.setProperty("--wave-level", track.wave[index] / 10));
      }
      active = track;
      track.restart.hidden = false;
      track.display.dataset.current = "";
      update(track, "loading");
      try {
        if (audio.error) audio.load();
        if (fromStart && audio.currentTime > 0) audio.currentTime = 0;
        updateProgress(track, fromStart);
        await audio.play();
        if (request !== revision || disposed) return;
        if (audio.paused) {
          update(track, "paused");
          notePlaying(false);
          return;
        }
        update(track, "playing");
        announcement.textContent = `${track.label}正在播放。`;
        notePlaying(true);
      } catch {
        if (request === revision && !disposed) fail(track);
      }
    }

    function toggle(track) {
      if (active === track && ["playing", "loading"].includes(track.state)) {
        revision += 1;
        track.audio.pause();
        update(track, "paused");
        notePlaying(false);
      } else {
        play(track, track.state === "ended");
      }
    }

    const tracks = voices.slice(0, devices.length).map((voice, index) => {
      const device = devices[index];
      const source = voice.playbackSrc || voice.src || voice.demoSrc;
      const display = document.createElement("div");
      display.className = "jukebox-device";
      display.dataset.device = device.skin;
      display.innerHTML = `
        <button class="jukebox-prop jukebox-play" type="button">
          <i class="jukebox-art" aria-hidden="true"></i><i class="jukebox-arm" aria-hidden="true"><i></i></i>
        </button>
        <button class="jukebox-restart" type="button" aria-label="从头播放${device.label}" hidden></button>`;
      const button = display.querySelector(".jukebox-play");
      const restart = display.querySelector(".jukebox-restart");
      list.append(display);

      const track = {
        audio: source ? new Audio() : null,
        button,
        restart,
        display,
        label: device.label,
        wave: Object.hasOwn(recordedWaves, voice.src) ? recordedWaves[voice.src] : idleWave
      };
      update(track, source ? "idle" : "empty");
      if (!source) {
        button.disabled = true;
        return track;
      }

      const { audio } = track;
      audio.preload = "none";
      audio.src = source;
      button.addEventListener("click", () => toggle(track), options);
      restart.addEventListener("click", () => play(track, true), options);
      for (const event of ["loadedmetadata", "timeupdate", "seeked"]) {
        audio.addEventListener(event, () => updateProgress(track), options);
      }
      audio.addEventListener("pause", () => {
        if (active === track && audio.paused && !audio.ended && ["playing", "loading"].includes(track.state)) {
          revision += 1;
          update(track, "paused");
          notePlaying(false);
        }
      }, options);
      audio.addEventListener("ended", () => {
        if (active === track) {
          updateProgress(track);
          update(track, "ended");
          notePlaying(false);
        }
      }, options);
      audio.addEventListener("error", () => {
        if (active === track && track.state === "playing") fail(track);
      }, options);
      return track;
    });

    scene.querySelector(".jukebox-next").addEventListener("click", onNext, options);

    return () => {
      disposed = true;
      listeners.abort();
      for (const track of tracks) track.audio?.pause();
      notePlaying(false);
    };
  }

  window.partyJukebox = { mount };
})();
