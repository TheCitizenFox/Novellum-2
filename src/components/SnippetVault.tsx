import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Copy, Trash2, Tag, FileText, MessageSquare, Archive } from 'lucide-react';
import { cn } from '../utils/cn';
import { VaultGraphic } from './Graphics';

export const SnippetVault: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [newSnippetContent, setNewSnippetContent] = useState('');
  const [newSnippetCategory, setNewSnippetCategory] = useState('');
  const [newSnippetSource, setNewSnippetSource] = useState('');
  const [newSnippetComment, setNewSnippetComment] = useState('');

  const handleAddSnippet = () => {
    if (!newSnippetContent.trim()) return;
    dispatch({
      type: 'ADD_SNIPPET',
      payload: {
        id: crypto.randomUUID(),
        content: newSnippetContent,
        category: newSnippetCategory,
        sourceNote: newSnippetSource,
        comment: newSnippetComment,
      },
    });
    setNewSnippetContent('');
    setNewSnippetCategory('');
    setNewSnippetSource('');
    setNewSnippetComment('');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-main h-full overflow-hidden">
      <div className="p-8 pb-6 shrink-0">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-white mb-6">
            <Archive size={28} className="text-accent-primary" />
            <h2 className="text-3xl font-bold tracking-wide">Snippet Vault</h2>
          </div>
          
          <div className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col gap-4 shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider ml-1">Add New Snippet</h3>
            <textarea
              value={newSnippetContent}
              onChange={(e) => setNewSnippetContent(e.target.value)}
              placeholder="Paste or type a new snippet here..."
              className="w-full bg-bg-card border border-transparent focus:border-[rgba(255,107,53,0.5)] rounded-2xl p-4 text-white placeholder-[var(--text-muted)]/50 focus:outline-none resize-none h-24 font-serif leading-relaxed transition-all"
            />
            <div className="flex gap-4">
              <div className="flex-1 flex items-center gap-3 bg-bg-card border border-transparent focus-within:border-[rgba(255,107,53,0.5)] rounded-xl px-4 py-2.5 transition-all">
                <Tag size={14} className="text-text-muted" />
                <input
                  type="text"
                  value={newSnippetCategory}
                  onChange={(e) => setNewSnippetCategory(e.target.value)}
                  placeholder="Category"
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-[var(--text-muted)]/50 w-full focus:ring-0"
                />
              </div>
              <div className="flex-1 flex items-center gap-3 bg-bg-card border border-transparent focus-within:border-[rgba(255,107,53,0.5)] rounded-xl px-4 py-2.5 transition-all">
                <FileText size={14} className="text-text-muted" />
                <input
                  type="text"
                  value={newSnippetSource}
                  onChange={(e) => setNewSnippetSource(e.target.value)}
                  placeholder="Source Note"
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-[var(--text-muted)]/50 w-full focus:ring-0"
                />
              </div>
              <div className="flex-1 flex items-center gap-3 bg-bg-card border border-transparent focus-within:border-[rgba(255,107,53,0.5)] rounded-xl px-4 py-2.5 transition-all">
                <MessageSquare size={14} className="text-text-muted" />
                <input
                  type="text"
                  value={newSnippetComment}
                  onChange={(e) => setNewSnippetComment(e.target.value)}
                  placeholder="Comment"
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-[var(--text-muted)]/50 w-full focus:ring-0"
                />
              </div>
              <button
                onClick={handleAddSnippet}
                disabled={!newSnippetContent.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[#e85d2c] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_15px_rgba(255,107,53,0.3)] active:scale-95 group"
              >
                <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {state.snippets.map((snippet) => (
            <div key={snippet.id} className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col group transition-all hover:-translate-y-1 hover:border-[rgba(255,255,255,0.1)] shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
              <div className="flex-1 mb-6">
                <p className="text-white font-serif whitespace-pre-wrap text-sm leading-relaxed line-clamp-6">
                  {snippet.content}
                </p>
              </div>
              
              <div className="space-y-3 mb-6 text-xs text-text-muted">
                {snippet.category && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-bg-card px-2.5 py-1 rounded-md font-medium">
                      <Tag size={12} className="text-accent-primary" /> {snippet.category}
                    </span>
                  </div>
                )}
                {snippet.sourceNote && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-bg-card px-2.5 py-1 rounded-md font-medium">
                      <FileText size={12} className="text-accent-hover" /> {snippet.sourceNote}
                    </span>
                  </div>
                )}
                {snippet.comment && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-bg-card px-2.5 py-1 rounded-md font-medium">
                      <MessageSquare size={12} className="text-orange-400" /> {snippet.comment}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  onClick={() => handleCopy(snippet.content)}
                  className="text-text-muted hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all hover:bg-bg-card px-2.5 py-1.5 rounded-md active:scale-95"
                >
                  <Copy size={14} /> Copy
                </button>
                <button
                  onClick={() => dispatch({ type: 'DELETE_SNIPPET', payload: snippet.id })}
                  className="text-text-muted hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 hover:bg-bg-card p-1.5 rounded-md active:scale-95"
                >
                  <Trash2 size={16} className="transition-transform duration-300 hover:scale-110" />
                </button>
              </div>
            </div>
          ))}
          {state.snippets.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-20">
              <div className="max-w-sm w-full flex flex-col items-center text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[var(--accent-primary)] blur-[80px] rounded-full opacity-20 pointer-events-none" />
                <div className="mb-6 relative group">
                  <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <VaultGraphic className="w-24 h-24 relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Vault is Empty</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  Your snippet vault is empty. Add your first fragment above.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
