import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Copy, Trash2, Plus, MessageSquare, Check } from 'lucide-react';
import { ShelfGraphic } from './Graphics';
import { cn } from '../utils/cn';

export const StagingShelf: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [newContent, setNewContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    dispatch({
      type: 'ADD_STAGING_ITEM',
      payload: {
        id: crypto.randomUUID(),
        content: newContent,
      },
    });
    setNewContent('');
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-main h-full overflow-hidden">
      <div className="p-8 pb-6 shrink-0">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-white mb-6">
            <MessageSquare className="text-accent-primary" size={28} />
            <h2 className="text-3xl font-bold tracking-wide">Library</h2>
          </div>
          <p className="text-text-muted text-sm mb-6 ml-1">
            Store and quickly transport text, instructions, and context to LLMs and other platforms.
          </p>
          
          <div className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col gap-4 shadow-[0_4px_15px_rgba(0,0,0,0.2)] focus-within:border-[rgba(255,107,53,0.3)] transition-colors duration-300">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste prompt instructions, context blocks, or transport text here..."
              className="w-full bg-bg-card border border-transparent focus:border-[rgba(255,107,53,0.5)] rounded-2xl p-4 text-white placeholder-[var(--text-muted)]/50 focus:outline-none resize-none h-32 font-serif leading-relaxed transition-all"
            />
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAdd}
                disabled={!newContent.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[#e85d2c] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,107,53,0.3)] hover:shadow-[0_0_20px_rgba(255,107,53,0.5)] active:scale-95 group"
              >
                <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" /> Add to Library
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-2">
        <div className="max-w-4xl mx-auto space-y-6">
          {state.stagingItems.map((item) => (
            <div key={item.id} className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-5 flex flex-col gap-4 group transition-all relative hover:-translate-y-1 hover:border-[rgba(255,255,255,0.1)] shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
              <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => dispatch({ type: 'DELETE_STAGING_ITEM', payload: item.id })}
                  className="text-text-muted hover:text-red-400 p-2 rounded-lg hover:bg-bg-card transition-all active:scale-95"
                  title="Delete item"
                >
                  <Trash2 size={16} className="transition-transform duration-300 hover:scale-110" />
                </button>
              </div>
              <div className="pr-12 text-white font-serif whitespace-pre-wrap text-sm leading-relaxed max-h-60 overflow-y-auto no-scrollbar">
                {item.content}
              </div>
              
              <div className="flex justify-start pt-2 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  onClick={() => handleCopy(item.id, item.content)}
                  className={cn(
                    "flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95",
                    copiedId === item.id 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                      : "bg-bg-card hover:bg-[rgba(255,255,255,0.05)] text-text-muted hover:text-white border border-[rgba(255,255,255,0.05)]"
                  )}
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={16} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="transition-transform duration-300 group-hover:scale-110" /> Copy Context
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
          {state.stagingItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="max-w-sm w-full flex flex-col items-center text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[var(--accent-primary)] blur-[80px] rounded-full opacity-20 pointer-events-none" />
                <div className="mb-6 relative group">
                  <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <MessageSquare className="w-24 h-24 text-[rgba(255,255,255,0.1)] relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Library is Empty</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  Store prompt instructions or text constraints that you need to jump between AI models and your manuscript.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

