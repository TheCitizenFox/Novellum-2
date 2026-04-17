import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Copy, Tag, FileText, MessageSquare, Layers, Search, X, PenLine, Archive } from 'lucide-react';
import { cn } from '../utils/cn';

export const RightPanel: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [activeTab, setActiveTab] = useState<'snippets' | 'staging' | 'notes'>('snippets');
  const [searchQuery, setSearchQuery] = useState('');

  const activeScene = state.project.chapters
    .flatMap(c => c.scenes)
    .find(s => s.id === state.activeSceneId);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeScene) {
      dispatch({
        type: 'UPDATE_SCENE_METADATA',
        payload: { id: activeScene.id, metadata: { notes: e.target.value } },
      });
    }
  };

  const filteredSnippets = state.snippets.filter(s => 
    s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sourceNote.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaging = state.stagingItems.filter(s => 
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-bg-main flex flex-col h-full z-20 border-l border-[rgba(255,255,255,0.05)] shadow-2xl xl:shadow-none">
      <div className="p-4 flex items-center justify-between shrink-0 border-b border-[rgba(255,255,255,0.05)] bg-bg-panel">
        <div className="flex bg-bg-card rounded-xl p-1 w-full relative">
          <button
            onClick={() => setActiveTab('snippets')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all z-10 active:scale-95",
              activeTab === 'snippets' ? "bg-[var(--accent-primary)] text-white shadow-sm" : "text-text-muted hover:text-white hover:bg-bg-hover/50"
            )}
          >
            <Archive size={14} /> Vault
          </button>
          <button
            onClick={() => setActiveTab('staging')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all z-10 active:scale-95",
              activeTab === 'staging' ? "bg-[var(--accent-primary)] text-white shadow-sm" : "text-text-muted hover:text-white hover:bg-bg-hover/50"
            )}
          >
            <Layers size={14} /> Staging
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all z-10 active:scale-95",
              activeTab === 'notes' ? "bg-[var(--accent-primary)] text-white shadow-sm" : "text-text-muted hover:text-white hover:bg-bg-hover/50"
            )}
          >
            <FileText size={14} /> Notes
          </button>
        </div>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
          className="ml-4 text-text-muted hover:text-white p-1.5 rounded-lg hover:bg-bg-card transition-all shrink-0 active:scale-95"
        >
          <X size={16} className="transition-transform duration-300 hover:rotate-90" />
        </button>
      </div>

      {activeTab !== 'notes' && (
        <div className="p-4 shrink-0 bg-bg-main">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-bg-card border border-transparent focus:border-[rgba(255,107,53,0.5)] rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-[var(--text-muted)]/50 focus:outline-none transition-all"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {activeTab === 'snippets' ? (
          filteredSnippets.length > 0 ? (
            filteredSnippets.map((snippet) => (
              <div key={snippet.id} className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 group transition-all hover:border-[rgba(255,255,255,0.1)] shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                <p className="text-white font-serif text-sm leading-relaxed line-clamp-4 mb-3">
                  {snippet.content}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {snippet.category && <span className="flex items-center gap-1 bg-bg-card px-2 py-1 rounded-md font-medium"><Tag size={10} className="text-accent-primary" /> {snippet.category}</span>}
                  </div>
                  <button
                    onClick={() => handleCopy(snippet.content)}
                    className="text-text-muted hover:text-white flex items-center gap-1 text-xs font-bold transition-all hover:bg-bg-card px-2 py-1 rounded-md active:scale-95"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="relative mb-4 group">
                <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="w-16 h-16 bg-bg-card rounded-2xl flex items-center justify-center relative z-10 shadow-lg">
                  <Archive size={24} className="text-accent-primary" />
                </div>
              </div>
              <p className="text-white font-bold text-sm mb-1">Vault is Empty</p>
              <p className="text-text-muted text-xs">Add snippets from the main Vault view.</p>
            </div>
          )
        ) : activeTab === 'staging' ? (
          filteredStaging.length > 0 ? (
            filteredStaging.map((item) => (
              <div key={item.id} className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 group transition-all hover:border-[rgba(255,255,255,0.1)] shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
                <p className="text-white font-serif text-sm leading-relaxed line-clamp-4 mb-3">
                  {item.content}
                </p>
                <div className="flex items-center justify-end mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <button
                    onClick={() => handleCopy(item.content)}
                    className="text-text-muted hover:text-white flex items-center gap-1 text-xs font-bold transition-all hover:bg-bg-card px-2 py-1 rounded-md active:scale-95"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="relative mb-4 group">
                <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="w-16 h-16 bg-bg-card rounded-2xl flex items-center justify-center relative z-10 shadow-lg">
                  <Layers size={24} className="text-accent-primary" />
                </div>
              </div>
              <p className="text-white font-bold text-sm mb-1">Shelf is Empty</p>
              <p className="text-text-muted text-xs">Add items from the main Staging view.</p>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col pt-4">
            {activeScene ? (
              <>
                <div className="flex items-center gap-2 mb-4 text-accent-primary ml-1">
                  <PenLine size={16} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Scene Notes</h3>
                </div>
                <textarea
                  value={activeScene.notes || ''}
                  onChange={handleNotesChange}
                  placeholder="Jot down ideas, reminders, or scratchpad notes for this scene..."
                  className="flex-1 w-full bg-bg-card border border-transparent focus:border-[rgba(255,107,53,0.5)] rounded-2xl p-4 text-white text-sm focus:outline-none resize-none font-serif leading-relaxed placeholder-[var(--text-muted)]/50 transition-all"
                />
              </>
            ) : (
              <div className="text-center text-text-muted text-sm mt-8">Select a scene to view notes.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};;
