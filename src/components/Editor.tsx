import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { cleanText } from '../utils/cleanup';
import { Wand2, ArrowLeft, Bold, Italic, Type, Quote, List } from 'lucide-react';
import { NotebookGraphic } from './Graphics';

export const Editor: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const activeScene = state.project.chapters
    .flatMap(c => c.scenes)
    .find(s => s.id === state.activeSceneId);

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (activeScene) {
      setContent(activeScene.content);
      setTitle(activeScene.title);
    }
  }, [activeScene?.id]);

  if (!activeScene) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-main p-8">
        <div className="max-w-md w-full bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl p-12 flex flex-col items-center text-center relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[var(--accent-primary)] blur-[80px] rounded-full opacity-20 pointer-events-none" />
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-[var(--accent-primary)] rounded-[2rem] blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <NotebookGraphic className="w-28 h-28 relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-wide">No Scene Selected</h3>
          <p className="text-text-muted text-sm leading-relaxed">
            Select a scene from the sidebar to start writing, or create a new one to capture your next brilliant idea.
          </p>
        </div>
      </div>
    );
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    dispatch({
      type: 'UPDATE_SCENE_CONTENT',
      payload: { id: activeScene.id, content: e.target.value },
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    dispatch({
      type: 'UPDATE_SCENE_METADATA',
      payload: { id: activeScene.id, metadata: { title: e.target.value } },
    });
  };

  const handleCleanup = () => {
    const cleaned = cleanText(content, state.settings);
    setContent(cleaned);
    dispatch({
      type: 'UPDATE_SCENE_CONTENT',
      payload: { id: activeScene.id, content: cleaned },
    });
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    
    setContent(newContent);
    dispatch({
      type: 'UPDATE_SCENE_CONTENT',
      payload: { id: activeScene.id, content: newContent },
    });
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main overflow-hidden">
      {/* Minimal Header */}
      <div className="h-16 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-4 md:px-6 shrink-0 bg-bg-panel">
        <div className="flex items-center gap-3 md:gap-4 flex-1">
          <button 
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'cards' })}
            className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-bg-card transition-colors active:scale-95"
            title="Back to Scene Cards"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-px h-6 bg-[rgba(255,255,255,0.1)]" />
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Scene Title"
            className="text-lg md:text-xl font-bold bg-transparent border-none outline-none text-white placeholder-[var(--text-muted)]/50 flex-1 min-w-0 focus:ring-0"
          />
        </div>
        <button
          onClick={handleCleanup}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-hover text-accent-primary rounded-lg text-sm font-bold transition-all shrink-0 shadow-sm active:scale-95 group ml-2 md:ml-4"
          title="Clean up scene text"
        >
          <Wand2 size={16} className="transition-transform duration-300 group-hover:rotate-12" />
          <span className="hidden sm:inline">Clean Text</span>
        </button>
      </div>

      {/* Formatting Toolbar */}
      <div className="h-10 border-b border-[rgba(255,255,255,0.02)] flex items-center px-4 md:px-6 shrink-0 bg-bg-main gap-1">
        <button onClick={() => insertFormatting('**', '**')} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Bold">
          <Bold size={14} />
        </button>
        <button onClick={() => insertFormatting('*', '*')} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Italic">
          <Italic size={14} />
        </button>
        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1" />
        <button onClick={() => insertFormatting('## ')} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Heading">
          <Type size={14} />
        </button>
        <button onClick={() => insertFormatting('> ')} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Quote">
          <Quote size={14} />
        </button>
        <button onClick={() => insertFormatting('- ')} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="List">
          <List size={14} />
        </button>
      </div>

      {/* Pure Writing Area */}
      <div className="flex-1 overflow-hidden relative bg-bg-main">
        <div className="max-w-4xl mx-auto h-full p-4 md:p-8">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Start drafting your scene here..."
            className="w-full h-full resize-none bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed focus:outline-none font-sans placeholder-[var(--text-muted)]/30 no-scrollbar pb-32"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
