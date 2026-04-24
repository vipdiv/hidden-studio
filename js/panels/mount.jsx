// Hidden Studio — Panel island bootstrap (M1: minimal boot)
// Mounts into #panel-root. The right dock column is a fixed overlay.
// Full panel stubs and interactive drag/dock behavior land in M2.

const PanelIsland = () => {
  const regs = window.Panels._getRegs();
  const panelIds = Object.keys(regs);

  // Expose API back to window.Panels so vanilla code can drive us.
  // For M1 these are no-ops; M2 wires real state mutations.
  React.useEffect(() => {
    window.Panels._connect({
      show:              () => {},
      hide:              () => {},
      toggle:            () => {},
      resetLayout:       () => {},
      isVisible:         () => true,
      setTheme:          () => {},
      onSelectionChange: () => {},
      onZoomChange:      () => {},
      onCameraChange:    () => {},
    });
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0, right: 0, bottom: 0,
      width: 266,
      background: 'var(--ps-dock-bg)',
      borderLeft: '1px solid var(--ps-border)',
      display: 'flex', flexDirection: 'column',
      pointerEvents: 'auto',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {panelIds.length === 0 ? (
        <div style={{ padding: 16, color: 'var(--ps-dim-text)', fontSize: 11, textAlign: 'center', lineHeight: 1.8, marginTop: 20 }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>✓</div>
          Panel island loaded.<br/>
          Stubs register in M2.
        </div>
      ) : (
        panelIds.map(id => (
          <div key={id} style={{
            borderBottom: '1px solid var(--ps-border)',
            padding: '7px 12px',
            background: 'var(--ps-panel-header)',
            color: 'var(--ps-dim-text)',
            fontSize: 12,
          }}>
            {regs[id].title}
          </div>
        ))
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('panel-root')).render(<PanelIsland />);
