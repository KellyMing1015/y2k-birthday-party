window.birthdayThemes ??= {};

window.birthdayThemes.radio = {
  title: "深夜生日台",
  celebration: "none",
  announcements: ["", "电台已打开。可以调到生日频道了。", "已收到生日专场。语音和照片已经解锁。"],
  render: () => `
    <article class="radio">
      <section class="radio-hero" aria-label="深夜生日台">
        <div class="radio-wrap">
          <div class="radio-case">
            <div class="radio-case-header">
              <span class="radio-case-brand" aria-hidden="true"><i></i> MIDNIGHT RADIO</span>
              <span class="radio-case-status" aria-hidden="true">
                <i></i>
                <span data-stage="0">OFF AIR</span>
                <span data-stage="1" hidden>TUNING</span>
                <span data-stage="2" hidden>ON AIR</span>
              </span>
            </div>
            <div class="radio-front">
              <div class="radio-receiver">
                <div class="radio-window">
                  <div class="radio-window-copy">
                    <p class="radio-broadcast">仅对你播出</p>
                    <h1>深夜生日台</h1>
                    <p class="radio-window-message" data-stage="0">今晚，有个频道在等你。</p>
                    <p class="radio-window-message" data-stage="1" hidden>离今晚的节目，还差一点。</p>
                    <p class="radio-window-message" data-stage="2" hidden>听到了吗？生日快乐。</p>
                  </div>
                </div>
                <div class="radio-frequency" aria-hidden="true">
                  <div class="radio-frequency-readout">
                    <span>FM</span>
                    <strong data-stage="0">—.—</strong>
                    <strong data-stage="1" hidden>91.2</strong>
                    <strong data-stage="2" hidden>98.7</strong>
                  </div>
                  <div class="radio-band">
                    <div class="radio-band-scale">
                      <span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="radio-controls">
                <div class="radio-control-dial" aria-hidden="true">
                  <span class="radio-control-mark">FM TUNING</span>
                  <div class="radio-dial">
                    <div class="radio-wheel"></div>
                  </div>
                </div>
                <div class="radio-actions">
                  <button class="radio-action" type="button" data-ritual="advance" data-stage="0">
                    <i class="radio-power-icon" aria-hidden="true"></i> 打开电台
                  </button>
                  <button class="radio-action" type="button" data-ritual="advance" data-stage="1" hidden>调到生日频道</button>
                  <a class="radio-action" href="#radio-memories" data-stage="2" hidden>收听生日专场</a>
                </div>
                <div class="radio-grille" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="radio-memories radio-wrap" id="radio-memories" data-memories tabindex="-1" hidden>
        <h2>生日专场</h2>
        <div class="radio-memory-voice">
          <h3>留在电波里的话</h3>
          <div data-voice-mount></div>
        </div>
        <div class="radio-memory-photos">
          <h3>我们在一起的画面</h3>
          <div data-photo-mount></div>
        </div>
      </section>
    </article>
  `,
};
