(() => {
  function mount(scene, { cake, recipient, playSound, onReplay, onListening, onComplete, reducedMotion, state }) {
    scene.innerHTML = `
      <div class="party-finale is-candle-lit">
        <div class="party-finale-card">
          <h1 class="party-stage-title party-finale-title" tabindex="-1">写下生日愿望</h1>
          <form class="party-finale-note">
            <label for="birthday-wish">给未来的自己</label>
            <textarea id="birthday-wish" name="wish" rows="4" maxlength="280" required readonly autocomplete="off"></textarea>
            <button class="party-button" type="submit" disabled>合上信封</button>
            <p class="party-wish-status" role="status" hidden></p>
          </form>
          <div data-final-sealed hidden>
            <div class="party-final-packet">
              <div class="party-envelope" role="img" aria-label="封好的生日愿望"><span aria-hidden="true">♥</span></div>
              <p>愿望已经封好。</p>
            </div>
            <div data-blow-actions>
              <p class="party-finale-instruction">对着麦克风轻轻吹，送出这个愿望。</p>
              <div class="party-blow-controls">
                <button class="party-button" type="button" data-listen>打开麦克风</button>
                <button class="party-quiet-button" type="button" data-blow>点击吹灭</button>
              </div>
              <p class="party-mic-status" role="status"></p>
            </div>
            <button class="party-button" type="button" data-party-replay hidden>再玩一次</button>
          </div>
        </div>
        ${cake}
      </div>`;

    const root = scene.querySelector(".party-finale");
    const heading = scene.querySelector(".party-finale-title");
    const form = scene.querySelector("form");
    const textarea = form.querySelector("textarea");
    const submit = form.querySelector("button");
    const saveStatus = form.querySelector(".party-wish-status");
    const sealed = scene.querySelector("[data-final-sealed]");
    const envelope = scene.querySelector(".party-envelope");
    const blowActions = scene.querySelector("[data-blow-actions]");
    const micButton = scene.querySelector("[data-listen]");
    const micStatus = scene.querySelector(".party-mic-status");
    const flame = scene.querySelector(".party-flame");
    const replay = scene.querySelector("[data-party-replay]");
    const wishRequest = new AbortController();
    let phase = "checking";
    let foldTimer;
    let microphone;

    function showSealed(animate) {
      phase = "sealed";
      textarea.value = "";
      form.hidden = true;
      sealed.hidden = false;
      heading.textContent = "最后，吹灭蜡烛";
      if (animate) {
        envelope.classList.add("is-arriving");
        heading.focus({ preventScroll: true });
      }
    }

    function stopListening(message = "") {
      if (!microphone) return;
      const previous = microphone;
      microphone = undefined;
      window.clearTimeout(previous.timer);
      window.cancelAnimationFrame(previous.frame);
      previous.stream?.getTracks().forEach(track => track.stop());
      previous.source?.disconnect();
      if (previous.context?.state !== "closed") previous.context?.close().catch(() => {});
      flame.classList.remove("is-wavering");
      onListening(false);
      micButton.disabled = false;
      micButton.textContent = "打开麦克风";
      micStatus.textContent = message;
    }

    function finish(animate) {
      if (phase !== "sealed") return;
      stopListening();
      phase = "done";
      root.classList.remove("is-candle-lit");
      root.classList.add("is-candle-out");
      blowActions.hidden = true;
      replay.hidden = false;
      heading.textContent = recipient ? `${recipient}，生日快乐！` : "生日快乐！";
      onComplete();
      if (animate) {
        playSound("finish");
        heading.focus({ preventScroll: true });
      }
    }

    async function listen() {
      if (phase !== "sealed" || microphone) return;
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!navigator.mediaDevices?.getUserMedia || !AudioEngine) {
        micStatus.textContent = "这个浏览器无法打开麦克风，可以点击吹灭。";
        return;
      }

      const attempt = {};
      microphone = attempt;
      micButton.disabled = true;
      micButton.textContent = "等待麦克风";
      micStatus.textContent = "请允许使用麦克风。";
      onListening(true);

      try {
        attempt.context = new AudioEngine();
        const resume = attempt.context.resume().catch(() => {});
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });

        if (microphone !== attempt) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        attempt.stream = stream;
        await resume;
        if (microphone !== attempt) return;
        const analyser = attempt.context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0;
        attempt.source = attempt.context.createMediaStreamSource(stream);
        attempt.source.connect(analyser);
        const silentOutput = attempt.context.createGain();
        silentOutput.gain.value = 0;
        analyser.connect(silentOutput).connect(attempt.context.destination);
        const samples = new Float32Array(analyser.fftSize);
        const start = performance.now();
        let noiseFloor = 0;
        let calibrationFrames = 0;
        let loudFor = 0;
        let previousFrame = start;
        micButton.textContent = "正在准备";
        micStatus.textContent = "麦克风准备中。";

        function check(now) {
          if (microphone !== attempt) return;
          analyser.getFloatTimeDomainData(samples);
          let power = 0;
          for (const sample of samples) power += sample * sample;
          const volume = Math.sqrt(power / samples.length);
          const elapsed = now - start;
          if (elapsed < 380) {
            calibrationFrames += 1;
            noiseFloor += (volume - noiseFloor) / calibrationFrames;
          } else if (previousFrame - start < 380) {
            micButton.textContent = "正在听";
            micStatus.textContent = "靠近一点，轻轻吹一下。";
          }
          const threshold = Math.max(.032, Math.min(.11, noiseFloor * 2.45 + .018));
          const blowing = elapsed >= 380 && volume > threshold;
          flame.classList.toggle("is-wavering", blowing);
          if (blowing) loudFor += Math.min(now - previousFrame, 45);
          else loudFor = Math.max(0, loudFor - 42);
          previousFrame = now;
          if (loudFor >= 125) finish(true);
          else attempt.frame = window.requestAnimationFrame(check);
        }
        attempt.frame = window.requestAnimationFrame(check);
        attempt.timer = window.setTimeout(() => {
          stopListening("还没听到吹气，可以重试或点击吹灭。");
        }, 12500);
      } catch {
        if (microphone === attempt) stopListening("麦克风暂时无法使用，可以点击吹灭。");
      }
    }

    function saveMessage(message = "") {
      saveStatus.textContent = message;
      saveStatus.hidden = !message;
    }

    function allowWriting(message) {
      phase = "writing";
      textarea.readOnly = false;
      submit.disabled = !textarea.value.trim();
      submit.textContent = "合上信封";
      saveMessage(message);
    }

    async function checkWish() {
      try {
        const response = await fetch("./api/wish", { signal: wishRequest.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Could not read wish status");
        const result = await response.json();
        if (wishRequest.signal.aborted) return;
        if (result.sealed) {
          showSealed(false);
          if (state === "done") finish(false);
        } else {
          allowWriting();
        }
      } catch {
        if (!wishRequest.signal.aborted) allowWriting("暂时无法读取愿望状态，填写后可以再试着保存。");
      }
    }

    textarea.addEventListener("input", () => { submit.disabled = phase !== "writing" || !textarea.value.trim(); });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const wish = textarea.value.trim();
      if (!wish || phase !== "writing") return;
      phase = "saving";
      textarea.readOnly = true;
      submit.disabled = true;
      submit.textContent = "正在封信…";
      saveMessage();

      try {
        const response = await fetch("./api/wish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wish }),
          signal: wishRequest.signal
        });
        if (wishRequest.signal.aborted) return;
        if (response.status === 401) {
          allowWriting("入场已过期，请先复制愿望，再刷新并重新输入密码。");
          return;
        }
        if (response.status !== 201 && response.status !== 409) throw new Error("Could not save wish");
        const result = await response.json();
        if (wishRequest.signal.aborted) return;
        if (result.sealed !== true) throw new Error("Wish is not sealed");
      } catch {
        if (!wishRequest.signal.aborted) allowWriting("愿望暂时没存上，文字还在，可以再点一次。");
        return;
      }

      phase = "folding";
      form.classList.add("is-folding");
      playSound("envelope");
      foldTimer = window.setTimeout(() => showSealed(true), reducedMotion ? 0 : 390);
    });
    micButton.addEventListener("click", listen);
    scene.querySelector("[data-blow]").addEventListener("click", () => finish(true));
    replay.addEventListener("click", onReplay);
    const pageHide = () => stopListening();
    window.addEventListener("pagehide", pageHide);

    checkWish();

    return () => {
      wishRequest.abort();
      window.clearTimeout(foldTimer);
      window.removeEventListener("pagehide", pageHide);
      stopListening();
    };
  }

  window.partyFinale = { mount };
})();
