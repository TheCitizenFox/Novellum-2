import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { cleanText } from '../utils/cleanup';
import { Wand2, ArrowLeft, Bold, Italic, Type, Quote, List, Undo2, Redo2, Columns, ChevronDown, ChevronUp, TextSelect } from 'lucide-react';
import { NotebookGraphic } from './Graphics';
import { cn } from '../utils/cn';
import { FeatureBadge } from './FeatureBadge';
import { motion, AnimatePresence } from 'motion/react';

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

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  onPointerDown?: React.PointerEventHandler<HTMLTextAreaElement>;
  onPointerUp?: React.PointerEventHandler<HTMLTextAreaElement>;
  readOnly?: boolean;
}> = ({ value, onChange, placeholder, className, onPointerDown, onPointerUp, readOnly }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      placeholder={placeholder}
      readOnly={readOnly}
      spellCheck={false}
      className={cn("overflow-hidden block relative -ml-1 pl-1", className)}
      style={{ minHeight: '60px' }}
    />
  );
};

export const Editor: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    if (!textareaRef.current) return;
    const text = content.substring(start, end).trim();
    if (!text) return;
    
    textareaRef.current.focus(); // required for iOS visual highlight
    textareaRef.current.setSelectionRange(start, end);
    quickCopyRef.current.anchorPos = start;
    quickCopyRef.current.endPos = end;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(`Copied ${label}`);
      if (copyToastTimeout.current) clearTimeout(copyToastTimeout.current);
      copyToastTimeout.current = window.setTimeout(() => setCopyToast(null), 2000);
    }).catch(e => {
      console.error("Clipboard failure", e);
      setCopyToast(`Selected ${label} (Copy blocked)`);
      if (copyToastTimeout.current) clearTimeout(copyToastTimeout.current);
      copyToastTimeout.current = window.setTimeout(() => setCopyToast(null), 2000);
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    if (!isQuickCopy) return;
    const ref = quickCopyRef.current;
    ref.startX = e.clientX;
    ref.startY = e.clientY;
    ref.held = false;
    
    if (ref.holdTimer) clearTimeout(ref.holdTimer);
    ref.holdTimer = window.setTimeout(() => {
      ref.held = true;
      if (!textareaRef.current) return;
      const pos = textareaRef.current.selectionStart;
      const bounds = findParagraphAt(content, pos);
      executeCopy(bounds.start, bounds.end, 'Paragraph');
    }, 500);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLTextAreaElement>) => {
    if (!isQuickCopy) return;
    const ref = quickCopyRef.current;
    if (ref.holdTimer) clearTimeout(ref.holdTimer);
    
    if (ref.held) return;
    if (Math.hypot(e.clientX - ref.startX, e.clientY - ref.startY) > 10) return; // Dragged

    // It's a tap. Wait slightly for browser to update selectionStart
    setTimeout(() => {
      if (!textareaRef.current) return;
      const pos = textareaRef.current.selectionStart;
      
      // Successive tap?
      if (ref.anchorPos !== -1 && pos >= ref.anchorPos && pos <= ref.endPos + 1) {
        // find next sentence
        let scanPos = ref.endPos;
        while (scanPos < content.length && /\s/.test(content[scanPos])) scanPos++;
        if (scanPos < content.length) {
          const bounds = findSentenceAt(content, scanPos);
          executeCopy(ref.anchorPos, bounds.end, 'Multiple Sentences');
        }
      } else {
        // new tap
        const bounds = findSentenceAt(content, pos);
        executeCopy(bounds.start, bounds.end, 'Sentence');
      }
    }, 10);
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
    
    if (showUndo) {
      setShowUndo(false);
      setPreviousContent(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main overflow-hidden">
      {/* Minimal Header */}
      <div className="h-16 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-4 md:px-6 shrink-0 bg-bg-panel relative">
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
                  
                  if (activeScene.beats && activeScene.beats.length > 0) {
                     // Get current selection from document if any inside one of the textareas
                     const activeEl = document.activeElement as HTMLTextAreaElement;
                     if (activeEl && activeEl.tagName === 'TEXTAREA' && activeEl.selectionStart !== activeEl.selectionEnd) {
                       textToClean = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd);
                       isSelection = true;
                     }
                  } else if (textareaRef.current && textareaRef.current.selectionStart !== textareaRef.current.selectionEnd) {
                     textToClean = content.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd);
                     isSelection = true;
                  }

                  if (isSelection && textToClean) {
                     const result = cleanText(textToClean, state.settings);
                     if (result.text !== textToClean) {
                       if (activeScene.beats && activeScene.beats.length > 0) {
                         const activeEl = document.activeElement as HTMLTextAreaElement;
                         const updated = activeEl.value.substring(0, activeEl.selectionStart) + result.text + activeEl.value.substring(activeEl.selectionEnd);
                         // Since we don't know easily which beat it is, we dispatch standard content change. 
                         // To be exact we'd need to find the beat by comparing content. 
                         // But we can just use `document.execCommand('insertText')` for selection cleans to preserve native undo buffer and react state automatically updates via `onInput`.
                         document.execCommand('insertText', false, result.text);
                       } else if (textareaRef.current) {
                           textareaRef.current.setRangeText(result.text, textareaRef.current.selectionStart, textareaRef.current.selectionEnd, 'select');
                           handleContentChange({ target: textareaRef.current } as any);
                       }
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
        <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1" />
        <div className="relative">
          <FeatureBadge number={4} position="custom" className="-top-2 -right-2" />
          <button 
            onClick={() => setIsQuickCopy(!isQuickCopy)}
            className={cn("p-1.5 rounded transition-colors", isQuickCopy ? "text-accent-primary bg-bg-panel" : "text-text-muted hover:text-white hover:bg-bg-panel")}
            title="Quick Copy Mode (Tap: Sentence, Hold: Paragraph)"
          >
            <TextSelect size={14} />
          </button>
        </div>
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
      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row" ref={containerRef}>
        
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
            <div className={cn("flex-1 overflow-y-auto p-4 md:p-8", !isDesktop && !mobileRefExpanded && "hidden")}>
              <div className="text-[#f4f4f5]/60 text-sm md:text-base leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-[var(--accent-primary)]/30">
                {refContent || 'No content found.'}
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
        <div className="flex-1 overflow-hidden relative bg-bg-main shrink-0 group/editorpane">
          <FeatureBadge number={2} position="custom" className="top-8 right-8" />
          {copyToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-accent-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-in fade-in slide-in-from-top-2">
              {copyToast}
            </div>
          )}
          <div className="max-w-4xl mx-auto h-full p-4 md:p-8 relative overflow-y-auto no-scrollbar">
            {activeScene.beats && activeScene.beats.length > 0 ? (
              <div className="flex flex-col gap-8 pb-32">
                {activeScene.beats.map((beat, index) => (
                  <div key={beat.id} className="relative group/beat">
                    <div className="absolute -left-4 md:-left-8 top-0 w-1 h-full bg-transparent group-hover/beat:bg-[var(--accent-primary)]/20 transition-colors rounded-full" />
                    <div className="mb-2 flex items-center justify-between opacity-50 group-focus-within/beat:opacity-100 group-hover/beat:opacity-100 transition-opacity">
                      <h4 className="text-sm font-bold text-[var(--accent-primary)] tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded flex items-center justify-center bg-[var(--accent-primary)]/20 text-xs">
                          {index + 1}
                        </span>
                        {beat.label}
                      </h4>
                    </div>
                    <AutoResizeTextarea
                      value={beat.content}
                      onChange={(e) => dispatch({
                        type: 'UPDATE_BEAT_CONTENT',
                        payload: { sceneId: activeScene.id, beatId: beat.id, content: e.target.value }
                      })}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      placeholder="Flesh out this beat..."
                      className={cn(
                        "w-full resize-none bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed focus:outline-none font-sans placeholder-[var(--text-muted)]/30 border-l-2 border-dashed border-[rgba(255,255,255,0.05)] focus:border-[var(--accent-primary)]/30 pl-4 py-2 transition-colors",
                        isQuickCopy ? "cursor-text selection:bg-[var(--accent-primary)]/40" : ""
                      )}
                      readOnly={isQuickCopy}
                    />
                  </div>
                ))}
                
                <div className="mt-8 pt-8 border-t border-[rgba(255,255,255,0.05)]">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Additional Content</h4>
                  <AutoResizeTextarea
                    value={content}
                    onChange={handleContentChange}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    placeholder="Continue your scene here..."
                    className={cn(
                      "w-full resize-none bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed focus:outline-none font-sans placeholder-[var(--text-muted)]/30",
                      isQuickCopy ? "cursor-text selection:bg-[var(--accent-primary)]/40" : ""
                    )}
                    readOnly={isQuickCopy}
                  />
                </div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                placeholder="Start drafting your scene here..."
                className={cn(
                  "w-full h-full resize-none bg-transparent text-[#f4f4f5] text-sm md:text-base leading-relaxed focus:outline-none font-sans placeholder-[var(--text-muted)]/30 no-scrollbar pb-32",
                  isQuickCopy ? "cursor-text selection:bg-[var(--accent-primary)]/40" : ""
                )}
                spellCheck={false}
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
