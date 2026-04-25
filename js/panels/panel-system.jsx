// Hidden Studio — PanelGroup component
// Adapted from new-ui/panel-system.jsx for integration with the vanilla app.
// Uses CSS custom properties (--ps-*) so all four themes work without re-renders.

const PanelContent = ({ panelId }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const reg = window.Panels._getRegs()[panelId];
    if (!reg || !containerRef.current) return;
    const node = reg.render();
    if (node instanceof HTMLElement) {
      containerRef.current.appendChild(node);
      return () => {
        if (containerRef.current && containerRef.current.contains(node)) {
          containerRef.current.removeChild(node);
        }
      };
    }
  }, [panelId]);

  return <div ref={containerRef} style={{ padding: '10px 12px' }} />;
};

const PanelGroup = ({ group, panelDefs, onUpdate, onRemove, onStartDrag, onTabDrag, tabDrag }) => {
  const isDropTarget = !!(tabDrag && tabDrag.groupId !== group.id);

  const containerStyle = group.floating ? {
    position: 'fixed',
    left: group.x || 0,
    top:  group.y || 0,
    width: group.width || 264,
    zIndex: 1000 + (group.zIndex || 0),
    boxShadow: '0 8px 28px rgba(0,0,0,0.72)',
    borderRadius: 3,
    pointerEvents: 'auto',
  } : { position: 'relative', width: '100%' };

  const CtrlBtn = ({ title, onClick, children }) => (
    <button
      title={title}
      onClick={onClick}
      data-no-drag="1"
      style={{
        background: 'none', border: 'none',
        color: 'var(--ps-dim-text)', cursor: 'pointer',
        fontSize: 13, padding: '0 5px', lineHeight: 1,
        display: 'flex', alignItems: 'center', height: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--ps-text)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ps-dim-text)'; }}
    >{children}</button>
  );

  return (
    <div
      data-panel-group={group.id}
      style={{
        ...containerStyle,
        background: 'var(--ps-panel-bg)',
        border: `1px solid ${isDropTarget ? 'var(--ps-accent)' : 'var(--ps-border)'}`,
        overflow: 'hidden',
        marginBottom: group.floating ? 0 : 2,
        transition: 'border-color 0.1s',
      }}
    >
      {/* Tab bar */}
      <div
        data-group-header={group.id}
        onMouseDown={e => {
          if (e.target.closest('[data-no-drag]')) return;
          onStartDrag(group.id, e);
        }}
        style={{
          background: 'var(--ps-panel-header)',
          borderBottom: '1px solid var(--ps-border)',
          display: 'flex', alignItems: 'stretch', minHeight: 26,
          cursor: 'grab', userSelect: 'none',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'hidden' }}>
          {group.tabs.map((tabId, i) => {
            const active = group.activeTab === i;
            return (
              <div
                key={tabId}
                data-no-drag="1"
                onMouseDown={e => onTabDrag(group.id, tabId, e)}
                onClick={() => onUpdate({ ...group, activeTab: i })}
                style={{
                  background: active ? 'var(--ps-panel-bg)' : 'transparent',
                  borderRight: '1px solid var(--ps-border)',
                  color: active ? 'var(--ps-text)' : 'var(--ps-dim-text)',
                  padding: '0 11px', fontSize: 12, cursor: 'pointer',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
                  userSelect: 'none',
                  borderBottom: active ? '1px solid var(--ps-panel-bg)' : 'none',
                  marginBottom: active ? -1 : 0,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {panelDefs[tabId]?.title || tabId}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div data-no-drag="1" style={{ display: 'flex', alignItems: 'stretch', paddingRight: 2, flexShrink: 0 }}>
          {group.floating && (
            <CtrlBtn title="Dock to panel column" onClick={() => onUpdate({ ...group, floating: false })}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1"/>
                <rect x="7" y="1" width="4" height="10" rx="1" fill="currentColor" opacity="0.5"/>
              </svg>
            </CtrlBtn>
          )}
          <CtrlBtn title="Close panel" onClick={() => onRemove(group.id)}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </CtrlBtn>
        </div>
      </div>

      {/* Panel content */}
      <div className="panel-body" style={{ overflowY: group.floating ? 'auto' : 'hidden', overflowX: 'hidden', maxHeight: group.floating ? (group.height || 520) : undefined }}>
        <PanelContent panelId={group.tabs[group.activeTab]} />
      </div>

      {/* Drop-to-merge hint */}
      {isDropTarget && (
        <div
          data-group-header={group.id}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 26,
            background: 'var(--ps-accent-dim)', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: 'var(--ps-accent)', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          Drop to merge
        </div>
      )}
    </div>
  );
};

const DockDropOverlay = ({ active }) => !active ? null : (
  <div style={{
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 266,
    background: 'var(--ps-accent-dim)',
    border: '2px dashed var(--ps-accent)',
    borderRightWidth: 0,
    pointerEvents: 'none', zIndex: 990,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <span style={{ color: 'var(--ps-accent)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Dock here</span>
  </div>
);

Object.assign(window, { PanelGroup, DockDropOverlay, PanelContent });
