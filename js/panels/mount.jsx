// Hidden Studio — Panel island App (M2: full stubs + interactive panel system)
// Manages all 10 panel stubs, group state, drag/float/dock/merge/split.
// Communicates with vanilla code exclusively via window.Panels.

// ── Default panel stubs (registered once if vanilla hasn't registered them) ──
const STUB_PANELS = [
  { id: 'layers',     title: 'Layers',      side: 'right', order: 0 },
  { id: 'navigator',  title: 'Navigator',   side: 'right', order: 1 },
  { id: 'properties', title: 'Properties',  side: 'right', order: 2 },
  { id: 'transform',  title: 'Transform',   side: 'right', order: 3 },
  { id: 'swatches',   title: 'Swatches',    side: 'right', order: 4 },
  { id: 'hitzone',    title: 'Hit Zone',    side: 'right', order: 5 },
  { id: 'surprise',   title: 'Surprise',    side: 'right', order: 6 },
  { id: 'difficulty', title: 'Difficulty',  side: 'right', order: 7 },
  { id: 'project',    title: 'Project',     side: 'right', order: 8 },
  { id: 'history',    title: 'History',     side: 'right', order: 9 },
];

// Stub DOM builder — returns a vanilla HTMLElement used as panel body
function makeStubNode(panelId, title) {
  const el = document.createElement('div');
  el.style.cssText = 'padding:14px 12px;color:var(--ps-dim-text);font-size:12px;line-height:1.6;';
  if (panelId === 'history') {
    el.innerHTML = '<em>History will be available after undo/redo lands.</em>';
  } else {
    el.innerHTML = `<strong style="color:var(--ps-text)">${title}</strong><br>Content migrates in Phase 2.`;
  }
  return el;
}

// Ensure all 10 stubs are registered (won't overwrite existing real registrations)
(function bootstrapStubs() {
  const regs = window.Panels._getRegs();
  STUB_PANELS.forEach(({ id, title, side, order }) => {
    if (!regs[id]) {
      window.Panels.register(id, {
        title,
        render: () => makeStubNode(id, title),
        defaultSide: side,
        defaultOrder: order,
      });
    }
  });
})();

// ── Initial group layout ─────────────────────────────────────────────────────
const INITIAL_GROUPS = [
  { id: 'g1', tabs: ['layers', 'navigator'],           activeTab: 0, minimized: false, floating: false, x: 0,   y: 60,  width: 264, height: 380, zIndex: 0 },
  { id: 'g2', tabs: ['properties', 'transform', 'swatches'], activeTab: 0, minimized: false, floating: false, x: 0, y: 60, width: 264, height: 320, zIndex: 0 },
  { id: 'g3', tabs: ['hitzone', 'surprise', 'difficulty'],   activeTab: 0, minimized: false, floating: false, x: 0, y: 60, width: 264, height: 280, zIndex: 0 },
  { id: 'g4', tabs: ['project', 'history'],            activeTab: 0, minimized: false, floating: false, x: 0,   y: 60,  width: 264, height: 280, zIndex: 0 },
];

