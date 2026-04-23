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
    if (!all[id]) return null;
    data.meta = { ...(all[id].meta || {}), updatedAt: Date.now() };
    data.meta.id = id;
    all[id] = data;
    save(all);
    return data;
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

  function scheduleAutosave(data) {
    markDirty();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (data?.meta?.id) {
        update(data.meta.id, data);
        markClean();
      }
    }, AUTOSAVE_DELAY);
  }

  /* Force-save now */
  function saveNow(data) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (data?.meta?.id) {
      update(data.meta.id, data);
      markClean();
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
  function exportHtml(data) {
    const sceneInline = getInlineBaseLayer(data);
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

  function getInlineBaseLayer(data) {
    if (data.baseType === 'svg' && data.baseContent === 'PLANET_SVG') {
      return { type: 'svg', content: window.PLANET_SVG };
    }
    if (data.baseType === 'image' && data.baseContent) {
      return { type: 'image', content: data.baseContent };
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
.hit{position:absolute;border-radius:50%;cursor:pointer}
.mark{position:absolute;pointer-events:none;z-index:6;opacity:0;animation:di .6s ease-out forwards}
.mark svg{width:100%;height:100%;overflow:visible}
.mark circle{fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round;stroke-dasharray:300;stroke-dashoffset:300;animation:dc .6s ease-out forwards}
@keyframes di{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
@keyframes dc{to{stroke-dashoffset:0}}
.pop{position:absolute;font-family:'Caveat',cursive;font-size:28px;font-weight:700;color:var(--accent);pointer-events:none;z-index:7;text-shadow:0 0 8px var(--paper);animation:p 1.4s ease-out forwards}
.miss{position:absolute;font-family:'Caveat',cursive;font-size:22px;font-weight:700;color:var(--miss);pointer-events:none;z-index:7;text-shadow:0 0 6px var(--space);animation:m .5s ease-out forwards}
@keyframes p{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-14px) scale(1.1)}80%{opacity:1;transform:translate(-50%,-36px) scale(1)}100%{opacity:0;transform:translate(-50%,-58px) scale(1)}}
@keyframes m{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}60%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-60%)}}
.panel{position:fixed;top:58px;left:14px;width:220px;max-height:calc(100vh - 140px);overflow-y:auto;background:rgba(11,13,31,.9);border:1.5px solid rgba(245,239,226,.25);border-radius:4px 6px 3px 5px;padding:14px 16px;z-index:20;backdrop-filter:blur(6px)}
.panel h2{font-family:'Caveat',cursive;font-weight:700;font-size:22px;margin-bottom:4px}
.panel .hint{font-style:italic;font-size:12px;color:rgba(245,239,226,.7);margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed rgba(245,239,226,.3)}
.panel ul{list-style:none}
.panel li{font-family:'Caveat',cursive;font-size:17px;padding:3px 0;display:flex;align-items:center;gap:8px}
.panel li .box{width:14px;height:14px;border:1.2px solid var(--paper);border-radius:2px;display:grid;place-items:center}
.panel li.found{color:var(--found)}
.panel li.found .label{text-decoration:line-through;text-decoration-color:var(--accent)}
.panel li.found .box::after{content:"✓";color:var(--accent);font-size:16px;line-height:.5}
.win{position:fixed;inset:0;background:rgba(11,13,31,.85);backdrop-filter:blur(6px);display:grid;place-items:center;z-index:100;opacity:0;pointer-events:none;transition:opacity .5s}
.win.show{opacity:1;pointer-events:auto}
.win-card{background:var(--paper);color:var(--ink);border:2px solid var(--ink);border-radius:6px;padding:28px 40px;text-align:center;box-shadow:4px 6px 0 var(--accent);max-width:380px}
.win-card h2{font-family:'Caveat',cursive;font-size:38px;color:var(--accent);margin-bottom:8px}
.win-card button{font-family:'Caveat',cursive;font-size:17px;padding:6px 18px;border:1.5px solid var(--ink);background:transparent;border-radius:20px;cursor:pointer;margin-top:12px}
.drawings{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sprite{position:absolute;pointer-events:none}
.sprite img{width:100%;height:auto}
</style>
</head><body>
<div class="hud">
  <div class="title">A Little <em>Hidden</em> Scene</div>
  <div style="display:flex;gap:8px;align-items:center">
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
  <h2>Find These</h2>
  <p class="hint">Drag to pan. Tap to find.</p>
  <ul id="lst"></ul>
</aside>
<div class="win" id="w"><div class="win-card"><h2>You found them all!</h2><button onclick="R()">play again</button></div></div>
<script>
const D = __PROJECT_DATA__;
const B = __BASE_LAYER__;
// Transform builder (matches Transforms module)
function xfCss(t){if(!t)return {transform:'',filter:'',opacity:''};const p=[];if(t.rotation)p.push('rotate('+t.rotation+'deg)');const sx=(t.flipH?-1:1)*(t.scale||1);const sy=(t.flipV?-1:1)*(t.scale||1);if(sx!==1||sy!==1)p.push('scale('+sx+','+sy+')');const f=[];if(t.brightness!==undefined&&t.brightness!==1)f.push('brightness('+t.brightness+')');if(t.contrast!==undefined&&t.contrast!==1)f.push('contrast('+t.contrast+')');if(t.saturation!==undefined&&t.saturation!==1)f.push('saturate('+t.saturation+')');if(t.hue)f.push('hue-rotate('+t.hue+'deg)');if(t.blur)f.push('blur('+t.blur+'px)');if(t.grayscale)f.push('grayscale('+t.grayscale+')');if(t.invert)f.push('invert('+t.invert+')');const op=(t.opacity!==undefined&&t.opacity!==1)?String(t.opacity):'';return {transform:p.join(' '),filter:f.join(' '),opacity:op}}
// Render base
const base = document.getElementById('base');
if (B.type === 'svg') base.innerHTML = B.content;
else if (B.type === 'image') base.innerHTML = '<img src="' + B.content + '">';
// Apply base transform
if (D.baseTransform && base.firstElementChild) {
  const bx = xfCss(D.baseTransform);
  base.firstElementChild.style.transformOrigin = 'center center';
  base.firstElementChild.style.transform = bx.transform;
  base.firstElementChild.style.filter    = bx.filter;
  if (bx.opacity) base.firstElementChild.style.opacity = bx.opacity;
}
// Drawings
const dLayer = document.getElementById('draw');
(D.drawings || []).forEach(s => {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', s.d); p.setAttribute('stroke', s.color); p.setAttribute('stroke-width', s.width);
  p.setAttribute('stroke-linecap','round'); p.setAttribute('stroke-linejoin','round'); p.setAttribute('fill','none');
  dLayer.appendChild(p);
});
// Sprites (with full transforms)
const sprLayer = document.getElementById('sprs');
(D.sprites || []).forEach(s => {
  const el = document.createElement('div');
  el.className = 'sprite';
  const sx = xfCss(s.transform || {rotation: s.rotation || 0});
  el.style.cssText = 'left:' + (s.x - s.w/2) + 'px;top:' + (s.y - s.h/2) + 'px;width:' + s.w + 'px;height:' + s.h + 'px;transform:' + sx.transform + ';filter:' + sx.filter + ';' + (sx.opacity ? 'opacity:' + sx.opacity + ';' : '');
  if (s.imageData) el.innerHTML = '<img src="' + s.imageData + '">';
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
document.getElementById('ttl').textContent = D.items.length;
// Game state
let found = new Set(), soundOn = true, audioCtx = null;
function aud(){ if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}} if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume(); return audioCtx }
function sfxFound(){if(!soundOn)return;const c=aud();if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(880,t+.12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.35);}
function sfxMiss(){if(!soundOn)return;const c=aud();if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(90,t+.12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.15,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.2);}
function sfxWin(){if(!soundOn)return;const c=aud();if(!c)return;[523,659,784,1047].forEach((f,i)=>{const t=c.currentTime+i*.12,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.connect(g).connect(c.destination);o.start(t);o.stop(t+.4)})}
function buildList(){const ul=document.getElementById('lst');ul.innerHTML='';D.items.forEach(it=>{const li=document.createElement('li');li.id='l-'+it.id;li.innerHTML='<span class="box"></span><span class="label">'+it.name+'</span>';if(found.has(it.id))li.classList.add('found');ul.appendChild(li)})}
function updateCtr(){document.getElementById('ctr').innerHTML='found <b>'+found.size+'</b> / '+D.items.length;if(found.size===D.items.length){setTimeout(()=>{document.getElementById('w').classList.add('show');sfxWin();if(navigator.vibrate)navigator.vibrate([80,50,80,50,180])},500)}}
function addMark(it){const m=document.createElement('div');m.className='mark';m.style.cssText='left:'+(it.x-it.r*1.3)+'px;top:'+(it.y-it.r*1.3)+'px;width:'+(it.r*2.6)+'px;height:'+(it.r*2.6)+'px;';const r=(Math.random()*20-10).toFixed(1);m.innerHTML='<svg viewBox="0 0 100 100" style="transform:rotate('+r+'deg)"><circle cx="50" cy="50" r="44" transform="rotate('+(Math.random()*360)+' 50 50)"/></svg>';document.getElementById('world').appendChild(m)}
function pop(t,x,y,cls){const p=document.createElement('div');p.className=cls;p.textContent=t;p.style.left=x+'px';p.style.top=y+'px';document.getElementById('world').appendChild(p);setTimeout(()=>p.remove(),1500)}
// Camera
let camX=0,camY=0,scale=1;
function cScale(){return Math.min(innerWidth,innerHeight)*.85/900}
function clampC(){const sW=1600*scale,sH=1600*scale;camX=Math.max(innerWidth/2-sW+innerWidth*.3,Math.min(innerWidth/2-innerWidth*.3,camX));camY=Math.max(innerHeight/2-sH+innerHeight*.3,Math.min(innerHeight/2-innerHeight*.3,camY))}
function applyC(){clampC();document.getElementById('world').style.transform='translate('+camX+'px,'+camY+'px) scale('+scale+')'}
function center(){scale=cScale();camX=innerWidth/2-800*scale;camY=innerHeight/2-800*scale;applyC()}
// Input
let drg=false,sx=0,sy=0,scX=0,scY=0,dd=0,cx=0,cy=0;
const stage=document.getElementById('stage');
function pt(e){if(e.touches&&e.touches[0])return{x:e.touches[0].clientX,y:e.touches[0].clientY};if(e.changedTouches&&e.changedTouches[0])return{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};return{x:e.clientX,y:e.clientY}}
function pd(e){const p=pt(e);drg=true;sx=p.x;sy=p.y;scX=camX;scY=camY;dd=0;cx=p.x;cy=p.y;stage.classList.add('grabbing')}
function pm(e){if(!drg)return;const p=pt(e),dx=p.x-sx,dy=p.y-sy;dd+=Math.abs(dx)+Math.abs(dy);camX=scX+dx;camY=scY+dy;applyC()}
function pu(e){if(!drg)return;const tap=dd<6;drg=false;stage.classList.remove('grabbing');if(tap){const wx=(cx-camX)/scale,wy=(cy-camY)/scale;let h=null;for(const it of D.items){if(found.has(it.id))continue;const dx=wx-it.x,dy=wy-it.y;if(Math.sqrt(dx*dx+dy*dy)<it.r){h=it;break}}if(h){found.add(h.id);addMark(h);pop('found!',h.x,h.y-h.r-8,'pop');sfxFound();if(navigator.vibrate)navigator.vibrate([30,40,60]);document.getElementById('l-'+h.id)?.classList.add('found');updateCtr()}else{const m=['nope!','miss!','hmm'];pop(m[Math.floor(Math.random()*m.length)],wx,wy,'miss');sfxMiss();if(navigator.vibrate)navigator.vibrate(40)}}}
stage.addEventListener('mousedown',pd);addEventListener('mousemove',pm);addEventListener('mouseup',pu);
stage.addEventListener('touchstart',pd,{passive:true});addEventListener('touchmove',pm,{passive:true});addEventListener('touchend',pu);
document.getElementById('sfx').addEventListener('click',()=>{soundOn=!soundOn;document.getElementById('sfx').textContent=soundOn?'🔊':'🔇';if(soundOn)aud()});
addEventListener('resize',()=>{scale=cScale();applyC()});
function R(){found=new Set();document.querySelectorAll('.mark,.pop,.miss').forEach(e=>e.remove());document.getElementById('w').classList.remove('show');buildList();updateCtr()}
window.R=R;
buildList();center();updateCtr();
</script></body></html>`;

  return {
    list, get, create, update, remove, rename,
    setActive, getActive, clearActive,
    setStatusEl, scheduleAutosave, saveNow,
    markDirty, markClean,
    exportJson, importJson, exportHtml,
  };
})();
