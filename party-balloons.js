window.partyBalloons = {
  mount(scene, { photos, onNext, playSound }) {
    scene.innerHTML = `
      <div class="party-balloon-page">
        <header class="party-balloon-heading">
          <h2 data-scene-focus tabindex="-1">照片戳戳乐</h2>
          <p class="party-balloon-instruction">戳破气球，解锁拍立得</p>
          <p class="party-balloon-progress" aria-live="polite" aria-atomic="true"></p>
        </header>
        <div class="party-balloon-stage">
          <div class="party-balloon-photo-shelf">
            <div class="party-balloon-card-bed" role="group" aria-label="掉落的拍立得"></div>
            <div class="party-balloon-photo-details" hidden>
              <div class="party-balloon-photo-text"></div>
              <div class="party-balloon-photo-nav" role="group" aria-label="回看已收集的照片">
                <button class="party-balloon-back" type="button" aria-label="上一张照片">←</button>
                <span class="party-balloon-photo-position" aria-live="polite"></span>
                <button class="party-balloon-forward" type="button" aria-label="下一张照片">→</button>
              </div>
            </div>
          </div>
          <div class="party-balloon-wall-bed">
            <div class="party-balloon-wall" role="group" aria-label="照片气球"></div>
          </div>
        </div>
        <div class="party-balloon-exit">
          <button class="party-button party-balloon-next" type="button" hidden>去刮刮乐桌</button>
        </div>
      </div>`;

    const page = scene.querySelector('.party-balloon-page');
    const instruction = scene.querySelector('.party-balloon-instruction');
    const progress = scene.querySelector('.party-balloon-progress');
    const stage = scene.querySelector('.party-balloon-stage');
    const bed = scene.querySelector('.party-balloon-card-bed');
    const details = scene.querySelector('.party-balloon-photo-details');
    const photoText = scene.querySelector('.party-balloon-photo-text');
    const position = scene.querySelector('.party-balloon-photo-position');
    const back = scene.querySelector('.party-balloon-back');
    const forward = scene.querySelector('.party-balloon-forward');
    const wall = scene.querySelector('.party-balloon-wall');
    const next = scene.querySelector('.party-balloon-next');
    const collected = [];
    const targets = [];
    const balloonStyles = 8;
    let shown = 0;

    stage.toggleAttribute('data-scattered', photos.length > 0 && photos.length <= balloonStyles);

    function showPhoto(fromBalloon) {
      const photoIndex = collected[shown];
      const photo = photos[photoIndex];
      const card = document.createElement('figure');
      card.className = 'party-balloon-card';
      card.dataset.tint = String(photoIndex % 3);

      const picture = document.createElement('div');
      picture.className = 'party-balloon-card-image';
      if (photo.src) {
        const image = document.createElement('img');
        image.src = photo.src;
        image.alt = photo.alt || photo.title || `第 ${photoIndex + 1} 张照片`;
        picture.append(image);
      } else {
        picture.setAttribute('aria-hidden', 'true');
        picture.textContent = '✦';
      }

      const label = document.createElement('figcaption');
      label.textContent = photo.title || `照片 ${photoIndex + 1}`;
      card.append(picture, label);
      card.dataset.drop = String(Boolean(fromBalloon));

      const meta = document.createElement('p');
      meta.className = 'party-balloon-photo-meta';
      meta.textContent = `${photo.date || '—'} · ${photo.place || '—'}`;
      if (!photo.date && !photo.place) meta.setAttribute('aria-hidden', 'true');
      photoText.replaceChildren(meta);
      if (photo.caption) {
        const caption = document.createElement('p');
        caption.className = 'party-balloon-photo-caption';
        caption.textContent = photo.caption;
        photoText.append(caption);
      }
      details.hidden = false;
      if (fromBalloon) {
        const target = bed.getBoundingClientRect();
        card.style.setProperty('--drop-x', `${fromBalloon.x - target.left - target.width / 2}px`);
        card.style.setProperty('--drop-y', `${fromBalloon.y - target.top - target.height / 2}px`);
      }
      bed.replaceChildren(card);
      bed.dataset.collected = String(Math.min(collected.length, 3));
      position.textContent = `${shown + 1} / ${collected.length}`;
      back.setAttribute('aria-disabled', String(shown === 0));
      forward.setAttribute('aria-disabled', String(shown === collected.length - 1));
    }

    function updateProgress() {
      const complete = collected.length === photos.length;
      progress.textContent = `已接住 ${collected.length} / ${photos.length} 张`;
      next.hidden = !complete;
      page.toggleAttribute('data-complete', complete);
      if (complete && collected.length) instruction.textContent = '用箭头回看刚刚接住的照片。';
    }

    function pop(index, button, event) {
      if (button.getAttribute('aria-disabled') === 'true') return;

      const bounds = button.getBoundingClientRect();
      button.setAttribute('aria-disabled', 'true');
      button.tabIndex = -1;
      button.classList.add('is-popped');
      collected.push(index);
      shown = collected.length - 1;
      showPhoto({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
      updateProgress();

      if (event.detail === 0) {
        const available = targets.slice(index + 1).concat(targets.slice(0, index))
          .find(target => target.getAttribute('aria-disabled') !== 'true');
        (available || next).focus({ preventScroll: true });
      }
      playSound?.('pop');
    }

    photos.forEach((_, index) => {
      const style = index % balloonStyles;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'party-balloon-target';
      button.dataset.color = String(style);
      button.setAttribute('aria-label', `戳破第 ${index + 1} 个气球`);
      if (style === 2 || style === 5) button.classList.add('is-heart');
      button.innerHTML = `
        <span class="party-balloon-body" aria-hidden="true"></span>
        <span class="party-balloon-tie" aria-hidden="true"></span>
        <span class="party-balloon-string" aria-hidden="true"></span>
        <span class="party-balloon-burst" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </span>`;
      button.addEventListener('click', event => pop(index, button, event));
      targets.push(button);
      wall.append(button);
    });

    back.addEventListener('click', () => {
      if (shown === 0) return;
      shown--;
      showPhoto();
    });
    forward.addEventListener('click', () => {
      if (shown >= collected.length - 1) return;
      shown++;
      showPhoto();
    });
    next.addEventListener('click', () => {
      if (collected.length === photos.length) onNext();
    });

    updateProgress();
  },
};
