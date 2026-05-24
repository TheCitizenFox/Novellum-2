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
import { ManuscriptView } from './ManuscriptView';
import { PenTool, LayoutGrid, Archive, Layers, MessageSquare, Settings as SettingsIcon, Menu, PanelRight, Clock, X, BookOpen } from 'lucide-react';
import { cn } from '../utils/cn';
import { NotebookGraphic } from './Graphics';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState(false);

  // Auto-close sidebars on initial load for smaller screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
    }
    if (window.innerWidth < 1024) {
      dispatch({ type: 'SET_RIGHT_PANEL_OPEN', payload: false });
    }
  }, [dispatch]);

  // Handle Infographic capture once state flips
  useEffect(() => {
    if (state.isInfographicMode) {
      const captureGraphic = async () => {
        // Wait a tick for the UI to settle and re-render badges/legend
        await new Promise(r => setTimeout(r, 800));
        
        const element = document.getElementById('infographic-capture-root');
        if (element) {
          try {
            const dataUrl = await toPng(element, {
              backgroundColor: '#121214', // Match bg-main
              pixelRatio: 2, // High-res
              filter: (node) => node.id !== 'infographic-close-btn'
            });
            
            // Trigger download
            const link = document.createElement('a');
            link.download = 'novellum-features-guide.png';
            link.href = dataUrl;
            link.click();
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Infographic downloaded successfully!', type: 'success' } });
            
            // Note: We don't auto-close the mode here so the user can look at the badges 
            // if they want. They click the 'Close' button to exit.
          } catch (e: any) {
            console.error("Capture failed", e);
            dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Click 'X' to dismiss. Graphic Error: ${e.message || String(e)}`, type: 'error' } });
            dispatch({ type: 'SET_INFOGRAPHIC_MODE', payload: false });
          }
        }
      };
      
      captureGraphic();
    }
  }, [state.isInfographicMode, dispatch]);

  // Auto-clear notifications (ONLY for non-errors now!)
  useEffect(() => {
    if (state.notification && state.notification.type !== 'error') {
      const id = state.notification.id;
      const timer = setTimeout(() => {
        dispatch({ type: 'CLEAR_NOTIFICATION', payload: id });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification, dispatch]);

  const renderActiveView = () => {
    let content = null;
    switch (state.activeView) {
      case 'editor':
        content = <Editor />;
        break;
      case 'cards':
        content = <SceneCards />;
        break;
      case 'vault':
        content = <SnippetVault />;
        break;
      case 'staging':
        content = <StagingShelf />;
        break;
      case 'settings':
        content = <Settings />;
        break;
      case 'manuscript':
        content = <ManuscriptView />;
        break;
      default:
        content = <Editor />;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={state.activeView}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div 
      className={cn("flex flex-col w-full bg-bg-main text-text-muted overflow-hidden font-sans selection:bg-[var(--accent-primary)]/30",
        state.isInfographicMode ? "min-h-0 h-auto" : "h-[100dvh]"
      )}
      id="infographic-capture-root"
    >
      <header className="h-16 md:h-20 bg-bg-main flex items-center justify-between px-3 md:px-6 shrink-0 z-50 border-b border-[rgba(255,255,255,0.05)] gap-2 md:gap-4 relative w-full">
          
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
                  if (window.innerWidth < 768 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<PenTool size={16} />}
                label="Editor"
              />
              <NavButton
                active={state.activeView === 'cards'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'cards' ? 'editor' : 'cards' });
                  if (window.innerWidth < 768 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<LayoutGrid size={16} />}
                label="Cards"
              />
              <NavButton
                active={state.activeView === 'vault'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'vault' ? 'editor' : 'vault' });
                  if (window.innerWidth < 768 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<Archive size={16} />}
                label="Vault"
              />
              <NavButton
                active={state.activeView === 'staging'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'staging' ? 'editor' : 'staging' });
                  if (window.innerWidth < 768 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<MessageSquare size={16} />}
                label="Library"
              />
              <NavButton
                active={state.activeView === 'manuscript'}
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: state.activeView === 'manuscript' ? 'editor' : 'manuscript' });
                  if (window.innerWidth < 768 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
                }}
                icon={<BookOpen size={16} />}
                label="Manuscript"
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
                if (window.innerWidth < 768 && state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
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

      <div className="flex flex-1 relative min-h-0 overflow-hidden">
      {/* Left Sidebar */}
      <div className={cn(
        "absolute inset-y-0 left-0 z-40 flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:relative bg-bg-main overflow-hidden",
        state.isSidebarOpen ? "translate-x-0 w-64 border-r border-[rgba(255,255,255,0.05)]" : "-translate-x-full w-64 md:translate-x-0 md:w-0 md:border-r-0"
      )}>
        <div className="w-64 h-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Overlay for Sidebar */}
      {state.isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-bg-main">
        {/* Active View Container */}
        <main className="flex-1 overflow-hidden relative bg-bg-main">
          {renderActiveView()}
        </main>
      </div>

      {/* Right Panel */}
      <div className={cn(
        "absolute inset-y-0 right-0 z-40 flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative bg-bg-main overflow-hidden",
        state.isRightPanelOpen ? "translate-x-0 w-80 md:w-96 border-l border-[rgba(255,255,255,0.05)]" : "translate-x-full w-80 md:w-96 lg:translate-x-0 lg:w-0 lg:border-l-0"
      )}>
        <div className="w-80 md:w-96 h-full">
          <RightPanel />
        </div>
      </div>

      {/* Mobile Overlay for Right Panel */}
      {state.isRightPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
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
            {state.notification.type === 'error' && (
              <button 
                onClick={() => dispatch({ type: 'CLEAR_NOTIFICATION', payload: state.notification!.id })}
                className="ml-2 hover:bg-white/10 p-1 rounded transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Infographic Legend Overlay */}
      {state.isInfographicMode && (
        <div className="w-full bg-bg-panel border-t border-[rgba(255,255,255,0.05)] p-6 md:p-8 shrink-0 relative">
          <button 
            id="infographic-close-btn"
            onClick={() => dispatch({ type: 'SET_INFOGRAPHIC_MODE', payload: false })}
            className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full transition-colors z-[999]"
            title="Exit Graphic Mode"
          >
            <X size={20} />
          </button>
          <div className="max-w-5xl mx-auto flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-8 flex items-center gap-3">
              <NotebookGraphic className="w-8 h-8" /> 
              Novellum Feature Guide
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {[
                { n: 1, title: 'Manuscript Navigator', desc: 'Seamlessly organize your novel into chapters and individual scenes.' },
                { n: 2, title: 'Distraction-Free Editor', desc: 'A minimalist writing zone that auto-saves as you type without getting in your way.' },
                { n: 3, title: 'Clean Text Magic', desc: 'Instantly normalize messy punctuation, spacing, capitalization, and strip structural tags.' },
                { n: 4, title: 'Quick Copy Mode', desc: 'Tap any sentence to instantly copy it. Press and hold to instantly copy a full paragraph.' },
                { n: 5, title: 'Split Screen Viewer', desc: 'Pin any Vault lore snippet or previous scene as a read-only reference right beside your active draft.' }
              ].map(feat => (
                <div key={feat.n} className="flex gap-4 p-4 rounded-2xl bg-bg-card border border-[rgba(255,255,255,0.03)] items-start">
                  <div className="w-8 h-8 rounded-full bg-accent-primary text-white font-bold flex items-center justify-center shrink-0 shadow-lg">
                    {feat.n}
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{feat.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 text-xs text-text-muted opacity-50 uppercase tracking-widest font-semibold">
              Exported from Novellum Writer 
            </div>
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
