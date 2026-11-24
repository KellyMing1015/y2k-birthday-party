window.birthdayThemes = window.birthdayThemes || {};
window.birthdayThemes.archive = {
  title: '友谊标本室',
  announcements: ['展册未启封', '展册已打开，里面夹着一封信', '来信已抽出，照片与语音导览已开启'],
  render: () => `
    <article class="archive">
      <section class="archive-intro" aria-labelledby="archive-title">
        <div class="archive-masthead">
          <span>THE FRIENDSHIP HERBARIUM</span>
          <span>私人生日展</span>
        </div>
        <div class="archive-heading">
          <h1 id="archive-title">友谊标本室</h1>
          <p>把那些舍不得忘的小事，<br>收进只为你开放的展览。</p>
        </div>
        <div class="archive-plate" aria-label="展册卷首">
          <div class="archive-spine" aria-hidden="true">
            <span>卷首</span>
            <span>生日特藏</span>
          </div>
          <div class="archive-exhibit">
            <img class="archive-specimen" src="assets/archive.webp" alt="米色纸上的蕨叶、白色野花和淡紫色花穗标本" width="1440" height="960">
            <div class="archive-label" aria-hidden="true">
              <span class="archive-label-rule"></span>
              <span>纸上植物标本</span>
              <span>野花、蕨叶与草穗</span>
            </div>
            <div class="archive-pocket" aria-hidden="true"></div>
            <div class="archive-letter">
              <div class="archive-letter-seal" aria-hidden="true"><span>致你</span></div>
              <div class="archive-letter-copy" data-stage="2" hidden>
                <strong>祝你生日快乐。</strong>
                <span>愿你新一岁里，常常遇到喜欢的小事。</span>
              </div>
            </div>
          </div>
        </div>
        <div class="archive-ritual">
          <div class="archive-note">
            <span data-stage="0">展册未启封</span>
            <span data-stage="1" hidden>展册里夹着一封信</span>
            <span data-stage="2" hidden>照片与语音导览已开启</span>
          </div>
          <button class="archive-action" type="button" data-ritual="advance" data-stage="0">打开私人展册</button>
          <button class="archive-action" type="button" data-ritual="advance" data-stage="1" hidden>抽出生日来信</button>
          <a class="archive-action" data-stage="2" href="#archive-memories" hidden>浏览生日特藏</a>
        </div>
      </section>

      <section id="archive-memories" class="archive-memories" tabindex="-1" data-memories hidden aria-labelledby="archive-collection">
        <div class="archive-collection-heading">
          <span>生日特藏</span>
          <h2 id="archive-collection">被收藏的日常</h2>
        </div>
        <div class="archive-room">
          <h3>照片标本</h3>
          <div data-photo-mount></div>
        </div>
        <div class="archive-room archive-listening-room">
          <h3>语音导览</h3>
          <div data-voice-mount></div>
        </div>
      </section>
    </article>
  `
};
