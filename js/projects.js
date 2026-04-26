/* ═══════════════════════════════════════════════════
   PROJECTS — storage, listing, save/load, import/export
═══════════════════════════════════════════════════ */

window.Projects = (function() {

  const STORAGE_KEY     = 'hidden-studio:projects';
  const ACTIVE_ID_KEY   = 'hidden-studio:active';
  const AUTOSAVE_DELAY  = 800; // ms after last edit

  /* Storage shape: { "uuid1": {...projectData, meta: {id, createdAt, updatedAt}}, ... } */

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch(e) { return {}; }
  }
  function save(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return true;
    } catch(e) {
      console.warn('Save failed:', e);
      return false;
    }
  }

  function uid() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function list() {
    const all = load();
    return Object.values(all).sort((a, b) => {
      return (b.meta?.updatedAt || 0) - (a.meta?.updatedAt || 0);
    });
  }

  function get(id) {
    const all = load();
    return all[id] || null;
  }

  function create(preset) {
    const all = load();
    const id = uid();
    const now = Date.now();
    // Deep clone the preset so we don't mutate it
    const data = JSON.parse(JSON.stringify(preset));
    data.meta = { id, createdAt: now, updatedAt: now };
    all[id] = data;
    save(all);
    return data;
  }

  function update(id, data) {
    const all = load();
    // Upsert: if the project isn't in storage yet (e.g. initial save failed),
    // save it now rather than silently dropping the update.
    const existing = all[id];
    data.meta = { ...(existing?.meta || {}), id, updatedAt: Date.now() };
    if (!data.meta.createdAt) data.meta.createdAt = Date.now();
    all[id] = data;
    return save(all) ? data : null;
  }

  function remove(id) {
    const all = load();
    delete all[id];
    save(all);
  }

  function rename(id, newName) {
    const all = load();
    if (all[id]) {
      all[id].name = newName;
      all[id].meta.updatedAt = Date.now();
      save(all);
    }
  }

  function setActive(id) { localStorage.setItem(ACTIVE_ID_KEY, id); }
  function getActive()   { return localStorage.getItem(ACTIVE_ID_KEY); }
  function clearActive() { localStorage.removeItem(ACTIVE_ID_KEY); }

  /* Autosave — debounced save of current project */
  let saveTimer = null;
  let statusEl  = null;
  function setStatusEl(el) { statusEl = el; }

  function markDirty() {
    if (statusEl) {
      statusEl.textContent = 'saving…';
      statusEl.classList.add('unsaved');
    }
  }
  function markClean() {
    if (statusEl) {
      statusEl.textContent = 'saved';
      statusEl.classList.remove('unsaved');
    }
  }

  let _storageFullShown = false;
  function markSaveFailed() {
    if (statusEl) {
      statusEl.textContent = 'Save failed — storage full';
      statusEl.classList.add('unsaved', 'save-failed');
    }
    // Show the explainer modal once per session — autosave runs every few
    // seconds so we don't want to keep popping it up.
    if (!_storageFullShown) {
      _storageFullShown = true;
      showStorageFullModal();
    }
  }

  function showStorageFullModal() {
    const body = `
      <div style="font-size:13px;line-height:1.6;color:var(--ui-text)">
        <p style="margin:0 0 12px"><strong>Your browser's storage for this app is full.</strong></p>
        <p style="margin:0 0 12px;color:var(--ui-text-dim)">
          Hidden Studio saves every project locally in your browser (no server, no
          account). Browsers cap that storage at around 5–10&nbsp;MB per site, and
          you've hit the limit — usually because of large imported images.
        </p>
        <p style="margin:0 0 8px"><strong>How to fix it:</strong></p>
        <ol style="margin:0 0 12px 20px;padding:0;color:var(--ui-text-dim)">
          <li style="margin-bottom:6px"><strong>Export this project</strong> as JSON or HTML
            (File → Export) so you don't lose it.</li>
          <li style="margin-bottom:6px"><strong>Go back</strong> to the start screen
            (← in the top-left) and <strong>delete old projects</strong> you no longer need.</li>
          <li style="margin-bottom:6px"><strong>Compress your base image</strong> before
            uploading — large PNGs/JPEGs eat most of the budget. A 1600&nbsp;px-wide JPEG
            at 80% quality is usually plenty.</li>
          <li>If you really need more space, you can re-import the JSON later into
            a fresh browser profile.</li>
        </ol>
        <p style="margin:0;font-size:11px;color:var(--ui-text-dim);font-style:italic">
          Until you free up space, your latest changes will not persist when you close the tab.
        </p>
      </div>`;
    window.Editor?.openModal?.('Save failed — storage full', body);
  }

  function scheduleAutosave(data) {
    markDirty();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (data?.meta?.id) {
        const ok = update(data.meta.id, data);
        if (ok) markClean(); else markSaveFailed();
      }
    }, AUTOSAVE_DELAY);
  }

  /* Force-save now */
  function saveNow(data) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (data?.meta?.id) {
      const ok = update(data.meta.id, data);
      if (ok) markClean(); else markSaveFailed();
    }
  }

  /* ————————————————————————————————————————
     JSON export / import
  ———————————————————————————————————————— */
  function exportJson(data) {
    const exportable = JSON.parse(JSON.stringify(data));
    // Keep meta but reset on import
    const str = JSON.stringify(exportable, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (data.name || 'project').replace(/[^a-z0-9_-]+/gi, '_');
    a.href = url;
    a.download = `${safe}.hiddenstudio.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJson(fileOrText) {
    return new Promise((resolve, reject) => {
      const handle = (text) => {
        try {
          const data = JSON.parse(text);
          if (!data.name || !Array.isArray(data.items)) {
            return reject(new Error('That does not look like a Hidden Studio project file.'));
          }
          // Treat as new project
          const imported = create(data);
          resolve(imported);
        } catch(e) { reject(e); }
      };
      if (typeof fileOrText === 'string') {
        handle(fileOrText);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => handle(e.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(fileOrText);
      }
    });
  }

  /* ————————————————————————————————————————
     Export as standalone playable HTML
     Creates a single-file game from the project, no editor.
  ———————————————————————————————————————— */
  async function exportHtml(data) {
    const sceneInline = await getInlineBaseLayer(data);
    const html = buildStandaloneHtml(data, sceneInline);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (data.name || 'project').replace(/[^a-z0-9_-]+/gi, '_');
    a.href = url;
    a.download = `${safe}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function getInlineBaseLayer(data) {
    if (data.baseType === 'svg' && data.baseContent === 'PLANET_SVG') {
      return { type: 'svg', content: window.PLANET_SVG };
    }
    if (data.baseType === 'image' && data.baseContent) {
      // SCENE_JPG token and legacy 'assets/scene.jpg' both resolve to the
      // bundled data URL — no network fetch needed, works fully offline.
      if (data.baseContent === 'SCENE_JPG' || data.baseContent === 'assets/scene.jpg') {
        return { type: 'image', content: window.SCENE_JPG || '' };
      }
      let content = data.baseContent;
      // For any other non-absolute URL, try to fetch and inline as data URL.
      if (!/^(data:|https?:|blob:)/i.test(content)) {
        try {
          const resp = await fetch(content);
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          const blob = await resp.blob();
          content = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = () => rej(fr.error);
            fr.readAsDataURL(blob);
          });
        } catch (_) {
          content = '';
        }
      }
      return { type: 'image', content };
    }
    return { type: 'empty', content: '' };
  }

  /* Build a minimal standalone HTML file that contains everything needed to play. */
  function buildStandaloneHtml(data, baseInline) {
    const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
    const baseJson = JSON.stringify(baseInline).replace(/</g, '\\u003c');
    return STANDALONE_TEMPLATE
      .replace('__PROJECT_DATA__', dataJson)
      .replace('__BASE_LAYER__', baseJson);
  }

  /* ————————————————————————————————————————
     Standalone export template (self-contained)
     Ultra-minimal: just the game, no editor.
  ———————————————————————————————————————— */
  const STANDALONE_TEMPLATE = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hidden Game</title>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Fraunces:ital,wght@0,300;1,400&display=swap" rel="stylesheet">
