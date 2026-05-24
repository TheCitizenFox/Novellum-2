import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { cleanText } from '../utils/cleanup';
import { Wand2, ArrowLeft, Bold, Italic, Type, Quote, List, Undo2, Redo2, Columns, ChevronDown, ChevronUp, TextSelect } from 'lucide-react';
import { NotebookGraphic } from './Graphics';
import { cn } from '../utils/cn';
import { FeatureBadge } from './FeatureBadge';
import { motion, AnimatePresence } from 'motion/react';
import { RichTextEditor, RichTextEditorRef } from './RichTextEditor';
import Markdown from 'react-markdown';

const findSentenceAt = (text: string, pos: number) => {
  if (!text) return { start: 0, end: 0 };
  let start = Math.min(pos, text.length - 1);
  // scan backward
  while (start > 0) {
    if (start < text.length) {
      const prev2 = text.substring(Math.max(0, start - 2), start);
      if (/[.!?]['"]?\s/.test(prev2) || text[start - 1] === '\n') {
        break;
      }
    }
    start--;
  }
  // snap forward over whitespace
  while (start < text.length && /\s/.test(text[start])) start++;

  let end = Math.max(start, pos);
  while (end < text.length) {
    if (text[end] === '\n') break;
    if (/[.!?]/.test(text[end])) {
      let nextIdx = end + 1;
      if (nextIdx < text.length && /['"]/.test(text[nextIdx])) nextIdx++;
      if (nextIdx >= text.length || /\s/.test(text[nextIdx])) {
        end = nextIdx;
        break;
      }
    }
    end++;
  }
  return { start, end };
};

const findParagraphAt = (text: string, pos: number) => {
  if (!text) return { start: 0, end: 0 };
  let start = Math.min(pos, text.length - 1);
  while (start > 0 && text[start - 1] !== '\n') start--;
  let end = Math.max(start, pos);
  while (end < text.length && text[end] !== '\n') end++;
  return { start, end };
};



export const Editor: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const activeEditorRef = useRef<any>(null);
  
  const allChapters = state.project.chapters;
  const allSnippets = state.snippets;

  const activeScene = allChapters
    .flatMap(c => c.scenes)
    .find(s => s.id === state.activeSceneId);

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  
  // Cleanup undo UX state
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<any>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  // Quick Copy State
  const [isQuickCopy, setIsQuickCopy] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const copyToastTimeout = useRef<number | null>(null);
  const quickCopyRef = useRef({
    holdTimer: null as number | null,
    startX: 0,
    startY: 0,
    held: false,
    anchorPos: -1,
    endPos: -1,
  });

  // Split Screen State
  const [isSplit, setIsSplit] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [referenceId, setReferenceId] = useState('');
  const [mobileRefExpanded, setMobileRefExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeScene) {
      setContent(activeScene.content);
      setTitle(activeScene.title);
    }
    // Reset undo state when changing scenes
    setShowUndo(false);
    setPreviousContent(null);
    setCleanupStats(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }, [activeScene?.id]);

  // Sync content state when parent activeScene.content changes externally (e.g. Undo/Redo/Clean)
  useEffect(() => {
    if (activeScene && activeScene.content !== content) {
      setContent(activeScene.content);
    }
  }, [activeScene?.content]);

  // Auto-select reference
  useEffect(() => {
    if (isSplit && !referenceId) {
      const firstChapter = allChapters[0];
      if (firstChapter?.scenes?.length > 0) {
        setReferenceId(`scene:${firstChapter.scenes[0].id}`);
      } else if (allSnippets.length > 0) {
        setReferenceId(`snippet:${allSnippets[0].id}`);
      }
    }
  }, [isSplit, referenceId, allChapters, allSnippets]);

  // Handle Dragging
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.max(20, Math.min(newRatio, 80)));
    };
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  let refContent = '';
  if (referenceId.startsWith('scene:')) {
    const id = referenceId.replace('scene:', '');
    for (const chap of allChapters) {
      const s = chap.scenes.find(x => x.id === id);
      if (s) { refContent = s.content; break; }
    }
  } else if (referenceId.startsWith('snippet:')) {
    const id = referenceId.replace('snippet:', '');
    const s = allSnippets.find(x => x.id === id);
    if (s) refContent = s.content;
  }

  useEffect(() => {
    if (!isQuickCopy) {
      quickCopyRef.current.anchorPos = -1;
      quickCopyRef.current.endPos = -1;
    }
  }, [isQuickCopy]);

  const executeCopy = (start: number, end: number, label: string) => {
    // Disabled Native Quick Copy due to RTE
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Disabled Native Quick Copy due to RTE
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    // Disabled Native Quick Copy due to RTE
  };

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
    // Hide undo button once the user starts manually typing again
    if (showUndo) {
      setShowUndo(false);
      setPreviousContent(null);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    dispatch({
      type: 'UPDATE_SCENE_METADATA',
      payload: { id: activeScene.id, metadata: { title: e.target.value } },
    });
  };

  const handleCleanup = () => {
    const result = cleanText(content, state.settings);
    if (result.text !== content) {
      setPreviousContent(content);
      setContent(result.text);
      setCleanupStats(result.stats);
      dispatch({
        type: 'UPDATE_SCENE_CONTENT',
        payload: { id: activeScene.id, content: result.text },
      });
      
      // Trigger animations and undo state
      setShowUndo(true);
      
      // Auto-hide undo after 10 seconds
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = window.setTimeout(() => {
        setShowUndo(false);
      }, 10000);
    }
  };

  const handleUndoCleanup = () => {
    if (previousContent !== null) {
      setContent(previousContent);
      dispatch({
        type: 'UPDATE_SCENE_CONTENT',
        payload: { id: activeScene.id, content: previousContent },
      });
      setShowUndo(false);
      setPreviousContent(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  // Handle setting active editor
  const handleEditorFocus = (editorInstance: any) => {
    activeEditorRef.current = editorInstance;
  };

  const applyFormatting = (format: string, attrs?: any) => {
    if (!activeEditorRef.current) return;
    
    const editor = activeEditorRef.current;
    
    switch (format) {
      case 'bold': editor.chain().focus().toggleBold().run(); break;
      case 'italic': editor.chain().focus().toggleItalic().run(); break;
      case 'heading': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'bulletList': editor.chain().focus().toggleBulletList().run(); break;
    }
    
    if (showUndo) {
      setShowUndo(false);
      setPreviousContent(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main overflow-hidden">
      {/* Minimal Header */}
      <div className="h-16 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-4 md:px-6 shrink-0 bg-bg-panel relative z-20">
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
        <div className="relative">
          <FeatureBadge number={3} position="custom" className="-top-2 -right-2" />
          <div className="relative group/cleanup">
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-hover text-accent-primary rounded-lg text-sm font-bold transition-all shrink-0 shadow-sm active:scale-95 group ml-2 md:ml-4"
              title="Clean up text"
            >
              <Wand2 size={16} className="transition-transform duration-300 group-hover:rotate-12" />
              <span className="hidden sm:inline">Clean Text</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-bg-panel border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/cleanup:opacity-100 group-hover/cleanup:translate-y-0 group-hover/cleanup:pointer-events-auto transition-all duration-200 z-50">
              <button
                onClick={() => {
                  let textToClean;
                  let isSelection = false;
                  const sel = window.getSelection();
                  if (sel && sel.toString().trim()) {
                    textToClean = sel.toString();
                    isSelection = true;
                  }

                  if (isSelection && textToClean && activeEditorRef.current) {
                     const result = cleanText(textToClean, state.settings);
                     if (result.text !== textToClean) {
                       const editor = activeEditorRef.current;
                       editor.chain().focus().insertContent(result.text).run();
                       setCleanupStats(result.stats);
                       setShowUndo(true);
                       if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                       undoTimeoutRef.current = window.setTimeout(() => setShowUndo(false), 10000);
                     }
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Clean Selection
              </button>
              <button
                onClick={handleCleanup}
                className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Clean Scene
              </button>
              <button
                onClick={() => {
                  const currentChapter = state.project.chapters.find(c => c.scenes.some(s => s.id === activeScene.id));
                  if (!currentChapter) return;
                  currentChapter.scenes.forEach(scene => {
                    const res = cleanText(scene.content, state.settings);
                    if (res.text !== scene.content) {
                       dispatch({ type: 'UPDATE_SCENE_CONTENT', payload: { id: scene.id, content: res.text }});
                    }
                  });
                }}
                className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Clean Chapter
              </button>
              <button
                onClick={() => {
                  state.project.chapters.forEach(c => c.scenes.forEach(scene => {
                    const res = cleanText(scene.content, state.settings);
                    if (res.text !== scene.content) {
                       dispatch({ type: 'UPDATE_SCENE_CONTENT', payload: { id: scene.id, content: res.text }});
                    }
                  }));
                }}
                className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Clean Entire Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="h-10 border-b border-[rgba(255,255,255,0.02)] flex items-center px-4 md:px-6 shrink-0 bg-bg-main gap-1 relative z-20">
        <button onPointerDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Bold">
          <Bold size={14} />
        </button>
        <button onPointerDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Italic">
          <Italic size={14} />
        </button>
        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1" />
        <button onPointerDown={(e) => { e.preventDefault(); applyFormatting('heading'); }} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Heading">
          <Type size={14} />
        </button>
        <button onPointerDown={(e) => { e.preventDefault(); applyFormatting('blockquote'); }} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="Quote">
          <Quote size={14} />
        </button>
        <button onPointerDown={(e) => { e.preventDefault(); applyFormatting('bulletList'); }} className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors" title="List">
          <List size={14} />
        </button>
        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1" />
        <div className="flex-1" />
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.pastProjects.length === 0}
          className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={state.futureProjects.length === 0}
          className="p-1.5 text-text-muted hover:text-white hover:bg-bg-panel rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo2 size={14} />
        </button>
        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1" />
        <div className="relative">
          <FeatureBadge number={5} position="custom" className="-top-2 -right-2" />
          <button 
            onClick={() => setIsSplit(!isSplit)}
            className={cn("p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-bold", isSplit ? "bg-[rgba(255,107,53,0.1)] text-accent-primary" : "text-text-muted hover:text-white hover:bg-bg-panel")}
            title="Toggle Split Screen Reference"
          >
            <Columns size={14} />
            <span className="hidden sm:inline">Split Screen</span>
          </button>
        </div>
      </div>

      {/* Split Area Container */}
      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row min-h-0 min-w-0" ref={containerRef}>
        
        {/* Left Pane (Reference) */}
        <AnimatePresence initial={false}>
        {isSplit && (
          <motion.div 
            initial={{ width: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ width: isDesktop ? `${splitRatio}%` : '100%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "flex flex-col border-b md:border-b-0 md:border-r border-[rgba(255,255,255,0.05)] bg-bg-panel/30 shrink-0",
              !isDesktop && mobileRefExpanded ? "h-[50%]" : "",
              !isDesktop && !mobileRefExpanded ? "h-12 border-b-2 border-transparent" : "md:h-auto"
            )}
            style={isDesktop ? { flex: 'none' } : undefined}
          >
            {/* Reference Header */}
            <div className="h-12 md:h-12 flex items-center px-4 shrink-0 justify-between bg-bg-card/50 border-b border-[rgba(255,255,255,0.05)]">
              <select
                value={referenceId}
                onChange={e => setReferenceId(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-bold text-white max-w-[200px] sm:max-w-xs overflow-hidden text-ellipsis whitespace-nowrap focus:ring-0 cursor-pointer"
              >
                <option value="" disabled className="bg-bg-panel">Select Reference</option>
                {allChapters.map(chap => (
                  <optgroup key={chap.id} label={`Chapter: ${chap.title}`} className="bg-bg-panel text-text-muted">
                    {chap.scenes.map(s => (
                      <option key={`scene:${s.id}`} value={`scene:${s.id}`} className="text-white">
                        {s.title || 'Untitled Scene'}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {allSnippets.length > 0 && (
                  <optgroup label="Vault Snippets" className="bg-bg-panel text-text-muted">
                    {allSnippets.map(s => (
                      <option key={`snippet:${s.id}`} value={`snippet:${s.id}`} className="text-white">
                        {s.category || 'Snippet'}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              
              {/* Mobile toggle */}
              {!isDesktop && (
                <button 
                  onClick={() => setMobileRefExpanded(!mobileRefExpanded)} 
                  className="p-2 text-text-muted hover:text-white"
                >
                  {mobileRefExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>

            {/* Reference Body */}
            <div className={cn("flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar", !isDesktop && !mobileRefExpanded && "hidden")}>
              <div className="text-[#f4f4f5]/60 text-sm md:text-base leading-relaxed font-sans select-text selection:bg-[var(--accent-primary)]/30 prose prose-invert prose-p:leading-relaxed prose-p:mb-4 max-w-none">
                {refContent ? <Markdown>{refContent}</Markdown> : 'No content found.'}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Divider */}
        {isSplit && isDesktop && (
          <div 
            className="w-1.5 md:w-2 bg-transparent hover:bg-[var(--accent-primary)]/50 active:bg-[var(--accent-primary)] cursor-col-resize z-50 shrink-0 transition-colors"
            onMouseDown={startDrag}
          />
        )}
        
        {/* Right Pane (Live Editor) */}
        <div className="flex-1 overflow-hidden relative bg-bg-main shrink-0 group/editorpane min-h-0 min-w-0">
          <FeatureBadge number={2} position="custom" className="top-8 right-8" />
          {copyToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-accent-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-in fade-in slide-in-from-top-2">
              {copyToast}
            </div>
          )}
          <div className="max-w-4xl mx-auto h-full p-4 md:p-8 relative overflow-y-auto no-scrollbar">
            {activeScene.beats && activeScene.beats.length > 0 ? (
              <div className="flex flex-col gap-10 pb-32">
                {activeScene.beats.map((beat, index) => (
                  <div key={beat.id} className="relative group/beat rounded-xl transition-all duration-500 ease-out py-6 px-6 md:px-8 -mx-6 md:-mx-8">
                    {/* Expanding semi-transparent background color block overlay */}
                    <div className="absolute inset-0 rounded-xl transition-all duration-500 pointer-events-none opacity-0 scale-[0.97] bg-gradient-to-br from-[var(--accent-primary)]/[0.08] via-[var(--accent-primary)]/[0.03] to-transparent border border-[var(--accent-primary)]/15 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] group-focus-within/beat:opacity-100 group-focus-within/beat:scale-[1.01] group-hover/beat:opacity-40 group-hover/beat:scale-[0.99] group-focus-within/beat:group-hover/beat:opacity-100 group-focus-within/beat:group-hover/beat:scale-[1.01]" style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }} />
                    
                    {/* Left glow indicator */}
                    <div className="absolute left-0 top-4 bottom-4 w-1 bg-transparent group-hover/beat:bg-[var(--accent-primary)]/35 group-focus-within/beat:bg-[var(--accent-primary)] transition-all duration-500 rounded-full" />
                    
                    <div className="relative z-10">
                      <div className="mb-4 flex items-center justify-between opacity-60 group-focus-within/beat:opacity-100 group-hover/beat:opacity-100 transition-opacity duration-300">
                        <h4 className="text-sm font-bold text-[var(--accent-primary)] tracking-wide flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--accent-primary)]/10 text-xs font-mono shadow-[inset_0_0_0_1px_var(--accent-primary)] shadow-[var(--accent-primary)]/20">
                            {index + 1}
                          </span>
                          <span>{beat.label}</span>
                        </h4>
                      </div>
                      <div className="pl-6 border-l border-dashed border-[var(--accent-primary)]/20 group-focus-within/beat:border-transparent transition-colors duration-500 ml-3 min-h-[4rem]">
                        <RichTextEditor
                          key={beat.id}
                          value={beat.content}
                          onChange={(value) => dispatch({
                            type: 'UPDATE_BEAT_CONTENT',
                            payload: { sceneId: activeScene.id, beatId: beat.id, content: value }
                          })}
                          onFocus={(editor) => handleEditorFocus(editor)}
                          ref={(r) => {
                            if (r?.editor && r.editor.isFocused) {
                              handleEditorFocus(r.editor);
                            }
                          }}
                          placeholder="Flesh out this beat..."
                          className={cn(
                            "w-full bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed transition-colors",
                          )}
                          readOnly={isQuickCopy}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.05)]">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Additional Content</h4>
                  <RichTextEditor
                    key={activeScene.id + '_additional'}
                    value={content}
                    onChange={(val) => handleContentChange({ target: { value: val }} as any)}
                    onFocus={(editor) => handleEditorFocus(editor)}
                    ref={(r) => {
                      if (r?.editor && r.editor.isFocused) {
                        handleEditorFocus(r.editor);
                      }
                    }}
                    placeholder="Continue your scene here..."
                    className={cn(
                      "w-full bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed",
                    )}
                    readOnly={isQuickCopy}
                  />
                </div>
              </div>
            ) : (
              <RichTextEditor
                key={activeScene.id}
                value={content}
                onChange={(val) => handleContentChange({ target: { value: val }} as any)}
                onFocus={(editor) => handleEditorFocus(editor)}
                ref={(r) => {
                  if (r?.editor && r.editor.isFocused) {
                    handleEditorFocus(r.editor);
                  }
                }}
                placeholder="Start drafting your scene here..."
                className={cn(
                  "w-full h-full bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed no-scrollbar pb-32",
                )}
                readOnly={isQuickCopy}
              />
            )}
            
            {/* Undo Toast */}
            <div className={cn(
              "absolute bottom-8 right-8 z-50 flex items-center gap-4 bg-bg-panel border border-[rgba(255,255,255,0.1)] px-5 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300",
              showUndo ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
            )}>
              <div className="flex flex-col gap-0.5 pr-4 border-r border-[rgba(255,255,255,0.1)] mr-1">
                <span className="text-sm text-white font-bold tracking-wide">Text Cleaned</span>
                {cleanupStats && (
                  <div className="flex flex-col gap-1 mt-1 text-xs text-text-muted font-mono max-h-32 overflow-y-auto no-scrollbar">
                    {Object.keys(cleanupStats.removed).length > 0 && (
                      <div className="leading-tight">
                        <span className="text-white/70">removed: </span>
                        {Object.entries(cleanupStats.removed).map(([k, v]) => `${k} = ${v}`).join(', ')}
                      </div>
                    )}
                    {Object.keys(cleanupStats.modified).length > 0 && (
                      <div className="leading-tight">
                        <span className="text-white/70">modified: </span>
                        {Object.entries(cleanupStats.modified).map(([k, v]) => `${k} -> ${v}`).join(', ')}
                      </div>
                    )}
                    {cleanupStats.formattingFixed > 0 && (
                      <div className="leading-tight">
                        <span className="text-white/70">formatting: </span>
                        {cleanupStats.formattingFixed} minor fixes
                      </div>
                    )}
                    {Object.keys(cleanupStats.removed).length === 0 && Object.keys(cleanupStats.modified).length === 0 && cleanupStats.formattingFixed === 0 && (
                      <div>No changes necessary.</div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleUndoCleanup}
                className="flex items-center gap-1.5 text-sm font-bold text-accent-primary hover:text-white transition-colors bg-[rgba(255,107,53,0.1)] hover:bg-[var(--accent-primary)] px-4 py-2 rounded-lg active:scale-95 shrink-0"
              >
                <Undo2 size={16} /> Undo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
