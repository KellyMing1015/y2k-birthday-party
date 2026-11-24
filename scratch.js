(() => {
  const width = 416;
  const height = 270;

  function drawSpark(context, x, y, r) {
    context.beginPath();
    context.moveTo(x, y - r);
    context.quadraticCurveTo(x + 2, y - 2, x + r, y);
    context.quadraticCurveTo(x + 2, y + 2, x, y + r);
    context.quadraticCurveTo(x - 2, y + 2, x - r, y);
    context.quadraticCurveTo(x - 2, y - 2, x, y - r);
    context.fill();
  }

  function paintFoil(context, index) {
    const foil = context.createLinearGradient(10, 18, 372, 290);
    foil.addColorStop(0, "#9a7d9b");
    foil.addColorStop(.19, "#f7eef8");
    foil.addColorStop(.35, "#bbadc6");
    foil.addColorStop(.48, "#fcf9ff");
    foil.addColorStop(.58, "#eeccdf");
    foil.addColorStop(.69, "#b8a4c3");
    foil.addColorStop(.88, "#f9eefc");
    foil.addColorStop(1, "#9883a3");
    context.fillStyle = foil;
    context.fillRect(0, 0, width, height);

    context.lineWidth = 1;
    context.strokeStyle = "#fff5ff55";
    for (let offset = -height; offset < width; offset += 5) {
      context.beginPath();
      context.moveTo(offset, height);
      context.lineTo(offset + height, 0);
      context.stroke();
    }

    context.fillStyle = "#fffaff";
    drawSpark(context, 63 + 5 * index, 56, 20);
    drawSpark(context, 350 - 5 * index, 191, 19);
    drawSpark(context, 329, 68, 8);
    drawSpark(context, 87, 218, 7);

    context.strokeStyle = "#51405360";
    context.strokeRect(12.5, 12.5, width - 25, height - 25);
    context.fillStyle = "#38152e";
    context.font = "700 42px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("刮开", width / 2, height / 2 + 4);
  }

  function countErased(context) {
    const { data } = context.getImageData(0, 0, width, height);
    let erased = 0;
    let samples = 0;
    for (let row = 5; row < height; row += 10) {
      for (let column = 5; column < width; column += 10) {
        samples += 1;
        if (data[(row * width + column) * 4 + 3] < 96) erased += 1;
      }
    }
    return erased / samples;
  }

  function bindScratch(canvas, context, reveal) {
    const card = canvas.closest(".scratch-card");
    let pointerId = null;
    let lastPoint = null;
    let lastCheck = 0;
    let isComplete = false;
    let inverseTransform;

    function brush(event, previous = null) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / canvas.clientWidth;
      const scaleY = height / canvas.clientHeight;
      const offset = new DOMPoint(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2)
      ).matrixTransform(inverseTransform);
      const brushWidth = Math.max(29, Math.min(154, 44 * scaleX));
      const current = {
        x: width / 2 + offset.x * scaleX,
        y: height / 2 + offset.y * scaleY
      };
      context.beginPath();
      if (previous) {
        context.moveTo(previous.x, previous.y);
        context.lineTo(current.x, current.y);
        context.lineWidth = brushWidth;
        context.stroke();
      } else {
        context.arc(current.x, current.y, brushWidth / 2, 0, Math.PI * 2);
        context.fill();
      }
      return current;
    }

    function checkCover() {
      if (!isComplete && countErased(context) >= .31) {
        isComplete = true;
        reveal();
      }
    }

    canvas.addEventListener("pointerdown", event => {
      if (isComplete || pointerId !== null || event.button !== 0) return;
      event.preventDefault();
      const transform = getComputedStyle(card).transform;
      inverseTransform = new DOMMatrix(transform === "none" ? undefined : transform).inverse();
      inverseTransform.e = 0;
      inverseTransform.f = 0;
      pointerId = event.pointerId;
      canvas.setPointerCapture(pointerId);
      lastPoint = brush(event);
      lastCheck = performance.now();
    });

    canvas.addEventListener("pointermove", event => {
      if (event.pointerId !== pointerId || isComplete) return;
      lastPoint = brush(event, lastPoint);
      const time = performance.now();
      if (time - lastCheck >= 140) {
        lastCheck = time;
        checkCover();
      }
    });

    function finishStroke(event) {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      lastPoint = null;
      checkCover();
    }

    canvas.addEventListener("pointerup", finishStroke);
    canvas.addEventListener("pointercancel", finishStroke);
    canvas.addEventListener("lostpointercapture", finishStroke);
    canvas.addEventListener("contextmenu", event => event.preventDefault());
  }

  function makeCard(wish, index, onReveal) {
    const number = index + 1;
    const card = document.createElement("li");
    card.className = "scratch-card";
    card.innerHTML = `
      <div class="scratch-card-meta"><span>${String(number).padStart(2, "0")}</span><span aria-hidden="true">✦</span></div>
      <div class="scratch-face">
        <figure class="scratch-wish" tabindex="-1" aria-hidden="true">
          <blockquote class="scratch-wish-text"></blockquote>
          <figcaption class="scratch-signature" hidden></figcaption>
        </figure>
        <canvas class="scratch-foil" width="${width}" height="${height}" aria-hidden="true"></canvas>
        <button class="scratch-keyboard" type="button" aria-label="刮开第 ${number} 张祝福"></button>
      </div>
    `;
    const face = card.querySelector(".scratch-face");
    const message = card.querySelector(".scratch-wish");
    const canvas = card.querySelector("canvas");
    const button = card.querySelector("button");
    const { text, author } = typeof wish === "string" ? { text: wish } : wish;
    message.querySelector(".scratch-wish-text").textContent = text;
    if (author) {
      const signature = message.querySelector(".scratch-signature");
      signature.textContent = `— ${author}`;
      signature.hidden = false;
    }

    function reveal() {
      if (card.classList.contains("is-uncovered")) return;
      card.classList.add("is-uncovered");
      message.removeAttribute("aria-hidden");
      if (document.activeElement === button) message.focus({ preventScroll: true });
      button.hidden = true;
      onReveal(number);
    }

    button.addEventListener("click", reveal);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      paintFoil(context, index);
      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      context.lineJoin = "round";
      bindScratch(canvas, context, reveal);
    } else {
      face.classList.add("scratch-face-fallback");
      canvas.hidden = true;
      button.textContent = "刮开";
    }

    return card;
  }

  window.mountBirthdayScratch = (mount, wishes) => {
    if (!mount || !wishes?.length) return;
    const header = document.createElement("div");
    const instruction = document.createElement("p");
    const progress = document.createElement("p");
    const grid = document.createElement("ol");
    header.className = "scratch-header";
    instruction.textContent = "在银膜上来回刮，每张藏着一句祝福。";
    progress.className = "scratch-progress";
    progress.setAttribute("role", "status");
    progress.setAttribute("aria-atomic", "true");
    grid.className = "scratch-grid";
    grid.setAttribute("role", "list");
    let uncovered = 0;

    function updateProgress() {
      progress.textContent = `已刮开 ${uncovered} / ${wishes.length}`;
    }

    for (const [index, wish] of wishes.entries()) {
      grid.append(makeCard(wish, index, () => {
        uncovered += 1;
        updateProgress();
      }));
    }

    updateProgress();
    header.append(instruction, progress);
    mount.replaceChildren(header, grid);
  };
})();
