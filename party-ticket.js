window.partyTicket = {
  mount(scene, { enter, recipient }) {
    scene.innerHTML = `
      <div class="ticket-room">
        <div class="admission-ticket">
          <div class="admission-ticket-body">
            <p class="admission-ticket-kind">派对入场券</p>
            <span class="admission-ticket-glint" aria-hidden="true"></span>
            <h1 class="admission-ticket-title"><span>欢迎来到</span><span data-ticket-recipient></span><span>生日派对</span></h1>
          </div>
          <button class="admission-ticket-stub" type="button" aria-label="向下撕票入场，也可以直接点击">
            <span class="admission-ticket-grip" aria-hidden="true"></span>
            <span>向下撕票入场</span>
          </button>
        </div>
      </div>`;

    const title = scene.querySelector('.admission-ticket-title');
    title.setAttribute('aria-label', recipient ? `欢迎来到${recipient}的生日派对` : '欢迎来到生日派对');
    if (recipient) scene.querySelector('[data-ticket-recipient]').textContent = `${recipient}的`;
    const ticket = scene.querySelector('.admission-ticket');
    const stub = scene.querySelector('.admission-ticket-stub');
    let gesture = null;
    let torn = false;
    let suppressClickUntil = 0;

    function tear() {
      if (torn) return;
      torn = true;
      ticket.classList.add('is-torn');
      stub.setAttribute('aria-disabled', 'true');
      enter();
    }

    function releaseGesture() {
      gesture = null;
      stub.classList.remove('is-held');
    }

    stub.addEventListener('pointerdown', (event) => {
      if (torn || !event.isPrimary || event.button !== 0) return;
      suppressClickUntil = 0;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, furthest: 0 };
      stub.classList.add('is-held');
      stub.setPointerCapture(event.pointerId);
    });

    stub.addEventListener('pointermove', (event) => {
      if (gesture?.id !== event.pointerId) return;
      const distance = event.clientY - gesture.y;
      gesture.furthest = Math.max(gesture.furthest, Math.hypot(distance, event.clientX - gesture.x));
      const pull = Math.max(0, distance);
      stub.style.setProperty('--ticket-pull', `${Math.min(pull, 126)}px`);
      stub.style.setProperty('--ticket-tilt', `${Math.min(pull / 21, 5)}deg`);
    });

    stub.addEventListener('pointerup', (event) => {
      if (gesture?.id !== event.pointerId) return;
      const distance = event.clientY - gesture.y;
      const moved = Math.max(gesture.furthest, Math.hypot(distance, event.clientX - gesture.x));
      releaseGesture();
      if (distance >= 54) {
        tear();
      } else {
        if (moved >= 9) suppressClickUntil = performance.now() + 600;
        stub.style.removeProperty('--ticket-pull');
        stub.style.removeProperty('--ticket-tilt');
      }
    });

    stub.addEventListener('lostpointercapture', () => {
      if (!gesture) return;
      releaseGesture();
      stub.style.removeProperty('--ticket-pull');
      stub.style.removeProperty('--ticket-tilt');
    });

    stub.addEventListener('click', (event) => {
      if (event.detail > 0 && performance.now() < suppressClickUntil) return;
      tear();
    });

    stub.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      tear();
    });
  },
};
