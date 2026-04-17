import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { SceneCards } from './SceneCards';
import { SnippetVault } from './SnippetVault';
import { StagingShelf } from './StagingShelf';
import { Settings } from './Settings';
import { RightPanel } from './RightPanel';
import { SnapshotsModal } from './SnapshotsModal';
import { PenTool, LayoutGrid, Archive, Layers, Settings as SettingsIcon, Menu, PanelRight, Clock } from 'lucide-react';
import { cn } from '../utils/cn';
import { NotebookGraphic } from './Graphics';

export const Layout: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState(false);

  // Auto-close sidebars on initial load for smaller screens
  useEffect(() => {
    if (window.innerWidth < 1280) {
      dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
      dispatch({ type: 'SET_RIGHT_PANEL_OPEN', payload: false });
    }
  }, [dispatch]);

  // Auto-clear notifications
  useEffect(() => {
    if (state.notification) {
      const id = state.notification.id;
      const timer = setTimeout(() => {
        dispatch({ type: 'CLEAR_NOTIFICATION', payload: id });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification, dispatch]);

  const renderActiveView = () => {
    switch (state.activeView) {
      case 'editor':
        return <Editor />;
      case 'cards':
        return <SceneCards />;
      case 'vault':
        return <SnippetVault />;
      case 'staging':
        return <StagingShelf />;
      case 'settings':
        return <Settings />;
      default:
        return <Editor />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg-main text-text-muted overflow-hidden font-sans selection:bg-[var(--accent-primary)]/30">
      {/* Left Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex-shrink-0 transform transition-all duration-300 ease-in-out xl:relative",
        state.isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-72 xl:translate-x-0 xl:w-0 xl:overflow-hidden"
      )}>
        <div className="w-72 h-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Overlay for Sidebar */}
      {state.isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 md:h-20 bg-bg-main flex items-center justify-between px-3 md:px-6 shrink-0 z-10 border-b border-[rgba(255,255,255,0.05)] gap-2 md:gap-4">
          
          {/* Left: Menu & Logo */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
              className="text-text-muted hover:text-white p-2 md:p-2.5 rounded-xl hover:bg-bg-card transition-all active:scale-95"
            >
              <Menu size={22} className="transition-transform duration-300 hover:scale-110" />
            </button>
            <div className="flex items-center justify-center shrink-0 drop-shadow-[0_0_15px_var(--shadow-accent)]">
              <NotebookGraphic className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <span className="text-lg md:text-xl font-bold text-white tracking-wide hidden sm:block">Novellum</span>
            
            {/* Save Status Indicator & Quick Save */}
            <div className="hidden lg:flex items-center ml-2 gap-3">
              {state.saveError ? (
                <span className="text-xs text-red-400 font-medium flex items-center gap-1.5 cursor-help" title={state.saveError}>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Error Saving
                </span>
              ) : state.lastSaved ? (
                <span className="text-xs text-text-muted font-medium flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500/50" /> Saved
                </span>
              ) : null}
              
              <button
                onClick={async () => {
                  try {
                    const stateToExport = { ...state };
                    delete stateToExport.saveError;
                    delete stateToExport.lastSaved;
                    const content = JSON.stringify(stateToExport, null, 2);
                    const suggestedName = `${state.project.title || 'novellum-backup'}-${new Date().toISOString().split('T')[0]}.json`;
                    
                    const fallbackSave = () => {
                      const blob = new Blob([content], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = suggestedName;
                      a.target = '_blank';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Backup downloaded successfully!', type: 'success' } });
                    };

                    if ('showSaveFilePicker' in window) {
                      try {
                        const handle = await (window as any).showSaveFilePicker({
                          suggestedName,
                          types: [{ description: 'Novellum Backup', accept: { 'application/json': ['.json'] } }],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(content);
                        await writable.close();
                        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Backup saved successfully!', type: 'success' } });
                      } catch (pickerErr: any) {
                        if (pickerErr.name === 'AbortError') return;
                        console.warn('File picker failed, falling back to download:', pickerErr);
                        fallbackSave();
                      }
                    } else {
                      fallbackSave();
                    }
                  } catch (err: any) {
                    console.error('Failed to save file:', err);
                    dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Failed to save backup: ${err.message || 'Unknown error'}`, type: 'error' } });
                  }
                }}
                className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-bg-card text-text-muted hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                title="Save As... (Local Backup)"
              >
                Save As...
              </button>
            </div>
          </div>

          {/* Center: Nav Buttons (Scrollable) */}
          <div className="flex-1 flex items-center justify-center overflow-x-auto no-scrollbar mask-edges px-2">
            <nav className="flex items-center gap-1 md:gap-2 min-w-max">
              <NavButton
                active={state.activeView === 'editor'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'editor' });
                  if (window.innerWidth < 1280 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<PenTool size={16} />}
                label="Editor"
              />
              <NavButton
                active={state.activeView === 'cards'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'cards' ? 'editor' : 'cards' });
                  if (window.innerWidth < 1280 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<LayoutGrid size={16} />}
                label="Cards"
              />
              <NavButton
                active={state.activeView === 'vault'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'vault' ? 'editor' : 'vault' });
                  if (window.innerWidth < 1280 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<Archive size={16} />}
                label="Vault"
              />
              <NavButton
                active={state.activeView === 'staging'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'staging' ? 'editor' : 'staging' });
                  if (window.innerWidth < 1280 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<Layers size={16} />}
                label="Staging"
              />
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <button
              onClick={() => setIsSnapshotsModalOpen(true)}
              className="p-2 md:p-2.5 rounded-xl transition-all active:scale-95 text-text-muted hover:text-white hover:bg-bg-panel"
              title="Version History"
            >
              <Clock size={20} className="md:w-[18px] md:h-[18px] transition-transform duration-300 hover:rotate-12" />
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'settings' ? 'editor' : 'settings' });
                if (window.innerWidth < 1280 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
              }}
              className={cn(
                "p-2 md:p-2.5 rounded-xl transition-all active:scale-95",
                state.activeView === 'settings' ? "bg-bg-card text-white shadow-sm border border-[rgba(255,255,255,0.05)]" : "text-text-muted hover:text-white hover:bg-bg-panel"
              )}
            >
              <SettingsIcon size={20} className="md:w-[18px] md:h-[18px] transition-transform duration-300 hover:rotate-45" />
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
              className={cn(
                "p-2 md:p-2.5 rounded-xl transition-all active:scale-95",
                state.isRightPanelOpen ? "bg-bg-card text-white shadow-sm border border-[rgba(255,255,255,0.05)]" : "text-text-muted hover:text-white hover:bg-bg-panel"
              )}
            >
              <PanelRight size={20} className="md:w-[18px] md:h-[18px] transition-transform duration-300 hover:scale-110" />
            </button>
          </div>
        </header>

        {/* Active View Container */}
        <main className="flex-1 overflow-hidden relative bg-bg-main">
          {renderActiveView()}
        </main>
      </div>

      {/* Right Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 flex-shrink-0 transform transition-all duration-300 ease-in-out xl:relative",
        state.isRightPanelOpen ? "translate-x-0 w-80 md:w-96" : "translate-x-full w-80 md:w-96 xl:translate-x-0 xl:w-0 xl:overflow-hidden"
      )}>
        <div className="w-80 md:w-96 h-full">
          <RightPanel />
        </div>
      </div>

      {/* Mobile Overlay for Right Panel */}
      {state.isRightPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
        />
      )}

      <SnapshotsModal 
        isOpen={isSnapshotsModalOpen} 
        onClose={() => setIsSnapshotsModalOpen(false)} 
      />

      {/* Global Notification */}
      {state.notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={cn(
            "px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border",
            state.notification.type === 'success' ? "bg-bg-panel border-green-500/30 text-green-400" :
            state.notification.type === 'error' ? "bg-bg-panel border-red-500/30 text-red-400" :
            "bg-bg-panel border-[rgba(255,255,255,0.1)] text-white"
          )}>
            {state.notification.message}
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap",
        active
          ? "bg-[var(--accent-primary)] text-white shadow-[0_0_20px_var(--shadow-accent)]"
          : "text-text-muted hover:text-white hover:bg-bg-card"
      )}
    >
      <div className="transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