<style>
:root { --paper:#f5efe2; --ink:#1a1613; --accent:#c43f2e; --space:#0b0d1f; --found:#5a7a3a; --miss:#ff8c6b; }
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:var(--space);color:var(--paper);font-family:'Fraunces',serif;overflow:hidden;-webkit-user-select:none;user-select:none}
.hud{position:fixed;top:0;left:0;right:0;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;z-index:20;pointer-events:none}
.hud > * {pointer-events:auto}
.title{font-style:italic;font-weight:300;font-size:clamp(20px,3vw,28px)}
.title em{font-family:'Caveat',cursive;font-style:normal;font-weight:700;color:var(--accent);padding:0 .1em}
.chip{font-family:'Caveat',cursive;font-size:17px;padding:5px 14px;border:1.5px solid rgba(245,239,226,.25);border-radius:20px;background:rgba(11,13,31,.8);color:var(--paper);backdrop-filter:blur(6px);cursor:pointer}
.chip b{color:var(--accent)}
.stage{position:fixed;inset:0;overflow:hidden;cursor:grab;touch-action:none}
.stage.grabbing{cursor:grabbing}
.world{position:absolute;top:0;left:0;transform-origin:0 0;width:1600px;height:1600px}
.base{position:absolute;inset:0;pointer-events:none}
.base img,.base svg{width:100%;height:100%;display:block;object-fit:contain}
.hit{position:absolute;border-radius:50%;cursor:inherit}
.mark{position:absolute;pointer-events:none;z-index:6;opacity:0;animation:di .6s ease-out forwards}
.mark svg{width:100%;height:100%;overflow:visible}
.mark circle{fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round;stroke-dasharray:300;stroke-dashoffset:300;animation:dc .6s ease-out forwards}
@keyframes di{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
@keyframes dc{to{stroke-dashoffset:0}}
.pop{position:absolute;font-family:'Caveat',cursive;font-size:28px;font-weight:700;color:var(--accent);pointer-events:none;z-index:7;text-shadow:0 0 8px var(--paper);animation:p 1.4s ease-out forwards}
.miss{position:absolute;font-family:'Caveat',cursive;font-size:22px;font-weight:700;color:var(--miss);pointer-events:none;z-index:7;text-shadow:0 0 6px var(--space);animation:m .5s ease-out forwards}
@keyframes p{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-14px) scale(1.1)}80%{opacity:1;transform:translate(-50%,-36px) scale(1)}100%{opacity:0;transform:translate(-50%,-58px) scale(1)}}
@keyframes m{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-60%)}}
.panel{position:fixed;top:58px;left:14px;width:220px;max-height:calc(100vh - 140px);overflow-y:auto;background:rgba(11,13,31,.9);border:1.5px solid rgba(245,239,226,.25);border-radius:4px 6px 3px 5px;padding:14px 16px;z-index:20;backdrop-filter:blur(6px);transition:transform .3s ease}
.panel.hidden{transform:translateX(calc(-100% - 30px))}
.phead{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.phead h2{margin:0}
.pclose{background:none;border:none;color:rgba(245,239,226,.55);font-size:13px;cursor:pointer;padding:2px 6px;border-radius:3px;font-family:'Fraunces',serif;line-height:1}
.pclose:hover{color:var(--paper);background:rgba(245,239,226,.08)}
.popen{position:fixed;top:80px;left:0;z-index:21;width:28px;height:40px;font-size:14px;border:1.5px solid rgba(245,239,226,.25);border-left:none;background:rgba(11,13,31,.9);color:var(--paper);border-radius:0 6px 6px 0;cursor:pointer;display:none;backdrop-filter:blur(6px)}
.panel.hidden ~ .popen{display:block}
.panel h2{font-family:'Caveat',cursive;font-weight:700;font-size:22px;margin-bottom:4px}
.panel .hint{font-style:italic;font-size:12px;color:rgba(245,239,226,.7);margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed rgba(245,239,226,.3)}
.panel ul{list-style:none}
.panel li{font-family:'Caveat',cursive;font-size:17px;padding:3px 0;display:flex;align-items:center;gap:8px}
.panel li .box{width:14px;height:14px;border:1.2px solid var(--paper);border-radius:2px;display:grid;place-items:center;flex-shrink:0}
.panel li.found{color:var(--found)}
.panel li.found .label{text-decoration:line-through;text-decoration-color:var(--accent)}
.panel li.found .box::after{content:"✓";color:var(--accent);font-size:16px;line-height:.5}
@media (max-width:640px){.panel{left:0;right:0;top:auto;bottom:0;width:100%;max-height:50vh;border-radius:6px 6px 0 0;transform:translateY(100%)}.panel.open{transform:translateY(0)}.popen{display:block;top:auto;bottom:14px;left:14px;width:auto;height:auto;padding:8px 14px;font-size:13px;font-family:'Caveat',cursive;border-radius:20px;border:1.5px solid rgba(245,239,226,.25)}.popen::after{content:" Find list"}.panel.open ~ .popen{display:none}}
.attr{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);font-family:'Fraunces',serif;font-size:11px;font-style:italic;color:rgba(245,239,226,.4);z-index:5;text-decoration:none;pointer-events:auto;white-space:nowrap}
.attr:hover{color:rgba(245,239,226,.85)}
.win-attr{display:block;margin-top:14px;font-size:11px;color:rgba(26,22,19,.55);font-style:italic;text-decoration:none}
.win-attr:hover{color:var(--accent)}
.win{position:fixed;inset:0;background:rgba(11,13,31,.85);backdrop-filter:blur(6px);display:grid;place-items:center;z-index:100;opacity:0;pointer-events:none;transition:opacity .5s}
.win.show{opacity:1;pointer-events:auto}
.win-card{background:var(--paper);color:var(--ink);border:2px solid var(--ink);border-radius:6px;padding:28px 40px;text-align:center;box-shadow:4px 6px 0 var(--accent);max-width:380px}
.win-card h2{font-family:'Caveat',cursive;font-size:38px;color:var(--accent);margin-bottom:8px}
.win-card button{font-family:'Caveat',cursive;font-size:17px;padding:6px 18px;border:1.5px solid var(--ink);background:transparent;border-radius:20px;cursor:pointer;margin-top:12px}
.drawings{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sprite{position:absolute;pointer-events:none}
.sprite img{width:100%;height:auto}
@keyframes egBob{0%,100%{transform:translate(-50%,-50%) rotate(-2deg)}50%{transform:translate(-50%,-54%) rotate(2deg)}}
@keyframes egFade{from{opacity:0;transform:translate(-50%,-50%) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes egShk{0%{transform:translateX(0)}10%{transform:translateX(-8px) rotate(-1deg)}20%{transform:translateX(8px) rotate(1deg)}30%{transform:translateX(-10px)}40%{transform:translateX(10px)}50%{transform:translateX(-7px)}65%{transform:translateX(7px)}80%{transform:translateX(-3px)}100%{transform:translateX(0)}}
@keyframes egTxt{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}
.egg-fl{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:800;max-width:min(380px,85vw);animation:egBob 2s ease-in-out infinite;filter:drop-shadow(0 8px 32px rgba(0,0,0,.7))}
.egg-fl img{max-width:100%;display:block;border-radius:6px}
.egg-fl .eg-txt{margin-top:8px;font-family:'Caveat',cursive;font-size:22px;font-weight:700;color:var(--paper);text-align:center;text-shadow:0 2px 8px rgba(0,0,0,.8)}
.egg-fs{position:fixed;inset:0;background:rgba(11,13,31,.88);backdrop-filter:blur(8px);z-index:800;display:grid;place-items:center}
.egg-in{position:relative;max-width:min(500px,90vw);text-align:center;animation:egFade .3s ease-out}
.egg-in img{max-width:100%;max-height:70vh;border-radius:6px;display:block;margin:0 auto}
.egg-in .eg-txt{margin-top:16px;font-family:'Caveat',cursive;font-size:26px;font-weight:700;color:var(--paper)}
.egg-x{position:absolute;top:-14px;right:-14px;width:30px;height:30px;border-radius:50%;background:rgba(11,13,31,.9);border:1.5px solid rgba(245,239,226,.25);color:var(--paper);font-size:14px;cursor:pointer;display:grid;place-items:center}
.egg-fl .egg-x{top:-12px;right:-12px}
.egg-st{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:800;font-family:'Caveat',cursive;font-size:clamp(20px,3.5vw,32px);font-weight:700;color:var(--paper);text-align:center;max-width:min(500px,85vw);text-shadow:0 2px 12px rgba(0,0,0,.9);pointer-events:none;animation:egTxt 2.2s ease-out forwards}
.egg-shake{animation:egShk .85s ease-out}
.sparkle{position:absolute;width:14px;height:14px;pointer-events:auto;cursor:pointer;z-index:5;animation:spk 3.5s ease-in-out infinite;opacity:0}
@keyframes spk{0%,70%,100%{opacity:0;transform:scale(.5) rotate(0)}80%{opacity:.8;transform:scale(1) rotate(180deg)}90%{opacity:0;transform:scale(1.3) rotate(360deg)}}
.sparkle:hover{filter:brightness(2) drop-shadow(0 0 4px #c43f2e);transform:scale(1.5)}
.surp{position:absolute;pointer-events:none;z-index:7}
.surp svg{width:80px;height:80px;display:block;margin:-40px 0 0 -40px}
@keyframes anim-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@keyframes anim-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes anim-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes anim-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes anim-spin{to{transform:rotate(360deg)}}
@keyframes anim-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
@keyframes anim-popin{0%{opacity:0;transform:scale(.3)}60%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
</style>
</head><body>
<div class="hud">
  <div class="title">A Little <em>Hidden</em> Scene</div>
  <div style="display:flex;gap:8px;align-items:center">
    <button class="chip" id="panlck" title="Canvas pan: locked — click to unlock" style="padding:5px 10px;font-size:15px">🔒</button>
    <button class="chip" id="sfx">🔊</button>
    <div class="chip" id="ctr">found <b>0</b> / <span id="ttl">0</span></div>
  </div>
</div>
<div class="stage" id="stage">
  <div class="world" id="world">
    <div class="base" id="base"></div>
    <svg class="drawings" id="draw" viewBox="0 0 1600 1600" preserveAspectRatio="none"></svg>
    <div id="sprs"></div>
    <div id="hits"></div>
  </div>
</div>
<aside class="panel" id="list-p">
  <div class="phead"><h2>Find These</h2><button class="pclose" id="pc" title="Hide panel" aria-label="Hide panel">◁</button></div>
  <p class="hint">Drag to pan. Tap to find.</p>
  <ul id="lst"></ul>
</aside>
<button class="popen" id="po" title="Show find list" aria-label="Show find list">📋</button>
<div class="win" id="w"><div class="win-card"><h2>You found them all!</h2><button onclick="R()">play again</button><a class="win-attr" href="https://github.com/vipdiv/hidden-studio" target="_blank" rel="noopener noreferrer">Make your own with Hidden Studio &rsaquo;</a></div></div>
<a class="attr" href="https://github.com/vipdiv/hidden-studio" target="_blank" rel="noopener noreferrer">made with Hidden Studio</a>
<script>
const D = __PROJECT_DATA__;
const B = __BASE_LAYER__;
// Sanitize untrusted URLs from project data — allow data:image/*, http(s)://, blob:
const SAFE_IMAGE_URL_RE = new RegExp('^(data:image/|https?://|blob:)', 'i');
function safeUrl(u){if(!u)return '';const s=String(u).trim();return SAFE_IMAGE_URL_RE.test(s)?s:''}
// Apply document size
const W=D.docWidth||1600,H=D.docHeight||1600;
(function(){const w=document.getElementById('world');if(w){w.style.width=W+'px';w.style.height=H+'px';}
const d=document.getElementById('draw');if(d)d.setAttribute('viewBox','0 0 '+W+' '+H);})();
// Render base — SVG only used for built-in PLANET_SVG (trusted bundled content);
// user-uploaded images come through as data URLs in B.content
const base = document.getElementById('base');
if (B.type === 'svg') base.innerHTML = B.content;
else if (B.type === 'image'){const img=document.createElement('img');img.src=safeUrl(B.content);base.appendChild(img);}
(function(){
  const bi = base.firstElementChild; if (!bi) return;
  const t = D.baseTransform || {}, x = D.baseX || 0, y = D.baseY || 0;
  const tp = []; if (x||y) tp.push('translate('+x+'px,'+y+'px)');
  if (t.rotation) tp.push('rotate('+t.rotation+'deg)');
  const sx=(t.flipH?-1:1)*(t.scale||1), sy=(t.flipV?-1:1)*(t.scale||1);
  if (sx!==1||sy!==1) tp.push('scale('+sx+','+sy+')');
  if (tp.length) bi.style.transform=tp.join(' ');
  const fp=[];
  if (t.brightness&&t.brightness!==1) fp.push('brightness('+t.brightness+')');
  if (t.contrast&&t.contrast!==1) fp.push('contrast('+t.contrast+')');
  if (t.saturation&&t.saturation!==1) fp.push('saturate('+t.saturation+')');
  if (t.hue) fp.push('hue-rotate('+t.hue+'deg)');
  if (t.blur) fp.push('blur('+t.blur+'px)');
  if (t.grayscale) fp.push('grayscale('+t.grayscale+')');
  if (t.invert) fp.push('invert('+t.invert+')');
  if (fp.length) bi.style.filter=fp.join(' ');
})();
// Drawings
const dLayer = document.getElementById('draw');
(D.drawings || []).forEach(s => {
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  if(s.tx||s.ty) g.setAttribute('transform','translate('+(s.tx||0)+','+(s.ty||0)+')');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', s.d); p.setAttribute('stroke', s.color); p.setAttribute('stroke-width', s.width);
  p.setAttribute('stroke-linecap','round'); p.setAttribute('stroke-linejoin','round'); p.setAttribute('fill','none');
  if(s.dash){const w=s.width||3,gap=s.gap||8;p.setAttribute('stroke-dasharray',s.dash==='dot'?w+' '+gap:(w*4)+' '+gap);}
  g.appendChild(p); dLayer.appendChild(g);
});
// Sprites
const sprLayer = document.getElementById('sprs');
(D.sprites || []).forEach(s => {
  const el = document.createElement('div');
  el.className = 'sprite';
  const st = s.transform || {};
  const stp=[]; if(st.rotation) stp.push('rotate('+st.rotation+'deg)');
  const sfx=(st.flipH?-1:1),sfy=(st.flipV?-1:1); if(sfx!==1||sfy!==1) stp.push('scale('+sfx+','+sfy+')');
  const sfp=[];
  if(st.brightness&&st.brightness!==1) sfp.push('brightness('+st.brightness+')');
  if(st.contrast&&st.contrast!==1) sfp.push('contrast('+st.contrast+')');
  if(st.saturation&&st.saturation!==1) sfp.push('saturate('+st.saturation+')');
  if(st.hue) sfp.push('hue-rotate('+st.hue+'deg)');
  if(st.blur) sfp.push('blur('+st.blur+'px)');
  if(st.grayscale) sfp.push('grayscale('+st.grayscale+')');
  if(st.invert) sfp.push('invert('+st.invert+')');
  el.style.cssText = 'left:'+(s.x-s.w/2)+'px;top:'+(s.y-s.h/2)+'px;width:'+s.w+'px;height:'+s.h+'px;transform-origin:center;'
    +(stp.length?'transform:'+stp.join(' ')+';':'')
    +(sfp.length?'filter:'+sfp.join(' ')+';':'')
    +(st.opacity!=null&&st.opacity!==1?'opacity:'+st.opacity+';':'');
  if (s.imageData){const img=document.createElement('img');img.src=safeUrl(s.imageData);el.appendChild(img);}
  sprLayer.appendChild(el);
});
// Hit zones
const hitsLayer = document.getElementById('hits');
D.items.forEach(item => {
  const h = document.createElement('div');
  h.className = 'hit'; h.dataset.id = item.id;
  h.style.cssText = 'left:' + (item.x - item.r) + 'px;top:' + (item.y - item.r) + 'px;width:' + (item.r*2) + 'px;height:' + (item.r*2) + 'px;';
  hitsLayer.appendChild(h);
});
// Surprises (bonus hit zones — sparkles + reveal on tap, do not count toward "find all")
const SUR = D.surprises || [];
SUR.forEach(s => {
  const h = document.createElement('div');
  h.className = 'hit'; h.dataset.id = s.id; h.dataset.kind = 'surprise';
  h.style.cssText = 'left:' + (s.x - s.r) + 'px;top:' + (s.y - s.r) + 'px;width:' + (s.r*2) + 'px;height:' + (s.r*2) + 'px;';
  hitsLayer.appendChild(h);
});
document.getElementById('ttl').textContent = D.items.length;
// Surprise animation presets (mirrors animations.js PRESETS/LOOPING_NAMES)
const SURP_ANIM={wiggle:'anim-wiggle 1.4s ease-in-out infinite',bounce:'anim-bounce 1.2s cubic-bezier(.5,0,.5,1) infinite',float:'anim-float 3.2s ease-in-out infinite',pulse:'anim-pulse 1.6s ease-in-out infinite',spin:'anim-spin 6s linear infinite',shake:'anim-shake .6s ease-in-out infinite',pop:'anim-popin .5s cubic-bezier(.2,1.3,.4,1) forwards'};
const SURP_LOOPING=['wiggle','bounce','float','pulse','spin','shake','sway'];
// Game state
let found = new Set(), surF = new Set(), soundOn = true, audioCtx = null, panLocked = true;
function aud(){ if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}} if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume(); return audioCtx }
function sfxFound(){if(!soundOn)return;const c=aud();if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(880,t+.12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.35);}
function env(c,o,g,t,a,p,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(p,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);o.connect(g).connect(c.destination);o.start(t);o.stop(t+a+d+.05)}
function nz(c,dur,ff,ft,p){const t=c.currentTime,n=c.sampleRate*dur,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(n*.25));const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type=ft;f.frequency.setValueAtTime(ff,t);const g=c.createGain();g.gain.setValueAtTime(p,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(c.destination);s.start(t);s.stop(t+dur)}
const SFXP={
miss:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(90,t+.12);env(c,o,g,t,.01,.15,.17)},
pop:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(600,t);o.frequency.exponentialRampToValueAtTime(1200,t+.05);env(c,o,g,t,.005,.18,.08)},
ding:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(1760,t);env(c,o,g,t,.005,.18,.4)},
chirp:c=>{const t0=c.currentTime;[1800,2400,1800].forEach((f,i)=>{const t=t0+i*.08,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);env(c,o,g,t,.005,.15,.08)})},
splash:c=>nz(c,.3,1200,'bandpass',.25),
puff:c=>nz(c,.5,300,'lowpass',.2),
squeak:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.setValueAtTime(1400,t);o.frequency.exponentialRampToValueAtTime(2200,t+.06);o.frequency.exponentialRampToValueAtTime(1400,t+.12);env(c,o,g,t,.005,.08,.1)},
thud:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(60,t+.1);env(c,o,g,t,.005,.3,.15)},
bark:c=>{nz(c,.18,600,'bandpass',.3);const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(120,t+.1);env(c,o,g,t,.005,.18,.12)},
meow:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(720,t+.18);o.frequency.exponentialRampToValueAtTime(380,t+.36);env(c,o,g,t,.02,.18,.4)},
laugh:c=>{const t0=c.currentTime;[0,.09,.18,.27].forEach((dt,i)=>{const t=t0+dt,o=c.createOscillator(),g=c.createGain();o.type='triangle';const f=380+i*60;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.7,t+.06);env(c,o,g,t,.005,.18,.07)})},
oof:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(110,t+.18);env(c,o,g,t,.01,.28,.22);nz(c,.22,400,'lowpass',.12)},
zap:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(1800,t);o.frequency.exponentialRampToValueAtTime(120,t+.18);env(c,o,g,t,.002,.22,.18)},
drip:c=>{const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(2200,t);o.frequency.exponentialRampToValueAtTime(900,t+.12);env(c,o,g,t,.002,.18,.18)},
none:()=>{}
};
function sfxMiss(){if(!soundOn)return;if(D.missSound==='__custom__'&&D.missSoundData){try{const a=new Audio(D.missSoundData);a.volume=.85;a.play().catch(()=>{});return}catch(_){}}const c=aud();if(!c)return;(SFXP[D.missSound]||SFXP.miss)(c)}
function sfxPlay(name){if(!soundOn)return;const c=aud();if(!c)return;(SFXP[name]||SFXP.pop)(c)}
function sfxWin(){if(!soundOn)return;const c=aud();if(!c)return;[523,659,784,1047].forEach((f,i)=>{const t=c.currentTime+i*.12,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.4)})}
function buildList(){const ul=document.getElementById('lst');ul.innerHTML='';if(!D.items.length){const li=document.createElement('li');li.style.cssText='opacity:.5;font-style:italic;list-style:none;padding:4px 0';li.textContent='No hidden spots added yet.';ul.appendChild(li);return;}D.items.forEach(it=>{const li=document.createElement('li');li.id='l-'+it.id;const box=document.createElement('span');box.className='box';const lbl=document.createElement('span');lbl.className='label';lbl.textContent=it.name||'';li.appendChild(box);li.appendChild(lbl);if(found.has(it.id))li.classList.add('found');ul.appendChild(li)})}
function updateCtr(){document.getElementById('ctr').innerHTML='found <b>'+found.size+'</b> / '+D.items.length;if(D.items.length>0&&found.size===D.items.length){setTimeout(()=>{document.getElementById('w').classList.add('show');sfxWin();if(navigator.vibrate)navigator.vibrate([80,50,80,50,180])},500)}}
function addMark(it){const m=document.createElement('div');m.className='mark';m.style.cssText='left:'+(it.x-it.r*1.3)+'px;top:'+(it.y-it.r*1.3)+'px;width:'+(it.r*2.6)+'px;height:'+(it.r*2.6)+'px;';const r=(Math.random()*20-10).toFixed(1);m.innerHTML='<svg viewBox="0 0 100 100" style="transform:rotate('+r+'deg)"><circle cx="50" cy="50" r="44" transform="rotate('+(Math.random()*360)+' 50 50)"/></svg>';document.getElementById('world').appendChild(m)}
function pop(t,x,y,cls){const p=document.createElement('div');p.className=cls;p.textContent=t;p.style.left=x+'px';p.style.top=y+'px';document.getElementById('world').appendChild(p);setTimeout(()=>p.remove(),1500)}
function renderSparkles(){document.querySelectorAll('.sparkle').forEach(e=>e.remove());SUR.forEach(s=>{if(surF.has(s.id))return;const sp=document.createElement('div');sp.className='sparkle';sp.dataset.id=s.id;sp.style.left=(s.x-7)+'px';sp.style.top=(s.y-7)+'px';sp.innerHTML='<svg viewBox="0 0 14 14"><path d="M 7 0 L 8 6 L 14 7 L 8 8 L 7 14 L 6 8 L 0 7 L 6 6 Z" fill="#c43f2e" opacity="0.85"/></svg>';const loopA=(s.anim||[]).find(a=>SURP_LOOPING.includes(a));if(loopA&&SURP_ANIM[loopA]){sp.style.animation=SURP_ANIM[loopA];sp.style.opacity='1'}else{sp.style.animationDelay=(Math.random()*2)+'s'}document.getElementById('world').appendChild(sp)})}
function triggerSurprise(s){surF.add(s.id);document.querySelector('.sparkle[data-id="'+s.id+'"]')?.remove();const el=document.createElement('div');el.className='surp';el.style.left=s.x+'px';el.style.top=s.y+'px';el.innerHTML='<svg viewBox="0 0 100 100"><path d="M 50 0 L 58 42 L 100 50 L 58 58 L 50 100 L 42 58 L 0 50 L 42 42 Z" fill="#c43f2e"/></svg>';const anims=s.anim||['pop'];const loopA=anims.find(a=>SURP_LOOPING.includes(a));const shotA=anims.find(a=>!SURP_LOOPING.includes(a));el.style.animation=SURP_ANIM[shotA||loopA||'pop']||'anim-popin .5s cubic-bezier(.2,1.3,.4,1) forwards';if(loopA&&SURP_ANIM[loopA]&&!shotA){el.style.transformOrigin='center center'}document.getElementById('world').appendChild(el);const displayTime=loopA&&!shotA?2500:1700;setTimeout(()=>{el.remove();surF.delete(s.id);renderSparkles()},displayTime);sfxPlay(s.sound||'pop');if(navigator.vibrate)navigator.vibrate([20,30,40])}
// Camera
let camX=0,camY=0,scale=1;
function panelOpen(){const lp=document.getElementById('list-p');return lp&&!lp.classList.contains('hidden')&&innerWidth>640}
function panelW(){return panelOpen()?248:0}
function cScale(){const aw=innerWidth-panelW();return Math.min(aw*.92/W,(innerHeight-72)*.92/H)}
function clampC(){const pw=panelW(),sW=W*scale,sH=H*scale,aw=innerWidth-pw;camX=Math.max(pw+aw/2-sW+aw*.3,Math.min(pw+aw/2-aw*.3,camX));camY=Math.max(innerHeight/2-sH+innerHeight*.3,Math.min(innerHeight/2-innerHeight*.3,camY))}
function applyC(){clampC();document.getElementById('world').style.transform='translate('+camX+'px,'+camY+'px) scale('+scale+')'}
function center(){scale=cScale();const pw=panelW(),aw=innerWidth-pw;camX=pw+aw/2-W/2*scale;camY=innerHeight/2-H/2*scale;applyC()}
// Input
let drg=false,sx=0,sy=0,scX=0,scY=0,dd=0,cx=0,cy=0;
const stage=document.getElementById('stage');
function pt(e){if(e.touches&&e.touches[0])return{x:e.touches[0].clientX,y:e.touches[0].clientY};if(e.changedTouches&&e.changedTouches[0])return{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};return{x:e.clientX,y:e.clientY}}
function pd(e){const p=pt(e);drg=true;sx=p.x;sy=p.y;scX=camX;scY=camY;dd=0;cx=p.x;cy=p.y;stage.classList.add('grabbing')}
function pm(e){if(!drg)return;const p=pt(e),dx=p.x-sx,dy=p.y-sy;dd+=Math.abs(dx)+Math.abs(dy);if(!panLocked){camX=scX+dx;camY=scY+dy;applyC()}}
// Easter egg runtime
let egAudio=null,egOverlay=null,egEsc=null;
function egDismiss(){if(egAudio){egAudio.pause();egAudio.currentTime=0;egAudio=null}if(egOverlay){egOverlay.remove();egOverlay=null}if(egEsc){document.removeEventListener('keydown',egEsc);egEsc=null}document.removeEventListener('click',egDismiss)}
function egTrigger(egg){if(!egg||!egg.enabled)return;egDismiss();if(egg.audio){try{egAudio=new Audio(egg.audio);egAudio.loop=!!egg.loop;egAudio.volume=.85;egAudio.play().catch(()=>{})}catch(_){}}const vt=egg.visualType||'none';if(vt==='floating')egShowFloat(egg);else if(vt==='fullscreen')egShowFull(egg);else if(vt==='shake')egDoShake(egg);if(egg.dismissable&&vt!=='shake'){egEsc=(e)=>{if(e.key==='Escape')egDismiss()};document.addEventListener('keydown',egEsc)}}
function egClose(e){e.stopPropagation();egDismiss()}
function egCloseBtn(){const b=document.createElement('button');b.className='egg-x';b.textContent='✕';b.addEventListener('click',(e)=>{e.stopPropagation();egDismiss()});return b}
function egImg(url){const i=document.createElement('img');i.src=safeUrl(url);i.draggable=false;return i}
function egTxt(text){const d=document.createElement('div');d.className='eg-txt';d.textContent=text;return d}
function egShowFloat(egg){const vc=egg.visualContent||{};const el=document.createElement('div');el.className='egg-fl';if(egg.dismissable)el.appendChild(egCloseBtn());if(vc.image)el.appendChild(egImg(vc.image));if(vc.text)el.appendChild(egTxt(vc.text));const pos=vc.position||'center';if(pos==='bottom-right'){el.style.left='';el.style.top='';el.style.right='24px';el.style.bottom='24px';el.style.transform='none'}else if(pos==='random'){el.style.left=(10+Math.random()*55)+'%';el.style.top=(10+Math.random()*55)+'%'}document.body.appendChild(el);egOverlay=el;if(egg.dismissable)setTimeout(()=>document.addEventListener('click',(e)=>{if(!el.contains(e.target))egDismiss()},{once:true}),200)}
function egShowFull(egg){const vc=egg.visualContent||{};const el=document.createElement('div');el.className='egg-fs';const inner=document.createElement('div');inner.className='egg-in';if(egg.dismissable)inner.appendChild(egCloseBtn());if(vc.image)inner.appendChild(egImg(vc.image));if(vc.text)inner.appendChild(egTxt(vc.text));el.appendChild(inner);el.addEventListener('click',(e)=>{if(e.target===el)egDismiss()});document.body.appendChild(el);egOverlay=el}
function egDoShake(egg){const vc=egg.visualContent||{};stage.classList.add('egg-shake');setTimeout(()=>stage.classList.remove('egg-shake'),850);if(vc.text){const el=document.createElement('div');el.className='egg-st';el.textContent=vc.text;document.body.appendChild(el);egOverlay=el;setTimeout(()=>{if(egOverlay===el){el.remove();egOverlay=null}},2200)}if(egAudio&&!egg.loop)egAudio.addEventListener('ended',()=>{egAudio=null},{once:true})}
function pu(e){if(!drg)return;const tap=dd<6;drg=false;stage.classList.remove('grabbing');if(tap){const wx=(cx-camX)/scale,wy=(cy-camY)/scale;for(const s of SUR){if(surF.has(s.id))continue;const dx=wx-s.x,dy=wy-s.y;if(Math.sqrt(dx*dx+dy*dy)<s.r){if(s.easterEgg&&s.easterEgg.enabled){egTrigger(s.easterEgg);return}triggerSurprise(s);return}}let h=null;for(const it of D.items){if(found.has(it.id))continue;const dx=wx-it.x,dy=wy-it.y;if(Math.sqrt(dx*dx+dy*dy)<it.r){h=it;break}}if(h){if(h.easterEgg&&h.easterEgg.enabled){egTrigger(h.easterEgg);return}found.add(h.id);addMark(h);pop('found!',h.x,h.y-h.r-8,'pop');sfxFound();if(navigator.vibrate)navigator.vibrate([30,40,60]);document.getElementById('l-'+h.id)?.classList.add('found');updateCtr()}else{const m=['nope!','miss!','hmm'];pop(m[Math.floor(Math.random()*m.length)],wx,wy,'miss');sfxMiss();if(navigator.vibrate)navigator.vibrate(40)}}}
stage.addEventListener('mousedown',pd);addEventListener('mousemove',pm);addEventListener('mouseup',pu);
stage.addEventListener('touchstart',pd,{passive:true});addEventListener('touchmove',pm,{passive:true});addEventListener('touchend',pu);
document.getElementById('sfx').addEventListener('click',()=>{soundOn=!soundOn;document.getElementById('sfx').textContent=soundOn?'🔊':'🔇';if(soundOn)aud()});
document.getElementById('panlck').addEventListener('click',()=>{panLocked=!panLocked;const b=document.getElementById('panlck');b.textContent=panLocked?'🔒':'🔓';b.title=panLocked?'Canvas pan: locked — click to unlock':'Canvas pan: unlocked — click to lock';b.style.opacity=panLocked?'':'0.6'});
const lp=document.getElementById('list-p');
function isMob(){return innerWidth<=640}
document.getElementById('pc').addEventListener('click',()=>{if(isMob()){lp.classList.remove('open')}else{lp.classList.add('hidden')}center()});
document.getElementById('po').addEventListener('click',()=>{if(isMob()){lp.classList.add('open')}else{lp.classList.remove('hidden')}center()});
if(innerWidth<900&&!isMob())lp.classList.add('hidden');
// Mouse wheel / trackpad zoom — listen on document so the full window
// triggers zoom, but skip events that originate inside the find panel
// (so the panel can still scroll its list normally).
document.addEventListener('wheel',(e)=>{
  if(e.target.closest('#list-p'))return;
  e.preventDefault();
  const lineH=16,raw=e.deltaY*(e.deltaMode===1?lineH:e.deltaMode===2?innerHeight:1);
  const factor=Math.pow(1.001,-raw);
  const ns=Math.max(cScale()*0.5,Math.min(cScale()*6,scale*factor));
  if(ns===scale)return;
  const wx=(e.clientX-camX)/scale,wy=(e.clientY-camY)/scale;
  scale=ns;camX=e.clientX-wx*scale;camY=e.clientY-wy*scale;applyC();
},{passive:false});
// Recenter whenever the window resizes (covers orientation changes too)
addEventListener('resize',()=>{center()});
function R(){found=new Set();surF=new Set();document.querySelectorAll('.mark,.pop,.miss,.surp,.sparkle').forEach(e=>e.remove());document.getElementById('w').classList.remove('show');buildList();updateCtr();renderSparkles()}
window.R=R;
buildList();center();updateCtr();renderSparkles();
</script></body></html>`;

  return {
    list, get, create, update, remove, rename,
    setActive, getActive, clearActive,
    setStatusEl, scheduleAutosave, saveNow,
    markDirty, markClean,
    exportJson, importJson, exportHtml,
  };
})();