// ── Panel island App ─────────────────────────────────────────────────────────
const PanelIsland = () => {
  const [groups, setGroups] = React.useState(INITIAL_GROUPS);
  const [closedPanels, setClosedPanels] = React.useState([]);
  const [tabDrag, setTabDrag] = React.useState(null);
  const [nearDock, setNearDock] = React.useState(false);

  const groupsRef = React.useRef(groups);
  React.useEffect(() => { groupsRef.current = groups; }, [groups]);

  const zRef = React.useRef(10);

  // ── Expose API to window.Panels ──────────────────────────────────────────
  React.useEffect(() => {
    const regs = window.Panels._getRegs();
    const panelDefs = Object.fromEntries(
      Object.entries(regs).map(([id, r]) => [id, r])
    );

    window.Panels._connect({
      show(panelId) {
        setGroups(prev => {
          if (prev.some(g => g.tabs.includes(panelId))) return prev;
          setClosedPanels(cp => cp.filter(t => t !== panelId));
          return [...prev, {
            id: `g${Date.now()}`, tabs: [panelId], activeTab: 0,
            minimized: false, floating: true,
            x: 300, y: 160, width: 264, height: 420, zIndex: ++zRef.current,
          }];
        });
      },
      hide(panelId) {
        setGroups(prev => {
          const next = prev.map(g => {
            if (!g.tabs.includes(panelId)) return g;
            const tabs = g.tabs.filter(t => t !== panelId);
            return tabs.length === 0 ? null : { ...g, tabs, activeTab: Math.max(0, g.activeTab - 1) };
          }).filter(Boolean);
          setClosedPanels(cp => [...new Set([...cp, panelId])]);
          return next;
        });
      },
      toggle(panelId) {
        const visible = groupsRef.current.some(g => g.tabs.includes(panelId));
        if (visible) {
          setGroups(prev => {
            const next = prev.map(g => {
              if (!g.tabs.includes(panelId)) return g;
              const tabs = g.tabs.filter(t => t !== panelId);
              return tabs.length === 0 ? null : { ...g, tabs, activeTab: Math.max(0, g.activeTab - 1) };
            }).filter(Boolean);
            setClosedPanels(cp => [...new Set([...cp, panelId])]);
            return next;
          });
        } else {
          setGroups(prev => {
            setClosedPanels(cp => cp.filter(t => t !== panelId));
            return [...prev, {
              id: `g${Date.now()}`, tabs: [panelId], activeTab: 0,
              minimized: false, floating: true,
              x: 300, y: 160, width: 264, height: 420, zIndex: ++zRef.current,
            }];
          });
        }
      },
      resetLayout() {
        setGroups(INITIAL_GROUPS);
        setClosedPanels([]);
        window.Panels._notifyLayoutChange({ reset: true });
      },
      isVisible(panelId) {
        return groupsRef.current.some(g => g.tabs.includes(panelId));
      },
      setTheme(_name) {
        // CSS vars handle theme; React re-reads them automatically
        // Force a re-render so panels pick up new var() values
        setGroups(prev => [...prev]);
      },
      onSelectionChange(_sel) {},
      onZoomChange(_z) {},
      onCameraChange(_x, _y) {},
    });

    return () => {};
  }, []);

  // ── Group drag (header drag → float; drop near right edge → dock) ─────────
  const startGroupDrag = React.useCallback((groupId, e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const g = groupsRef.current.find(x => x.id === groupId);
    if (!g) return;
    const initX = g.floating ? g.x : startX - 132;
    const initY = g.floating ? g.y : startY - 14;
    const offX = startX - initX, offY = startY - initY;
    let moved = false;

    const onMove = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && dx * dx + dy * dy < 16) return;
      moved = true;
      const nx = ev.clientX - offX, ny = ev.clientY - offY;
      setNearDock(ev.clientX > window.innerWidth - 290);
      setGroups(prev => prev.map(x =>
        x.id === groupId ? { ...x, floating: true, x: nx, y: ny, zIndex: ++zRef.current } : x
      ));
    };
    const onUp = ev => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setNearDock(false);
      if (moved && ev.clientX > window.innerWidth - 280) {
        setGroups(prev => prev.map(x => x.id === groupId ? { ...x, floating: false } : x));
      }
      if (moved) window.Panels._notifyLayoutChange({ groupId });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── Tab drag (split to new float; drop on header to merge) ───────────────
  const startTabDrag = React.useCallback((groupId, tabId, e) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    let moved = false;

    const onMove = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && dx * dx + dy * dy < 25) return;
      moved = true;
      setTabDrag({ groupId, tabId, x: ev.clientX, y: ev.clientY });
    };
    const onUp = ev => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!moved) { setTabDrag(null); return; }

      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const header = el && el.closest('[data-group-header]');
      const targetId = header && header.dataset.groupHeader;
      setTabDrag(null);

      if (targetId && targetId !== groupId) {
        // Merge tab into target group
        setGroups(prev => {
          const src = prev.find(x => x.id === groupId);
          if (!src) return prev;
          const newSrcTabs = src.tabs.filter(t => t !== tabId);
          return prev
            .filter(x => !(x.id === groupId && newSrcTabs.length === 0))
            .map(x => {
              if (x.id === groupId) return { ...x, tabs: newSrcTabs, activeTab: 0 };
              if (x.id === targetId) return { ...x, tabs: [...x.tabs, tabId], activeTab: x.tabs.length };
              return x;
            });
        });
      } else {
        // Detach tab into its own floating group
        setGroups(prev => {
          const src = prev.find(x => x.id === groupId);
          if (!src) return prev;
          if (src.tabs.length === 1) {
            return prev.map(x => x.id === groupId
              ? { ...x, floating: true, x: ev.clientX - 132, y: ev.clientY - 14, zIndex: ++zRef.current }
              : x
            );
          }
          const newSrcTabs = src.tabs.filter(t => t !== tabId);
          return [
            ...prev.map(x => x.id === groupId ? { ...x, tabs: newSrcTabs, activeTab: 0 } : x),
            {
              id: `g${Date.now()}`, tabs: [tabId], activeTab: 0,
              minimized: false, floating: true,
              x: ev.clientX - 132, y: ev.clientY - 14,
              width: 264, height: 420, zIndex: ++zRef.current,
            },
          ];
        });
      }
      window.Panels._notifyLayoutChange({ tabId, groupId });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const updateGroup = React.useCallback(u =>
    setGroups(p => p.map(g => g.id === u.id ? { ...g, ...u } : g)), []);

  const removeGroup = React.useCallback(id => {
    setGroups(p => {
      const g = p.find(x => x.id === id);
      if (g) setClosedPanels(cp => [...new Set([...cp, ...g.tabs])]);
      return p.filter(x => x.id !== id);
    });
  }, []);

  const panelDefs = window.Panels._getRegs();
  const dockedGroups   = groups.filter(g => !g.floating);
  const floatingGroups = groups.filter(g => g.floating).sort((a, b) => a.zIndex - b.zIndex);

  const pgProps = {
    panelDefs,
    onUpdate: updateGroup,
    onRemove: removeGroup,
    onStartDrag: startGroupDrag,
    onTabDrag: startTabDrag,
    tabDrag,
  };

  return (
    <>
      {/* Right dock column */}
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
        {dockedGroups.map(g => <PanelGroup key={g.id} group={g} {...pgProps} />)}

        {nearDock && (
          <div style={{ margin: 5, padding: 14, background: 'var(--ps-accent-dim)', border: '1px dashed var(--ps-accent)', borderRadius: 3, color: 'var(--ps-accent)', fontSize: 11, textAlign: 'center' }}>
            Drop to dock
          </div>
        )}

        {dockedGroups.length === 0 && !nearDock && (
          <div style={{ padding: 16, color: 'var(--ps-dim-text)', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
            All panels are floating.<br/>
            <span style={{ color: 'var(--ps-dim-text)', opacity: 0.7 }}>
              Drag a panel here to dock it,<br/>or use Window menu to reopen.
            </span>
          </div>
        )}
      </div>

      {/* Dock drop overlay — shows when dragging near right edge */}
      {nearDock && <DockDropOverlay active />}

      {/* Floating panels */}
      {floatingGroups.map(g => <PanelGroup key={g.id} group={g} {...pgProps} />)}

      {/* Tab drag ghost */}
      {tabDrag && (
        <div style={{
          position: 'fixed',
          left: tabDrag.x - 52, top: tabDrag.y - 13,
          background: 'var(--ps-accent-dim)', border: '1px solid var(--ps-accent)',
          color: 'var(--ps-text)', padding: '3px 12px',
          fontSize: 12, borderRadius: 3, pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.55)',
        }}>
          {panelDefs[tabDrag.tabId]?.title || tabDrag.tabId}
        </div>
      )}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('panel-root')).render(<PanelIsland />);
