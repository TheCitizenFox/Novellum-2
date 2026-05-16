import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { BookOpen, Target, Tag, GripHorizontal, Hash, Plus, PenTool } from 'lucide-react';
import { cn } from '../utils/cn';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export const SceneCards: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    dispatch({
      type: 'REORDER_SCENES',
      payload: {
        sourceChapterId: source.droppableId,
        destinationChapterId: destination.droppableId,
        sourceIndex: source.index,
        destinationIndex: destination.index,
      },
    });
  };

  const getWordCount = (scene: import('../types').Scene) => {
    let text = '';
    if (scene.beats) {
      scene.beats.forEach(beat => {
        text += ' ' + beat.content;
      });
    }
    text += ' ' + scene.content;
    const content = text.trim();
    return content ? content.split(/\s+/).length : 0;
  };

  if (!isMounted) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-bg-main p-8">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="max-w-7xl mx-auto space-y-12">
          {state.project.chapters.map((chapter) => (
            <div key={chapter.id} className="space-y-6">
              <h2 className="text-2xl font-bold text-white border-b border-[rgba(255,255,255,0.1)] pb-3 flex items-center gap-3">
                <BookOpen size={24} className="text-accent-primary" />
                {chapter.title}
              </h2>
              
              <Droppable droppableId={chapter.id} direction="horizontal" type="SCENE">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "@container flex flex-wrap gap-6 min-h-[16rem] rounded-xl transition-colors",
                      snapshot.isDraggingOver ? "bg-neu-dark/30" : ""
                    )}
                  >
                    {chapter.scenes.map((scene, index) => {
                      const isActive = state.activeSceneId === scene.id;
                      return (
                      // @ts-ignore - key is required by React but types complain
                      <Draggable key={scene.id} draggableId={scene.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={() => {
                              if (!isActive) dispatch({ type: 'SET_ACTIVE_SCENE', payload: scene.id });
                            }}
                            className={cn(
                              "w-full @xl:w-[calc(50%-12px)] @4xl:w-[calc(33.333%-16px)] @6xl:w-[calc(25%-18px)] flex flex-col bg-bg-panel border rounded-3xl overflow-hidden transition-all group h-[26rem] shadow-[0_4px_15px_rgba(0,0,0,0.2)]",
                              isActive ? "border-[var(--accent-primary)]" : "border-[rgba(255,255,255,0.05)]",
                              snapshot.isDragging ? "shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-[rgba(255,107,53,0.5)] z-50 scale-105" : "hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:border-[rgba(255,255,255,0.1)]"
                            )}
                          >
                            {/* Header */}
                            <div className={cn(
                              "flex items-center gap-3 px-4 py-3 border-b transition-colors shrink-0",
                              isActive ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]" : "bg-bg-panel border-[rgba(255,255,255,0.05)]"
                            )}>
                              {/* Icon Container */}
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                isActive ? "bg-white text-accent-primary" : "bg-bg-card text-text-muted"
                              )}>
                                <PenTool size={14} />
                              </div>
                              
                              {/* Title Input */}
                              <input 
                                value={scene.title}
                                onChange={(e) => dispatch({ type: 'UPDATE_SCENE_METADATA', payload: { id: scene.id, metadata: { title: e.target.value } } })}
                                placeholder="Scene Title"
                                className={cn(
                                  "font-bold text-lg bg-transparent border-none outline-none focus:ring-0 flex-1 min-w-0 p-0 transition-colors",
                                  isActive ? "text-white placeholder-white/70" : "text-white placeholder-[var(--text-muted)]/50"
                                )}
                              />

                              {/* Drag Handle */}
                              <div 
                                {...provided.dragHandleProps}
                                className={cn(
                                  "cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors shrink-0",
                                  isActive ? "text-white hover:bg-white/20" : "text-text-muted hover:bg-bg-card"
                                )}
                              >
                                <GripHorizontal size={18} />
                              </div>
                            </div>

                            <div className="px-4 pb-4 pt-4 flex flex-col flex-1 overflow-hidden">
                              <div className="flex justify-end mb-4 shrink-0">
                                <select
                                  value={scene.status}
                                  onChange={(e) => dispatch({ type: 'UPDATE_SCENE_METADATA', payload: { id: scene.id, metadata: { status: e.target.value as any } } })}
                                  className={cn(
                                    "text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-md shrink-0 border-none outline-none cursor-pointer appearance-none text-center",
                                    scene.status === 'draft' && "bg-bg-card text-text-muted",
                                    scene.status === 'revised' && "bg-[rgba(255,107,53,0.1)] text-accent-primary",
                                    scene.status === 'final' && "bg-[rgba(255,140,66,0.1)] text-accent-hover"
                                  )}
                                >
                                  <option value="draft" className="bg-bg-panel text-white">DRAFT</option>
                                  <option value="revised" className="bg-bg-panel text-white">REVISED</option>
                                  <option value="final" className="bg-bg-panel text-white">FINAL</option>
                                </select>
                              </div>

                              <div className="flex-1 flex flex-col space-y-4 overflow-y-auto no-scrollbar pb-2">
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    <BookOpen size={12} className="text-accent-primary" /> Synopsis
                                  </div>
                                  <textarea
                                    value={scene.synopsis}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SCENE_METADATA', payload: { id: scene.id, metadata: { synopsis: e.target.value } } })}
                                    placeholder="Brief summary..."
                                    className="w-full bg-bg-card border border-transparent hover:border-[rgba(255,255,255,0.05)] focus:border-[rgba(255,107,53,0.5)] rounded-xl p-3 text-sm text-white focus:outline-none transition-all resize-none font-serif leading-relaxed placeholder-[var(--text-muted)]/50 min-h-[80px]"
                                  />
                                </div>
                                
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    <Target size={12} className="text-accent-primary" /> Purpose
                                  </div>
                                  <input
                                    value={scene.purpose}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SCENE_METADATA', payload: { id: scene.id, metadata: { purpose: e.target.value } } })}
                                    placeholder="Why does this scene exist?"
                                    className="w-full bg-bg-card border border-transparent hover:border-[rgba(255,255,255,0.05)] focus:border-[rgba(255,107,53,0.5)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-all placeholder-[var(--text-muted)]/50"
                                  />
                                </div>

                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    <Tag size={12} className="text-accent-primary" /> Tags
                                  </div>
                                  <input
                                    value={scene.tags.join(', ')}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SCENE_METADATA', payload: { id: scene.id, metadata: { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } } })}
                                    placeholder="comma, separated, tags"
                                    className="w-full bg-bg-card border border-transparent hover:border-[rgba(255,255,255,0.05)] focus:border-[rgba(255,107,53,0.5)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-all placeholder-[var(--text-muted)]/50"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between shrink-0 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                                <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono shrink-0 bg-bg-card px-3 py-1.5 rounded-lg" title="Word Count">
                                  <Hash size={14} className="text-accent-primary" />
                                  {getWordCount(scene)} words
                                </div>
                                <button
                                  onClick={() => {
                                    dispatch({ type: 'SET_ACTIVE_SCENE', payload: scene.id });
                                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'editor' });
                                  }}
                                  className="flex items-center gap-2 bg-[rgba(255,107,53,0.1)] hover:bg-[var(--accent-primary)] text-accent-primary hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 group"
                                >
                                  <PenTool size={14} className="transition-transform group-hover:rotate-12" />
                                  Write
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    
                    <div
                      onClick={() => dispatch({
                        type: 'ADD_SCENE',
                        payload: {
                          chapterId: chapter.id,
                          scene: {
                            id: crypto.randomUUID(),
                            title: 'New Scene',
                            content: '',
                            synopsis: '',
                            purpose: '',
                            status: 'draft',
                            tags: [],
                            notes: '',
                          },
                        },
                      })}
                      className="w-full @xl:w-[calc(50%-12px)] @4xl:w-[calc(33.333%-16px)] @6xl:w-[calc(25%-18px)] rounded-3xl p-1 cursor-pointer transition-all group h-[26rem]"
                    >
                      <div className="w-full h-full rounded-[22px] border-2 border-dashed border-bg-hover hover:border-[var(--accent-primary)] bg-bg-panel hover:bg-accent-primary/5 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden active:scale-95">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--accent-primary)] blur-[50px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />
                        <div className="w-16 h-16 rounded-2xl bg-bg-card flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[var(--accent-primary)] transition-all duration-300 relative z-10 shadow-lg">
                          <Plus size={28} className="text-text-muted group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm font-bold tracking-wide text-text-muted group-hover:text-accent-primary transition-colors relative z-10 uppercase">Create new scene</span>
                      </div>
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
