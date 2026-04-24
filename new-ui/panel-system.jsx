// Hidden Studio — PanelGroup component
// Handles: floating, docking, minimize, tabs, tab-drag-to-merge

const PanelGroup = ({ group, onUpdate, onRemove, panelDefs, onStartDrag, onTabDrag, tabDrag, theme }) => {
  const T = theme || {};
  const bg        = T.panelBg  || '#363636';
  const headerBg  = T.headerBg || '#2e2e2e';
  const border    = T.border   || '#484848';
  const textDim   = T.dimText  || '#888888';

  // Is another tab being dragged — show merge highlight on our header?
  const isDropTarget = !!(tabDrag && tabDrag.groupId !== group.id);

  const containerStyle = group.floating ? {
    position: 'fixed',
    left: group.x || 0,
    top:  group.y || 0,
    width: group.width || 264,
    zIndex: 1000 + (group.zIndex || 0),
    boxShadow: '0 8px 28px rgba(0,0,0,0.72)',
    borderRadius: 3,
  } : { position: 'relative', width: '100%' };

  const CtrlBtn = ({ title, onClick, children }) => (
    <button title={title} onClick={onClick} data-no-drag="1"
      style={{ background: 'none', border: 'none', color: textDim, cursor: 'pointer', fontSize: 13, padding: '0 5px', lineHeight: 1, display: 'flex', alignItems: 'center', height: '100%' }}
      onMouseEnter={e => e.currentTarget.style.color = '#d0d0d0'}
      onMouseLeave={e => e.currentTarget.style.color = textDim}
    >{children}</button>
  );

  return (
    <div data-panel-group={group.id} style={{
      ...containerStyle,
      background: bg,
      border: `1px solid ${isDropTarget ? '#4a8acc' : border}`,
      overflow: 'hidden',
      marginBottom: group.floating ? 0 : 2,
      transition: 'border-color 0.1s',
    }}>
      {/* ── Tab bar ─────────────────────────────────────────── */}
      <div
        data-group-header={group.id}
        onMouseDown={e => { if (e.target.closest('[data-no-drag]')) return; onStartDrag(group.id, e); }}
        style={{ background: headerBg, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'stretch', minHeight: 26, cursor: 'grab', userSelect: 'none' }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'hidden' }}>
          {group.tabs.map((tabId, i) => {
            const active = group.activeTab === i && !group.minimized;
            return (
              <div key={tabId} data-no-drag="1"
                onMouseDown={e => onTabDrag(group.id, tabId, e)}
                onClick={() => onUpdate({ ...group, activeTab: i, minimized: false })}
                style={{
                  background: active ? bg : 'transparent',
                  borderRight: `1px solid ${border}`,
                  color: active ? '#e0e0e0' : textDim,
                  padding: '0 11px',
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  userSelect: 'none',
                  borderBottom: active ? `1px solid ${bg}` : 'none',
                  marginBottom: active ? -1 : 0,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {panelDefs[tabId]?.label || tabId}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div data-no-drag="1" style={{ display: 'flex', alignItems: 'stretch', paddingRight: 2, flexShrink: 0 }}>
          {group.floating && (
            <CtrlBtn title="Dock to panel column" onClick={() => onUpdate({ ...group, floating: false })}>
              {/* dock icon: panel pushed to right */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1"/>
                <rect x="7" y="1" width="4" height="10" rx="1" fill="currentColor" opacity="0.5"/>
              </svg>
            </CtrlBtn>
          )}
          <CtrlBtn title={group.minimized ? 'Expand panel' : 'Collapse panel'} onClick={() => onUpdate({ ...group, minimized: !group.minimized })}>
            {group.minimized ? '»' : '«'}
          </CtrlBtn>
          <CtrlBtn title="Close panel" onClick={() => onRemove(group.id)}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </CtrlBtn>
        </div>
      </div>

      {/* ── Panel content ────────────────────────────────────── */}
      {!group.minimized && (
        <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: group.floating ? (group.height || 520) : undefined }}>
          {panelDefs[group.tabs[group.activeTab]]?.render()}
        </div>
      )}

      {/* Drop-to-merge hint strip (shown when a foreign tab is being dragged) */}
      {isDropTarget && (
        <div data-group-header={group.id} style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 26,
          background: 'rgba(74,138,204,0.18)', pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#4a8acc', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Drop to merge
        </div>
      )}
    </div>
  );
};

// Visual overlay shown when dragging near the right dock edge
const DockDropOverlay = ({ active }) => !active ? null : (
  <div style={{
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 266,
    background: 'rgba(74,138,204,0.07)',
    border: '2px dashed rgba(74,138,204,0.45)',
    pointerEvents: 'none', zIndex: 990,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <span style={{ color: 'rgba(74,138,204,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Dock here</span>
  </div>
);

Object.assign(window, { PanelGroup, DockDropOverlay });
