// Hidden Studio — Panel Content Components
// LayersPanel, PropertiesPanel, ProjectPanel

const LayersPanel = () => {
  const [layers, setLayers] = React.useState([
    { id: 'l1', name: 'Base Layer', visible: true, locked: false, color: '#4488cc', expanded: false,
      sublayers: [
        { id: 's1', name: 'Planet SVG', visible: true, locked: false },
        { id: 's2', name: 'Original scan', visible: true, locked: false },
        { id: 's3', name: 'Upload image…', visible: true, locked: false },
      ]
    },
    { id: 'l2', name: 'Layers', visible: true, locked: false, color: '#44aa66', expanded: true,
      sublayers: [{ id: 's4', name: 'Base image', visible: true, locked: false }]
    },
    { id: 'l3', name: 'Missed Tap',  visible: true, locked: false, color: '#cc4444', expanded: false, sublayers: [] },
    { id: 'l4', name: 'Hit Zone',    visible: true, locked: false, color: '#ddaa22', expanded: false, sublayers: [] },
    { id: 'l5', name: 'Surprise',    visible: true, locked: false, color: '#aa44cc', expanded: false, sublayers: [] },
    { id: 'l6', name: 'Font',        visible: true, locked: false, color: '#cc8844', expanded: false, sublayers: [] },
    { id: 'l7', name: 'Text Color',  visible: true, locked: false, color: '#44aacc', expanded: false, sublayers: [] },
    { id: 'l8', name: 'Stroke Color',visible: true, locked: false, color: '#cc4488', expanded: false, sublayers: [] },
    { id: 'l9', name: 'Font Size',   visible: true, locked: false, color: '#88cc44', expanded: false, sublayers: [] },
    { id: 'l10', name: 'Font Color', visible: true, locked: false, color: '#cc6644', expanded: false, sublayers: [] },
  ]);
  const [selected, setSelected] = React.useState('l2');
  const [renaming, setRenaming] = React.useState(null);
  const [renameVal, setRenameVal] = React.useState('');
  const [dragOver, setDragOver] = React.useState(null);
  const dragId = React.useRef(null);
  const [layerOpts, setLayerOpts] = React.useState(null); // { layerId, name, color, show, lock, template, dim, dimAmt }

  const openLayerOpts = (e, layer) => {
    e.stopPropagation();
    setLayerOpts({ layerId: layer.id, name: layer.name, color: layer.color, show: layer.visible, lock: layer.locked, template: false, dim: false, dimAmt: 50 });
  };
  const saveLayerOpts = () => {
    if (!layerOpts) return;
    setLayers(p => p.map(l => l.id === layerOpts.layerId
      ? { ...l, name: layerOpts.name, color: layerOpts.color, visible: layerOpts.show, locked: layerOpts.lock }
      : l));
    setLayerOpts(null);
  };

  const LAYER_COLORS_MAP = {
    'Red': '#cc4444', 'Orange': '#e8931a', 'Yellow': '#ddaa22', 'Green': '#44aa66',
    'Blue': '#4488cc', 'Violet': '#aa44cc', 'Magenta': '#cc4488', 'Cyan': '#44aacc',
    'Gray': '#888888', 'Black': '#333333',
  };

  const toggle = (id, field, isSub, pid) => {
    if (isSub) {
      setLayers(p => p.map(l => l.id === pid ? { ...l, sublayers: l.sublayers.map(s => s.id === id ? { ...s, [field]: !s[field] } : s) } : l));
    } else {
      setLayers(p => p.map(l => l.id === id ? { ...l, [field]: !l[field] } : l));
    }
  };

  const finishRename = () => {
    if (renaming) setLayers(p => p.map(l => l.id === renaming ? { ...l, name: renameVal } : l));
    setRenaming(null);
  };

  const EyeBtn = ({ visible, onClick }) => (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
        {visible
          ? <><path d="M6 1C3 1 1 4 1 4s2 3 5 3 5-3 5-3-2-3-5-3z" stroke={visible ? '#c0c0c0' : '#555'} strokeWidth="1" fill="none"/><circle cx="6" cy="4" r="1.5" fill={visible ? '#c0c0c0' : '#555'}/></>
          : <><path d="M6 1C3 1 1 4 1 4s2 3 5 3 5-3 5-3-2-3-5-3z" stroke="#555" strokeWidth="1" fill="none"/><line x1="2" y1="1" x2="10" y2="7" stroke="#555" strokeWidth="1"/></>
        }
      </svg>
    </button>
  );

  const LockBtn = ({ locked, onClick }) => (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
        <rect x="1.5" y="5" width="7" height="6" rx="1" stroke={locked ? '#e8931a' : '#555'} strokeWidth="1" fill="none"/>
        <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke={locked ? '#e8931a' : '#555'} strokeWidth="1" fill="none"/>
      </svg>
    </button>
  );

  const rowBase = (selected, bg) => ({
    display: 'flex', alignItems: 'center', padding: '3px 6px 3px 2px',
    background: bg || (selected ? '#0a4d8a' : 'transparent'),
    cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.12)',
    transition: 'background 0.08s',
  });

  const [search, setSearch] = React.useState('');
  const filteredLayers = layers.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ fontSize: 12, color: '#d0d0d0', fontFamily: 'inherit' }}>
      {/* Search */}
      <div style={{ padding: '5px 6px', borderBottom: '1px solid #3a3a3a', background: '#2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1a1a', border: '1px solid #484848', borderRadius: 2, padding: '2px 7px' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="4" cy="4" r="3" stroke="#666" strokeWidth="1"/><line x1="6.5" y1="6.5" x2="9" y2="9" stroke="#666" strokeWidth="1" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search layers…"
            style={{ background: 'none', border: 'none', color: '#d0d0d0', fontSize: 11, outline: 'none', flex: 1, padding: 0 }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>}
        </div>
      </div>
      {filteredLayers.map((layer) => (
        <div key={layer.id}
          draggable
          onDragStart={() => { dragId.current = layer.id; }}
          onDragEnd={() => { dragId.current = null; setDragOver(null); }}
          onDragOver={e => { e.preventDefault(); setDragOver(layer.id); }}
          onDrop={() => {
            if (!dragId.current || dragId.current === layer.id) return;
            setLayers(prev => {
              const from = prev.findIndex(l => l.id === dragId.current);
              const to = prev.findIndex(l => l.id === layer.id);
              const arr = [...prev];
              const [item] = arr.splice(from, 1);
              arr.splice(to, 0, item);
              return arr;
            });
            setDragOver(null);
          }}
        >
          {/* Layer row */}
          <div
            style={rowBase(selected === layer.id, dragOver === layer.id ? '#1a3a5a' : selected === layer.id ? '#0a4d8a' : undefined)}
            onClick={() => setSelected(layer.id)}
            onMouseEnter={e => { if (selected !== layer.id) e.currentTarget.style.background = '#2a2a2a'; }}
            onMouseLeave={e => { if (selected !== layer.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <EyeBtn visible={layer.visible} onClick={e => { e.stopPropagation(); toggle(layer.id, 'visible'); }} />
            <LockBtn locked={layer.locked} onClick={e => { e.stopPropagation(); toggle(layer.id, 'locked'); }} />
            {/* color bar */}
            <div style={{ width: 3, height: 20, background: layer.color, borderRadius: 1, flexShrink: 0, marginRight: 4, marginLeft: 2 }} />
            {/* expand arrow */}
            <span
              onClick={e => { e.stopPropagation(); if (layer.sublayers.length) toggle(layer.id, 'expanded'); }}
              style={{ color: '#777', fontSize: 8, width: 12, flexShrink: 0, cursor: layer.sublayers.length ? 'pointer' : 'default', userSelect: 'none' }}
            >
              {layer.sublayers.length ? (layer.expanded ? '▼' : '▶') : ''}
            </span>
            {/* thumbnail — double-click for Layer Options */}
            <div onDoubleClick={e => openLayerOpts(e, layer)} style={{ width: 18, height: 18, background: layer.color + '33', border: `2px solid ${layer.color}`, borderRadius: 2, flexShrink: 0, marginRight: 6, cursor: 'pointer' }} />
            {/* name */}
            {renaming === layer.id ? (
              <input autoFocus maxLength={64} value={renameVal} onChange={e => setRenameVal(e.target.value)}
                onBlur={finishRename} onKeyDown={e => e.key === 'Enter' && finishRename()}
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #4a8acc', color: '#fff', padding: '1px 4px', fontSize: 12, outline: 'none', borderRadius: 1 }} />
            ) : (
              <span onDoubleClick={e => { e.stopPropagation(); setRenaming(layer.id); setRenameVal(layer.name); }}
                style={{ flex: 1, color: layer.visible ? '#d0d0d0' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {layer.name}
              </span>
            )}
            <div style={{ width: 12, height: 12, border: '1px solid #555', borderRadius: '50%', flexShrink: 0, marginLeft: 4 }} />
          </div>

          {/* Sublayers */}
          {layer.expanded && layer.sublayers.map(sub => (
            <div key={sub.id} style={{ ...rowBase(selected === sub.id), paddingLeft: 34 }}
              onClick={() => setSelected(sub.id)}
              onMouseEnter={e => { if (selected !== sub.id) e.currentTarget.style.background = '#252525'; }}
              onMouseLeave={e => { if (selected !== sub.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <EyeBtn visible={sub.visible} onClick={e => { e.stopPropagation(); toggle(sub.id, 'visible', true, layer.id); }} />
              <div style={{ width: 3, height: 16, background: layer.color, opacity: 0.6, borderRadius: 1, flexShrink: 0, marginRight: 4, marginLeft: 2 }} />
              <div style={{ width: 14, height: 14, background: '#252525', border: `1px solid ${layer.color}33`, borderRadius: 1, flexShrink: 0, marginRight: 6 }} />
              <span style={{ flex: 1, fontSize: 11, color: sub.visible ? '#b8b8b8' : '#555', fontStyle: 'italic' }}>{sub.name}</span>
              <div style={{ width: 10, height: 10, border: '1px solid #4a4a4a', borderRadius: '50%', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      ))}

      {/* Layer Options Dialog */}
      {layerOpts && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLayerOpts(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#3a3a3a', border: '1px solid #555', borderRadius: 4, width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', fontFamily: 'inherit', fontSize: 12, color: '#d0d0d0' }}>
            {/* Title bar */}
            <div style={{ background: '#2a2a2a', borderBottom: '1px solid #484848', padding: '7px 12px', fontSize: 12, fontWeight: 600 }}>Layer Options</div>
            <div style={{ padding: '14px 16px' }}>
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#aaa', minWidth: 44 }}>Name:</span>
                <input autoFocus maxLength={64} value={layerOpts.name} onChange={e => setLayerOpts(p => ({...p, name: e.target.value}))}
                  style={{ flex: 1, background: '#1a1a1a', border: '1px solid #4a8acc', color: '#fff', padding: '4px 7px', fontSize: 12, outline: 'none', borderRadius: 2 }} />
              </div>
              {/* Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ color: '#aaa', minWidth: 44 }}>Color:</span>
                <select value={Object.entries(LAYER_COLORS_MAP).find(([,v]) => v === layerOpts.color)?.[0] || 'Blue'}
                  onChange={e => setLayerOpts(p => ({...p, color: LAYER_COLORS_MAP[e.target.value]}))}
                  style={{ flex: 1, background: '#1a1a1a', border: '1px solid #484848', color: '#d0d0d0', padding: '3px 6px', borderRadius: 2, fontSize: 12, outline: 'none' }}>
                  {Object.keys(LAYER_COLORS_MAP).map(c => <option key={c}>{c}</option>)}
                </select>
                <div style={{ width: 24, height: 20, background: layerOpts.color, border: '1px solid #666', borderRadius: 2, flexShrink: 0 }} />
              </div>
              {/* Checkboxes grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 14 }}>
                {[['template', 'Template'], ['lock', 'Lock'], ['show', 'Show'], ['dim', 'Dim Images']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#c0c0c0' }}>
                    <input type="checkbox" checked={!!layerOpts[key]} onChange={e => setLayerOpts(p => ({...p, [key]: e.target.checked}))}
                      style={{ accentColor: '#4a8acc', width: 12, height: 12 }} />
                    {label}
                    {key === 'dim' && layerOpts.dim && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                        to:
                        <input type="number" min={0} max={100} value={layerOpts.dimAmt}
                          onChange={e => setLayerOpts(p => ({...p, dimAmt: Math.min(100, Math.max(0, +e.target.value))}))}
                          style={{ width: 38, background: '#1a1a1a', border: '1px solid #484848', color: '#d0d0d0', padding: '1px 4px', fontSize: 11, outline: 'none', borderRadius: 2 }} />
                        <span style={{ color: '#888', fontSize: 11 }}>%</span>
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button onClick={saveLayerOpts} style={{ background: '#3a3a3a', border: '1px solid #666', color: '#d0d0d0', padding: '5px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#4a4a4a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#3a3a3a'}>OK</button>
                <button onClick={() => setLayerOpts(null)} style={{ background: '#3a3a3a', border: '1px solid #666', color: '#d0d0d0', padding: '5px 18px', borderRadius: 12, cursor: 'pointer', fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#4a4a4a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#3a3a3a'}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderTop: '1px solid #404040', background: '#2a2a2a' }}>
        <span style={{ color: '#888', fontSize: 11 }}>{layers.length} layers</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            ['↗', 'Move to artboard'], ['🔍', 'Find'], ['🖼', 'Clipping mask'],
            ['⊕', 'New sublayer'], ['⊞', 'New layer'], ['🗑', 'Delete'],
          ].map(([icon, title]) => (
            <button key={icon} title={title} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px 4px', fontSize: 12, borderRadius: 2 }}
              onMouseEnter={e => e.target.style.color = '#d0d0d0'}
              onMouseLeave={e => e.target.style.color = '#888'}
            >{icon}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── PROPERTIES PANEL ──────────────────────────────────────────────────────────
const PropertiesPanel = () => {
  const SECS = [
    { key: 'missedTap', label: 'Missed Tap', color: '#cc4444' },
  ];
  const [open, setOpen] = React.useState({ missedTap: true });
  const [vals, setVals] = React.useState({
    missedTap: { sound: 'miss', textColor: '#ffffff', strokeColor: '#001a4a', fontSize: 24, font: 'Caveat (handwriting)' },
  });

  const set = (k, f, v) => setVals(p => ({ ...p, [k]: { ...p[k], [f]: v } }));

  const sel = { background: '#2a2a2a', border: '1px solid #484848', color: '#d0d0d0', padding: '3px 6px', borderRadius: 2, fontSize: 12, outline: 'none', flex: 1, minWidth: 0 };
  const lbl = { color: '#8a8a8a', fontSize: 11, minWidth: 74, flexShrink: 0 };
  const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 };

  return (
    <div style={{ fontSize: 12, color: '#d0d0d0' }}>
      {SECS.map(({ key, label, color }) => {
        const v = vals[key];
        const isOpen = open[key];
        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#2e2e2e', borderBottom: '1px solid #3a3a3a' }}>
              <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
              <span style={{ flex: 1, fontWeight: 500, fontSize: 12 }}>{label}</span>
            </div>
            {isOpen && (
              <div style={{ padding: '8px 12px', background: '#363636', borderBottom: '1px solid #3a3a3a' }}>
                <div style={row}>
                  <span style={lbl}>Sound</span>
                  <select value={v.sound} onChange={e => set(key, 'sound', e.target.value)} style={sel}>
                    <option>miss</option><option>buzz</option><option>thud</option><option>pop</option><option>none</option>
                  </select>
                </div>
                <div style={row}>
                  <span style={lbl}>Text color</span>
                  <div style={{ width: 28, height: 18, background: v.textColor, border: '1px solid #555', borderRadius: 2, cursor: 'pointer', flexShrink: 0 }} />
                </div>
                <div style={row}>
                  <span style={lbl}>Stroke color</span>
                  <div style={{ width: 28, height: 18, background: v.strokeColor, border: '1px solid #555', borderRadius: 2, cursor: 'pointer', flexShrink: 0 }} />
                </div>
                <div style={row}>
                  <span style={lbl}>Font size</span>
                  <input type="range" min={8} max={72} value={v.fontSize} onChange={e => set(key, 'fontSize', +e.target.value)}
                    style={{ flex: 1, accentColor: '#4a8acc' }} />
                  <span style={{ color: '#d0d0d0', fontSize: 11, minWidth: 34, textAlign: 'right' }}>{v.fontSize} px</span>
                </div>
                <div style={row}>
                  <span style={lbl}>Font</span>
                  <select value={v.font} onChange={e => set(key, 'font', e.target.value)} style={{ ...sel, fontSize: 11 }}>
                    <option>Caveat (handwriting)</option>
                    <option>Patrick Hand</option>
                    <option>Roboto</option>
                    <option>Georgia</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── PROJECT PANEL ─────────────────────────────────────────────────────────────
const ProjectPanel = ({ name: nameProp, onNameChange }) => {
  const [name, setName] = React.useState(nameProp || 'New Project');
  const handleNameChange = (v) => { setName(v); if (onNameChange) onNameChange(v); };
  const [docW, setDocW] = React.useState(1920);
  const [docH, setDocH] = React.useState(1080);

  const inp = { background: '#2a2a2a', border: '1px solid #484848', color: '#d0d0d0', padding: '4px 6px', borderRadius: 2, fontSize: 12, outline: 'none', minWidth: 0, flex: 1 };
  const lbl = { display: 'block', color: '#8a8a8a', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 };
  const btn = (v) => ({
    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 3, fontSize: 12, padding: '6px 10px', marginBottom: 4,
    background: v === 'danger' ? '#3a1818' : v === 'primary' ? '#1a3050' : '#383838',
    border: `1px solid ${v === 'danger' ? '#5a2828' : v === 'primary' ? '#2a50a0' : '#4a4a4a'}`,
    color: v === 'danger' ? '#e07070' : v === 'primary' ? '#70aaff' : '#d0d0d0',
  });

  return (
    <div style={{ padding: 10, fontSize: 12, color: '#d0d0d0' }}>
      <span style={lbl}>Rename</span>
      <input style={{ ...inp, width: '100%', boxSizing: 'border-box', flex: 'none', marginBottom: 10 }} maxLength={80} value={name} onChange={e => handleNameChange(e.target.value)} />

      <span style={lbl}>Document Size</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>W</span><input style={inp} type="number" value={docW} onChange={e => setDocW(Math.min(9999, Math.max(1, +e.target.value)))} />
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>H</span><input style={inp} type="number" value={docH} onChange={e => setDocH(Math.min(9999, Math.max(1, +e.target.value)))} />
      </div>

      <span style={lbl}>Project Size</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>W</span><input style={{ ...inp, color: '#666' }} type="number" value={docW} readOnly />
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>H</span><input style={{ ...inp, color: '#666' }} type="number" value={docH} readOnly />
      </div>

      <div style={{ borderTop: '1px solid #404040', margin: '0 0 8px' }} />
      <button style={btn()}>Export JSON</button>
      <button style={btn('primary')}>Export as playable HTML</button>
      <div style={{ borderTop: '1px solid #404040', margin: '8px 0' }} />
      <button style={btn('danger')}>Clear drawings</button>
    </div>
  );
};

// ─── STANDALONE SECTION PANELS ────────────────────────────────────────────────
const makeSectionPanel = (key, label, color, defaults) => () => {
  const [v, setV] = React.useState(defaults);
  const set = (f, val) => setV(p => ({ ...p, [f]: val }));
  const sel = { background: '#2a2a2a', border: '1px solid #484848', color: '#d0d0d0', padding: '3px 6px', borderRadius: 2, fontSize: 12, outline: 'none', flex: 1, minWidth: 0 };
  const lbl = { color: '#8a8a8a', fontSize: 11, minWidth: 74, flexShrink: 0 };
  const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 };
  return (
    <div style={{ fontSize: 12, color: '#d0d0d0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px', borderBottom: '1px solid #3a3a3a', background: '#2e2e2e' }}>
        <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
        <span style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <div style={row}>
          <span style={lbl}>Sound</span>
          <select value={v.sound} onChange={e => set('sound', e.target.value)} style={sel}>
            <option>miss</option><option>buzz</option><option>thud</option><option>pop</option><option>none</option>
          </select>
        </div>
        <div style={row}>
          <span style={lbl}>Text color</span>
          <div style={{ width: 28, height: 18, background: v.textColor, border: '1px solid #555', borderRadius: 2, cursor: 'pointer' }} />
        </div>
        <div style={row}>
          <span style={lbl}>Stroke color</span>
          <div style={{ width: 28, height: 18, background: v.strokeColor, border: '1px solid #555', borderRadius: 2, cursor: 'pointer' }} />
        </div>
        <div style={row}>
          <span style={lbl}>Font size</span>
          <input type="range" min={8} max={72} value={v.fontSize} onChange={e => set('fontSize', Math.min(72, Math.max(8, +e.target.value)))} style={{ flex: 1, accentColor: '#4a8acc' }} />
          <span style={{ color: '#d0d0d0', fontSize: 11, minWidth: 34, textAlign: 'right' }}>{v.fontSize} px</span>
        </div>
        <div style={row}>
          <span style={lbl}>Font</span>
          <select value={v.font} onChange={e => set('font', e.target.value)} style={{ ...sel, fontSize: 11 }}>
            <option>Caveat (handwriting)</option><option>Patrick Hand</option><option>Roboto</option><option>Georgia</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const HitZonePanel  = makeSectionPanel('hitZone',  'Hit Zone',  '#ddaa22', { sound: 'hit',  textColor: '#ffff88', strokeColor: '#884400', fontSize: 24, font: 'Caveat (handwriting)' });
const SurprisePanel = makeSectionPanel('surprise', 'Surprise',  '#aa44cc', { sound: 'pop',  textColor: '#ff88ff', strokeColor: '#440088', fontSize: 24, font: 'Caveat (handwriting)' });

// ─── TRANSFORM PANEL ──────────────────────────────────────────────────────────
const TransformPanel = () => {
  const [v, setV] = React.useState({ x: 0, y: 0, w: 200, h: 150, angle: 0, lock: true });
  const set = (f, val) => setV(p => ({ ...p, [f]: val }));
  const inp = { background: '#2a2a2a', border: '1px solid #484848', color: '#d0d0d0', padding: '3px 6px', borderRadius: 2, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { color: '#8a8a8a', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 3 };
  const Field = ({ label, k, unit }) => (
    <div style={{ flex: 1 }}>
      <span style={lbl}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input type="number" value={v[k]} onChange={e => set(k, +e.target.value)} style={{ ...inp, paddingRight: unit ? 22 : 6 }} />
        {unit && <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: 10, pointerEvents: 'none' }}>{unit}</span>}
      </div>
    </div>
  );
  return (
    <div style={{ padding: '10px 10px 8px', fontSize: 12, color: '#d0d0d0' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 8 }}>
        <Field label="X" k="x" unit="px" /><Field label="W" k="w" unit="px" />
        <button onClick={() => set('lock', !v.lock)} style={{ background: 'none', border: '1px solid #484848', color: v.lock ? '#e8931a' : '#555', borderRadius: 2, cursor: 'pointer', padding: '2px 5px', fontSize: 12, alignSelf: 'flex-end', height: 24, flexShrink: 0 }}>{v.lock ? '⊠' : '⊡'}</button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 10 }}>
        <Field label="Y" k="y" unit="px" /><Field label="H" k="h" unit="px" />
        <div style={{ width: 27, flexShrink: 0 }} />
      </div>
      <div style={{ borderTop: '1px solid #404040', paddingTop: 8 }}>
        <span style={lbl}>Rotation</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="range" min={-180} max={180} value={v.angle} onChange={e => set('angle', +e.target.value)} style={{ flex: 1, accentColor: '#4a8acc' }} />
          <input type="number" value={v.angle} onChange={e => set('angle', +e.target.value)} style={{ ...inp, width: 48, flex: 'none' }} />
          <span style={{ color: '#666', fontSize: 11 }}>°</span>
        </div>
      </div>
    </div>
  );
};

// ─── SWATCHES PANEL ───────────────────────────────────────────────────────────
const SwatchesPanel = () => {
  const DEFAULT_SWATCHES = [
    '#cc4444','#e8931a','#ddaa22','#88cc44','#44aa66',
    '#44aacc','#4488cc','#aa44cc','#cc4488','#888888',
    '#ffffff','#dddddd','#aaaaaa','#666666','#333333',
    '#001a4a','#ffff88','#ff88ff','#88ffff','#000000',
  ];
  const [swatches, setSwatches] = React.useState(DEFAULT_SWATCHES);
  const [selected, setSelected] = React.useState('#cc4444');
  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, background: selected, border: '2px solid #666', borderRadius: 3, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#8a8a8a', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Selected</div>
          <input value={selected} onChange={e => setSelected(e.target.value)}
            style={{ background: '#2a2a2a', border: '1px solid #484848', color: '#d0d0d0', padding: '2px 6px', borderRadius: 2, fontSize: 11, outline: 'none', width: '100%' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, marginBottom: 8 }}>
        {swatches.map((c, i) => (
          <div key={i} onClick={() => setSelected(c)} title={c}
            style={{ width: '100%', paddingBottom: '100%', background: c, border: selected === c ? '2px solid #fff' : '1px solid #555', borderRadius: 2, cursor: 'pointer' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={{ flex: 1, background: '#2e2e2e', border: '1px solid #484848', color: '#d0d0d0', padding: '4px', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>New</button>
        <button onClick={() => setSwatches(DEFAULT_SWATCHES)} style={{ flex: 1, background: '#2e2e2e', border: '1px solid #484848', color: '#d0d0d0', padding: '4px', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}>Reset</button>
      </div>
    </div>
  );
};

// ─── HISTORY PANEL ────────────────────────────────────────────────────────────
const HistoryPanel = () => {
  const ACTIONS = ['Open document','Add layer: Hit Zone','Set color #cc4444','Move object','Resize object','Add layer: Surprise','Set font size 24px','Draw path','Delete anchor','Move object','Set stroke color','Rename layer'];
  const [current, setCurrent] = React.useState(ACTIONS.length - 1);
  return (
    <div style={{ fontSize: 12, color: '#d0d0d0' }}>
      <div style={{ padding: '4px 8px', background: '#2a2a2a', borderBottom: '1px solid #3a3a3a', color: '#888', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {current + 1} / {ACTIONS.length} states
      </div>
      {ACTIONS.map((action, i) => (
        <div key={i} onClick={() => setCurrent(i)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', cursor: 'pointer', background: i === current ? '#0a4d8a' : i > current ? '#1e1e1e' : 'transparent', color: i > current ? '#555' : '#d0d0d0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
          onMouseEnter={e => { if (i !== current) e.currentTarget.style.background = '#2a2a2a'; }}
          onMouseLeave={e => { e.currentTarget.style.background = i === current ? '#0a4d8a' : i > current ? '#1e1e1e' : 'transparent'; }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: i <= current ? '#4a8acc' : '#333', border: '1px solid ' + (i <= current ? '#4a8acc' : '#444'), flexShrink: 0 }} />
          {action}
        </div>
      ))}
    </div>
  );
};

// ─── NAVIGATOR PANEL ──────────────────────────────────────────────────────────
const NavigatorPanel = () => {
  const [viewPos, setViewPos] = React.useState({ x: 30, y: 20 });
  const [zoomPct, setZoomPct] = React.useState(100);
  const handleClick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    setViewPos({ x: Math.max(0, Math.min(60, ((e.clientX - r.left) / r.width) * 100 - 20)), y: Math.max(0, Math.min(50, ((e.clientY - r.top) / r.height) * 100 - 25)) });
  };
  return (
    <div style={{ padding: 8 }}>
      <div onClick={handleClick} style={{ background: '#1a1a1a', border: '1px solid #484848', borderRadius: 2, position: 'relative', marginBottom: 8, height: 96, overflow: 'hidden', cursor: 'crosshair' }}>
        <div style={{ position: 'absolute', left: '18%', top: '12%', width: '22%', height: '28%', background: '#4488cc', borderRadius: 1, opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: '52%', top: '38%', width: '18%', height: '22%', background: '#cc4444', borderRadius: 1, opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: '32%', top: '52%', width: '14%', height: '18%', background: '#ddaa22', borderRadius: 1, opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: `${viewPos.x}%`, top: `${viewPos.y}%`, width: '40%', height: '50%', border: '1px solid #e8931a', background: 'rgba(232,147,26,0.08)', pointerEvents: 'none' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#666', fontSize: 10 }}>12%</span>
        <input type="range" min={12} max={800} value={zoomPct} onChange={e => setZoomPct(+e.target.value)} style={{ flex: 1, accentColor: '#4a8acc' }} />
        <span style={{ color: '#666', fontSize: 10 }}>800%</span>
        <input type="number" value={zoomPct} onChange={e => setZoomPct(+e.target.value)}
          style={{ width: 42, background: '#2a2a2a', border: '1px solid #484848', color: '#d0d0d0', padding: '2px 4px', borderRadius: 2, fontSize: 11, outline: 'none' }} />
        <span style={{ color: '#666', fontSize: 10 }}>%</span>
      </div>
    </div>
  );
};

// ─── DIFFICULTY PANEL ─────────────────────────────────────────────────────────
const DifficultyPanel = () => {
  const [diff, setDiff] = React.useState('medium');
  const [timeLimit, setTimeLimit] = React.useState(120);
  const [hints, setHints] = React.useState(3);
  const [showTimer, setShowTimer] = React.useState(true);
  const [objectCount, setObjectCount] = React.useState(10);
  const lbl = { color: '#8a8a8a', fontSize: 11, minWidth: 82, flexShrink: 0 };
  const row = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 };
  const DIFFS = [['easy','#44aa66'],['medium','#ddaa22'],['hard','#cc4444']];
  return (
    <div style={{ padding: 10, fontSize: 12, color: '#d0d0d0' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#8a8a8a', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Difficulty Preset</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {DIFFS.map(([d, c]) => (
            <button key={d} onClick={() => setDiff(d)} style={{ flex: 1, padding: '6px 4px', background: diff === d ? c + '33' : '#2e2e2e', border: `1px solid ${diff === d ? c : '#484848'}`, color: diff === d ? c : '#888', borderRadius: 3, cursor: 'pointer', fontSize: 11, textTransform: 'capitalize', fontWeight: diff === d ? 700 : 400 }}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div style={row}>
        <span style={lbl}>Objects</span>
        <input type="range" min={1} max={30} value={objectCount} onChange={e => setObjectCount(+e.target.value)} style={{ flex: 1, accentColor: '#4a8acc' }} />
        <span style={{ color: '#d0d0d0', fontSize: 11, minWidth: 24, textAlign: 'right' }}>{objectCount}</span>
      </div>
      <div style={row}>
        <span style={lbl}>Time limit</span>
        <input type="range" min={0} max={300} value={timeLimit} onChange={e => setTimeLimit(+e.target.value)} style={{ flex: 1, accentColor: '#4a8acc' }} />
        <span style={{ color: '#d0d0d0', fontSize: 11, minWidth: 34, textAlign: 'right' }}>{timeLimit > 0 ? `${timeLimit}s` : '∞'}</span>
      </div>
      <div style={row}>
        <span style={lbl}>Hints allowed</span>
        <input type="range" min={0} max={10} value={hints} onChange={e => setHints(+e.target.value)} style={{ flex: 1, accentColor: '#4a8acc' }} />
        <span style={{ color: '#d0d0d0', fontSize: 11, minWidth: 24, textAlign: 'right' }}>{hints === 0 ? '∞' : hints}</span>
      </div>
      <div style={{ ...row, marginBottom: 0 }}>
        <span style={lbl}>Show timer</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={showTimer} onChange={e => setShowTimer(e.target.checked)} style={{ accentColor: '#4a8acc', width: 13, height: 13 }} />
          <span style={{ color: '#c0c0c0', fontSize: 11 }}>{showTimer ? 'Visible' : 'Hidden'}</span>
        </label>
      </div>
    </div>
  );
};

// ─── Settings Modal Component ─────────────────────────────────────────────────
const SettingsModal = ({ onClose, enabledPanels, setEnabledPanels, panelDefs }) => {
  const [autoSave, setAutoSave] = React.useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = React.useState(5);
  const [defaultW, setDefaultW] = React.useState(1920);
  const [defaultH, setDefaultH] = React.useState(1080);
  const [gridSize, setGridSize] = React.useState(40);
  const [exportFormat, setExportFormat] = React.useState('html');
  const [minify, setMinify] = React.useState(false);
  const [defaultDiff, setDefaultDiff] = React.useState('medium');
  const [defaultFont, setDefaultFont] = React.useState('Caveat (handwriting)');
  const [renderQuality, setRenderQuality] = React.useState('high');
  const inp = { background: '#1a1a1a', border: '1px solid #484848', color: '#d0d0d0', padding: '3px 7px', borderRadius: 2, fontSize: 12, outline: 'none' };
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 };
  const lbl = { color: '#aaa', fontSize: 12 };
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: '#8a8a8a', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #3a3a3a' }}>{title}</div>
      {children}
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#2e2e2e', border: '1px solid #484848', borderRadius: 4, width: 480, boxShadow: '0 12px 40px rgba(0,0,0,0.7)', color: '#d0d0d0', fontSize: 12 }}>
        <div style={{ background: '#252525', borderBottom: '1px solid #484848', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          <Section title="General">
            <div style={row}>
              <span style={lbl}>Auto-save</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} style={{ accentColor: '#4a8acc' }} />
                <span style={{ color: '#888', fontSize: 11 }}>{autoSave ? 'On' : 'Off'}</span>
              </label>
            </div>
            {autoSave && <div style={row}>
              <span style={lbl}>Auto-save every</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" value={autoSaveInterval} min={1} max={60} onChange={e => setAutoSaveInterval(+e.target.value)} style={{ ...inp, width: 48 }} />
                <span style={{ color: '#666' }}>min</span>
              </div>
            </div>}
            <div style={row}>
              <span style={lbl}>Grid size</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="number" value={gridSize} min={8} max={200} onChange={e => setGridSize(+e.target.value)} style={{ ...inp, width: 56 }} />
                <span style={{ color: '#666' }}>px</span>
              </div>
            </div>
          </Section>
          <Section title="Default Canvas">
            <div style={row}>
              <span style={lbl}>Size</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#666', fontSize: 11 }}>W</span>
                <input type="number" value={defaultW} onChange={e => setDefaultW(+e.target.value)} style={{ ...inp, width: 64 }} />
                <span style={{ color: '#666', fontSize: 11 }}>H</span>
                <input type="number" value={defaultH} onChange={e => setDefaultH(+e.target.value)} style={{ ...inp, width: 64 }} />
              </div>
            </div>
            <div style={row}>
              <span style={lbl}>Render quality</span>
              <select value={renderQuality} onChange={e => setRenderQuality(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="low">Low (faster)</option>
                <option value="medium">Medium</option>
                <option value="high">High (default)</option>
              </select>
            </div>
          </Section>
          <Section title="Export">
            <div style={row}>
              <span style={lbl}>Default format</span>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="html">Playable HTML</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div style={row}>
              <span style={lbl}>Minify output</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={minify} onChange={e => setMinify(e.target.checked)} style={{ accentColor: '#4a8acc' }} />
                <span style={{ color: '#888', fontSize: 11 }}>{minify ? 'On' : 'Off'}</span>
              </label>
            </div>
          </Section>
          <Section title="Game Defaults">
            <div style={row}>
              <span style={lbl}>Difficulty</span>
              <select value={defaultDiff} onChange={e => setDefaultDiff(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <div style={row}>
              <span style={lbl}>Default font</span>
              <select value={defaultFont} onChange={e => setDefaultFont(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option>Caveat (handwriting)</option><option>Patrick Hand</option><option>Roboto</option><option>Georgia</option>
              </select>
            </div>
          </Section>
          <Section title="Panels">
            <div style={{ color: '#888', fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>Uncheck to hide a panel from the Window menu.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {Object.entries(panelDefs).map(([id, def]) => (
                <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#c0c0c0' }}>
                  <input type="checkbox" checked={!!enabledPanels[id]}
                    onChange={e => setEnabledPanels(p => ({...p, [id]: e.target.checked}))}
                    style={{ accentColor: '#4a8acc', width: 12, height: 12 }} />
                  {def.label}
                </label>
              ))}
            </div>
          </Section>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #3a3a3a' }}>
            <button onClick={onClose} style={{ background: '#3a3a3a', border: '1px solid #555', color: '#d0d0d0', padding: '5px 20px', borderRadius: 12, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            <button onClick={onClose} style={{ background: '#1e6ebf', border: '1px solid #2a7adf', color: '#fff', padding: '5px 20px', borderRadius: 12, cursor: 'pointer', fontSize: 12 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Docs Modal Component ──────────────────────────────────────────────────────
const DocsModal = ({ onClose }) => {
  const [activeDoc, setActiveDoc] = React.useState('start');
  const DOCS = {
    start: { title: 'Getting Started', content: [
      ['Create your first game', 'Use the Layers panel to set your Base Layer — this is the background image players will search. Then add objects to the Layers list. Each layer becomes a hidden object in your game.'],
      ['Set up tap zones', 'Use Hit Zone layers to define where players should tap. Missed Tap layers define penalty zones. Surprise layers trigger special effects.'],
      ['Test & export', 'Press Play to preview your game. When ready, use Project → Export as playable HTML to share it.'],
    ]},
    tools: { title: 'Tools Reference', content: [
      ['Select (V)', 'Click to select objects on the canvas. Drag to move them.'],
      ['Hand (H)', 'Pan around the canvas. Hold and drag to scroll.'],
      ['Draw (P)', 'Freehand draw on the canvas.'],
      ['Erase (E)', 'Erase parts of a layer.'],
      ['Shapes', 'Rectangle (R), Ellipse (O), Star (S) — draw geometric hit zones.'],
      ['Add (A)', 'Add a new hidden object to the scene.'],
      ['Surprise (U)', 'Place a surprise element that triggers a special reaction.'],
    ]},
    layers: { title: 'Layers Guide', content: [
      ['Base Layer', 'The background of your game. Can be an SVG, scanned image, or uploaded photo.'],
      ['Layers', 'Each entry is a hidden object. Players must find all layers to complete the game.'],
      ['Hit Zone', 'Defines the tappable area for a hidden object. Customize sound, text, and color feedback.'],
      ['Missed Tap', 'Triggered when a player taps outside a hit zone. Configure penalty sound and text.'],
      ['Surprise', 'Optional special layer that triggers a bonus animation or sound.'],
      ['Color coding', "Double-click a layer's color swatch to open Layer Options and change its color."],
    ]},
    export: { title: 'Export Guide', content: [
      ['Export JSON', 'Exports the full game data as a JSON file. Use this to back up your project or import into other tools.'],
      ['Export as playable HTML', 'Creates a self-contained HTML file with your game fully playable. Share via link, embed in a website, or send directly to players.'],
      ['Document Size vs Project Size', 'Document Size is your canvas dimensions. Project Size reflects the actual exported game dimensions.'],
    ]},
  };
  const NAV = [['start','Getting Started'],['tools','Tools Reference'],['layers','Layers Guide'],['export','Export Guide']];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#2e2e2e', border: '1px solid #484848', borderRadius: 4, width: 640, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', color: '#d0d0d0', fontSize: 12 }}>
        <div style={{ background: '#252525', borderBottom: '1px solid #484848', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Documentation</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 160, background: '#252525', borderRight: '1px solid #3a3a3a', padding: '8px 0', flexShrink: 0 }}>
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => setActiveDoc(id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: activeDoc === id ? '#0a4d8a' : 'none', border: 'none', color: activeDoc === id ? '#fff' : '#aaa', padding: '7px 14px', cursor: 'pointer', fontSize: 12 }}
                onMouseEnter={e => { if (activeDoc !== id) e.currentTarget.style.background = '#2a2a2a'; }}
                onMouseLeave={e => { if (activeDoc !== id) e.currentTarget.style.background = 'none'; }}
              >{label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#e0e0e0' }}>{DOCS[activeDoc].title}</div>
            {DOCS[activeDoc].content.map(([h, body]) => (
              <div key={h} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, color: '#c0c0c0', marginBottom: 4 }}>{h}</div>
                <div style={{ color: '#888', lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LayersPanel, PropertiesPanel, ProjectPanel, HitZonePanel, SurprisePanel, TransformPanel, SwatchesPanel, HistoryPanel, NavigatorPanel, DifficultyPanel, SettingsModal, DocsModal });
