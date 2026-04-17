import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Copy, Trash2, Plus, Layers } from 'lucide-react';
import { ShelfGraphic } from './Graphics';

export const StagingShelf: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [newContent, setNewContent] = useState('');

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

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-main h-full overflow-hidden">
      <div className="p-8 pb-6 shrink-0">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-white mb-6">
            <Layers className="text-accent-primary" size={28} />
            <h2 className="text-3xl font-bold tracking-wide">Staging Shelf</h2>
          </div>
          <p className="text-text-muted text-sm mb-6 ml-1">
            A lightweight holding area for large pasted plain-text chunks.
          </p>
          
          <div className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col gap-4 shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Paste large text blocks here..."
              className="w-full bg-bg-card border border-transparent focus:border-[rgba(255,107,53,0.5)] rounded-2xl p-4 text-white placeholder-[var(--text-muted)]/50 focus:outline-none resize-none h-32 font-serif leading-relaxed transition-all"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={!newContent.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[#e85d2c] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,107,53,0.3)] active:scale-95 group"
              >
                <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" /> Add to Shelf
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 pt-2">
        <div className="max-w-4xl mx-auto space-y-8">
          {state.stagingItems.map((item) => (
            <div key={item.id} className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-6 group transition-all relative hover:-translate-y-1 hover:border-[rgba(255,255,255,0.1)] shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)]">
              <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(item.content)}
                  className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-bg-card transition-all active:scale-95"
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => dispatch({ type: 'DELETE_STAGING_ITEM', payload: item.id })}
                  className="text-text-muted hover:text-red-400 p-2 rounded-lg hover:bg-bg-card transition-all active:scale-95"
                  title="Delete item"
                >
                  <Trash2 size={16} className="transition-transform duration-300 hover:scale-110" />
                </button>
              </div>
              <p className="text-white font-serif whitespace-pre-wrap text-sm leading-relaxed pr-24">
                {item.content}
              </p>
            </div>
          ))}
          {state.stagingItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="max-w-sm w-full flex flex-col items-center text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[var(--accent-primary)] blur-[80px] rounded-full opacity-20 pointer-events-none" />
                <div className="mb-6 relative group">
                  <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                  <ShelfGraphic className="w-24 h-24 relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Shelf is Empty</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  Paste large text blocks here to keep them handy while you write.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
