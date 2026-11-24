(() => {
  const sceneNames = {
    ticket: "派对入场券",
    cake: "点亮第一根蜡烛",
    balloons: "照片戳戳乐",
    scratch: "祝福刮刮乐",
    jukebox: "生日点歌机",
    finale: "写下生日愿望",
    done: "生日快乐"
  };

  function cakePhoto() {
    return `
      <div class="party-visual">
        <figure class="party-photo">
          <img src="assets/party.webp" width="1120" height="1120" alt="插着红蜡烛的粉色爱心蛋糕，上面点缀着樱桃">
          <span class="party-flame" aria-hidden="true"></span>
          <span class="party-smoke" aria-hidden="true"></span>
        </figure>
        <span class="party-sparkle" aria-hidden="true"></span>
      </div>`;
  }

  function mountCake(scene, { playSound, onNext, isLit, recipient }) {
    scene.innerHTML = `
      <div class="party-hero${isLit ? " is-candle-lit" : ""}">
        <div class="party-copy">
          <h1 class="party-title" aria-label="生日快乐"><span aria-hidden="true">BIRTH</span><span aria-hidden="true">DAY!</span></h1>
          <div class="party-actions">
            <p data-party-greeting></p>
            <button class="party-button" type="button" data-light ${isLit ? "hidden" : ""}>点亮蜡烛</button>
            <div class="party-candle-hold" role="status" ${isLit ? "" : "hidden"}>蜡烛亮了。</div>
          </div>
        </div>
        ${cakePhoto()}
      </div>`;
    scene.querySelector("[data-party-greeting]").textContent = recipient ? `${recipient}，派对开始了。` : "派对开始了。";
    const hero = scene.querySelector(".party-hero");
    const candleButton = scene.querySelector("[data-light]");
    const hold = scene.querySelector(".party-candle-hold");
    let timer;
    candleButton.addEventListener("click", () => {
      if (timer !== undefined) return;
      playSound("candle");
      hero.classList.add("is-candle-lit");
      candleButton.hidden = true;
      hold.hidden = false;
      timer = window.setTimeout(onNext, 2000);
    });
    return () => window.clearTimeout(timer);
  }

  function mountTable(scene, wishes, onNext) {
    scene.innerHTML = `
      <div class="party-table-room">
        <header class="party-table-head"><h1 class="party-stage-title">祝福刮刮乐</h1></header>
        <div class="party-table"><div data-scratch-mount></div></div>
        <div class="party-stage-next"><button class="party-button" type="button">去点歌机</button></div>
      </div>`;
    window.mountBirthdayScratch(scene.querySelector("[data-scratch-mount]"), wishes);
    scene.querySelector(".party-stage-next button").addEventListener("click", onNext);
  }

  function createSounds(activateAudio) {
    return function playSound(kind) {
      try {
        const audio = activateAudio();
        if (!audio) return;
        const now = audio.currentTime;
        if (kind === "pop" || kind === "tear") {
          const duration = kind === "pop" ? .19 : .32;
          const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
          const wave = buffer.getChannelData(0);
          for (let i = 0; i < wave.length; i += 1) {
            wave[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / wave.length, kind === "pop" ? 6 : 2);
          }
          const source = audio.createBufferSource();
          const volume = audio.createGain();
          source.buffer = buffer;
          volume.gain.value = kind === "pop" ? .28 : .15;
          source.connect(volume).connect(audio.destination);
          source.start(now);
          return;
        }

        const notes = kind === "candle" ? [659.25, 987.77] : kind === "envelope" ? [493.88, 659.25] : [392, 523.25, 659.25];
        notes.forEach((frequency, index) => {
          const start = now + index * .078;
          const oscillator = audio.createOscillator();
          const volume = audio.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          volume.gain.setValueAtTime(.0001, start);
          volume.gain.exponentialRampToValueAtTime(.105, start + .022);
          volume.gain.exponentialRampToValueAtTime(.0001, start + .33);
          oscillator.connect(volume).connect(audio.destination);
          oscillator.start(start);
          oscillator.stop(start + .34);
        });
      } catch {
        // The party can continue in browsers that decline sound playback.
      }
    };
  }

  window.mountY2KParty = (experience, params) => {
    const { partyPhotos, partyVoices, partyMusic, wishes, recipient } = window.birthdayContent;
    const vinylPaths = new Map([
      ["assets/party-voices/ou.m4a", "assets/party-voices/vinyl/ou.m4a"],
      ["assets/party-voices/ting.m4a", "assets/party-voices/vinyl/ting.m4a"],
      ["assets/party-voices/min-clean.m4a", "assets/party-voices/vinyl/min.m4a?v=rumble-clean"],
    ]);
    const voices = params.get("sound") === "original"
      ? partyVoices
      : partyVoices.map(voice => ({ ...voice, playbackSrc: vinylPaths.get(voice.src) }));
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    const musicLevel = .28;
    const musicUnderSpeech = .068;
    const music = new Audio(partyMusic);
    const playSound = createSounds(activateAudio);
    const quieter = new Set();
    let audio;
    let musicGain;
    music.loop = true;
    music.preload = "auto";
    music.volume = musicLevel;

    document.documentElement.dataset.party = "";
    document.title = recipient ? `${recipient}的生日派对` : "生日派对";
    experience.dataset.theme = "party";
    experience.innerHTML = `
      <div class="party">
        <div data-party-stage></div>
        <button class="party-audio-control" type="button" aria-pressed="false" aria-label="背景音乐" hidden><span aria-hidden="true">♪</span> 音乐</button>
        <div class="party-edge-confetti" aria-hidden="true"></div>
      </div>`;
    const stage = experience.querySelector("[data-party-stage]");
    const musicControl = experience.querySelector(".party-audio-control");
    const confetti = experience.querySelector(".party-edge-confetti");
    let sceneKey;
    let cleanUp;
    let entranceTimer;
    let confettiTimer;

    function activateAudio() {
      if (!AudioEngine) return;
      audio ||= new AudioEngine();
      if (audio.state !== "running") audio.resume().catch(() => {});
      return audio;
    }

    function targetMusicLevel() {
      if (quieter.has("microphone")) return 0;
      return quieter.has("recording") ? musicUnderSpeech : musicLevel;
    }

    function updateMusicLevel() {
      const target = targetMusicLevel();
      music.muted = quieter.has("microphone");
      if (!musicGain) {
        music.volume = target;
        return;
      }

      const volume = musicGain.gain;
      const now = audio.currentTime;
      const current = volume.value;
      volume.cancelScheduledValues(now);
      volume.setValueAtTime(current, now);
      volume.linearRampToValueAtTime(target, now + (target < current ? .18 : .55));
    }

    function setQuiet(reason, quiet) {
      if (quieter.has(reason) === quiet) return;
      if (quiet) quieter.add(reason);
      else quieter.delete(reason);
      updateMusicLevel();
    }

    function updateMusicControl() {
      musicControl.setAttribute("aria-pressed", String(!music.paused));
    }

    function startMusic() {
      try {
        const context = activateAudio();
        if (context && !musicGain) {
          const gain = context.createGain();
          gain.gain.value = targetMusicLevel();
          context.createMediaElementSource(music).connect(gain).connect(context.destination);
          musicGain = gain;
          music.volume = 1;
        }
      } catch {
        // The media element can still play if the audio graph is unavailable.
      }
      music.play().catch(updateMusicControl);
    }

    for (const eventName of ["play", "pause", "error"]) music.addEventListener(eventName, updateMusicControl);
    musicControl.addEventListener("click", () => {
      if (music.paused) startMusic();
      else music.pause();
    });

    function edgeBurst() {
      if (!motion.matches) return;
      const colors = ["#ee278c", "#f0aadf", "#fff5e4", "#b997ff", "#ffef8e", "#a12965", "#f9e2f5"];
      const pieces = Array.from({ length: 76 }, (_, index) => {
        const item = document.createElement("i");
        const left = index % 2 === 0;
        const direction = left ? 1 : -1;
        const reach = 18 + Math.random() * 28;
        item.style.setProperty("--side", left ? "-9px" : "100%");
        item.style.setProperty("--y", `${23 + Math.random() * 45}vh`);
        item.style.setProperty("--reach", `${direction * reach}vw`);
        item.style.setProperty("--drift", `${direction * (reach + 4 + Math.random() * 10)}vw`);
        item.style.setProperty("--lift", `${-19 + Math.random() * 30}vh`);
        item.style.setProperty("--turn", `${direction * (170 + Math.random() * 370)}deg`);
        item.style.setProperty("--size", `${5 + Math.random() * 10}px`);
        item.style.setProperty("--delay", `${Math.random() * .3}s`);
        item.style.setProperty("--life", `${1.2 + Math.random() * 1.45}s`);
        item.style.setProperty("--color", colors[index % colors.length]);
        return item;
      });
      window.clearTimeout(confettiTimer);
      confetti.replaceChildren(...pieces);
      confettiTimer = window.setTimeout(() => confetti.replaceChildren(), 3000);
    }

    function replay() {
      music.pause();
      music.currentTime = 0;
      quieter.clear();
      updateMusicLevel();
      window.clearTimeout(confettiTimer);
      confetti.replaceChildren();
      show("ticket");
    }

    function show(key, options = {}) {
      cleanUp?.();
      cleanUp = undefined;
      window.clearTimeout(entranceTimer);
      sceneKey = key;
      const scene = document.createElement("section");
      scene.className = "party-scene";
      scene.dataset.scene = key;
      scene.setAttribute("aria-label", sceneNames[key]);
      scene.tabIndex = -1;
      if (options.arriving) scene.classList.add("is-arriving");
      if (options.entrance) scene.dataset.entrance = "";
      stage.replaceChildren(scene);
      musicControl.hidden = key === "ticket";
      const next = destination => () => {
        if (sceneKey === key) show(destination, { arriving: true });
      };

      if (key === "ticket") {
        cleanUp = window.partyTicket.mount(scene, { recipient, enter() {
          playSound("tear");
          startMusic();
          entranceTimer = window.setTimeout(() => {
            show("cake", { arriving: true, entrance: true });
            edgeBurst();
          }, motion.matches ? 630 : 0);
        } });
      } else if (key === "cake") {
        cleanUp = mountCake(scene, { playSound, onNext: next("balloons"), isLit: options.isLit, recipient });
      } else if (key === "balloons") {
        cleanUp = window.partyBalloons.mount(scene, { photos: partyPhotos, onNext: next("scratch"), playSound });
      } else if (key === "scratch") {
        mountTable(scene, wishes, next("jukebox"));
      } else if (key === "jukebox") {
        cleanUp = window.partyJukebox.mount(scene, {
          voices,
          onNext: next("finale"),
          onPlayback: playing => setQuiet("recording", playing)
        });
      } else {
        cleanUp = window.partyFinale.mount(scene, {
          cake: cakePhoto(),
          recipient,
          playSound,
          onReplay: replay,
          onListening: listening => setQuiet("microphone", listening),
          onComplete() {
            sceneKey = "done";
            scene.dataset.scene = "done";
            scene.setAttribute("aria-label", sceneNames.done);
          },
          reducedMotion: !motion.matches,
          state: options.finaleState
        });
      }

      window.scrollTo({ top: 0, behavior: "instant" });
      if (options.arriving) scene.focus({ preventScroll: true });
    }

    const requested = params.get("state");
    if (requested === "lit") show("cake", { isLit: true });
    else if (requested === "sealed" || requested === "done") show("finale", { finaleState: requested });
    else show(Object.hasOwn(sceneNames, requested) ? requested : "ticket");
  };
})();
