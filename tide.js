window.birthdayThemes ||= {};
window.birthdayThemes.tide = {
  title: "潮汐来信",
  announcements: ["", "海雾散开了，潮水送来一封信。", "信已展开。照片和语音在信后面。"],
  render() {
    return `
    <article class="tide">
      <section class="tide-scene" aria-labelledby="tide-title">
        <img class="tide-landscape" src="assets/tide.webp" alt="">
        <div class="tide-mist" aria-hidden="true"></div>
        <div class="tide-inner">
          <div class="tide-mast"><span class="tide-ordinary">生日来信</span><span lang="en">A LETTER FROM THE TIDE</span></div>
          <div class="tide-copy">
            <h1 id="tide-title">潮汐<span class="tide-title-tail">来信</span></h1>
            <p data-stage="0">今天的海很安静，有一封信正往岸边来。</p>
            <p data-stage="1" hidden>雾淡了。信就在离你最近的那片水声里。</p>
            <p data-stage="2" hidden>生日快乐。愿你一年到头，都能给自己留一点看海的时间。</p>
            <button class="tide-action" type="button" data-stage="0" data-ritual="advance"><span aria-hidden="true">◌</span> 等雾散开</button>
            <button class="tide-action" type="button" data-stage="1" data-ritual="advance" hidden><span aria-hidden="true">✉</span> 拆开来信</button>
            <a class="tide-action" data-stage="2" href="#tide-memories" hidden><span aria-hidden="true">✳</span> 看照片，听语音</a>
          </div>
          <div class="tide-base" aria-hidden="true"><span>〰</span><span>海雾 · 岸边</span></div>
        </div>
      </section>
      <section class="tide-letter" id="tide-memories" data-memories hidden tabindex="-1" aria-labelledby="tide-letter-title">
        <header class="tide-letter-head">
          <p lang="en">AFTER THE TIDE</p>
          <h2 id="tide-letter-title">留在岸上的</h2>
        </header>
        <section class="tide-media-row">
          <h3>照片</h3>
          <div data-photo-mount></div>
        </section>
        <section class="tide-media-row">
          <h3>语音</h3>
          <div data-voice-mount></div>
        </section>
      </section>
    </article>`;
  }
};
