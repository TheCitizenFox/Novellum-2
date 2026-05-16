import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ChevronRight, ChevronDown, FileText, Plus, Folder, Trash2, Feather, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { FeatureBadge } from './FeatureBadge';
import { motion, AnimatePresence } from 'motion/react';
import { BeatsModal } from './BeatsModal';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ chapterId: string, sceneId: string, title: string } | null>(null);
  const [activeBeatSceneId, setActiveBeatSceneId] = useState<string | null>(null);

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddChapter = () => {
    dispatch({
      type: 'ADD_CHAPTER',
      payload: { id: crypto.randomUUID(), title: 'New Chapter', scenes: [] },
    });
  };

  const handleAddScene = (chapterId: string) => {
    dispatch({
      type: 'ADD_SCENE',
      payload: {
        chapterId,
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
    });
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: true }));
  };

  return (
    <>
      <div className="w-full bg-bg-main flex flex-col h-full text-text-muted z-20 relative">
        <FeatureBadge number={1} position="custom" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="h-16 px-4 md:px-5 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] bg-bg-panel shrink-0">
          <h2 className="font-bold text-text-muted tracking-widest uppercase text-xs flex items-center gap-2">
            <Feather size={14} className="text-accent-primary" />
            Manuscript
          </h2>
          <button onClick={handleAddChapter} className="text-text-muted hover:text-white p-2 md:p-1.5 rounded-lg hover:bg-bg-card transition-all active:scale-95 group">
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 md:space-y-2 no-scrollbar">
          {state.project.chapters.map((chapter) => (
            <div key={chapter.id} className="mb-0">
              <div
                className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-bg-card cursor-pointer group transition-all active:scale-[0.98]"
                onClick={() => toggleChapter(chapter.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="transition-transform duration-300 group-hover:scale-110">
                    {expandedChapters[chapter.id] ? (
                      <ChevronDown size={14} className="text-text-muted" />
                    ) : (
                      <ChevronRight size={14} className="text-text-muted" />
                    )}
                  </div>
                  <Folder size={14} className="text-accent-primary transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-sm font-bold text-white">{chapter.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddScene(chapter.id);
                  }}
                  className="opacity-100 md:opacity-0 group-hover:opacity-100 text-text-muted hover:text-white p-2 md:p-1 rounded-md transition-all active:scale-95"
                >
                  <Plus size={14} className="transition-transform duration-300 hover:rotate-90 hover:scale-110" />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {expandedChapters[chapter.id] && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 space-y-0.5 mt-0.5 border-l border-[rgba(255,255,255,0.05)] pl-1">
                      {chapter.scenes.map((scene) => (
                        <div
                          key={scene.id}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-sm transition-all duration-300 group",
                            state.activeSceneId === scene.id
                              ? "bg-[var(--accent-primary)] text-white shadow-sm"
                              : "text-text-muted hover:bg-bg-card hover:text-white border border-transparent"
                          )}
                          onClick={() => {
                            dispatch({ type: 'SET_ACTIVE_SCENE', payload: scene.id });
                            if (window.innerWidth < 768) dispatch({ type: 'TOGGLE_SIDEBAR' });
                          }}
                        >
                          <div className="flex items-center border-r border-[rgba(255,255,255,0.1)] pr-1.5 mr-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveBeatSceneId(scene.id);
                              }}
                              className={cn(
                                "flex items-center justify-center p-1 rounded-md active:scale-95 transition-colors",
                                state.activeSceneId === scene.id ? "text-white border-white/20" : "text-text-muted/60 hover:text-accent-primary hover:bg-bg-panel"
                              )}
                              title="Add Scene Beats"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                      <div className="relative flex items-center justify-center w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110">
                        {state.activeSceneId === scene.id ? (
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                            <FileText size={10} className="text-accent-primary" />
                          </div>
                        ) : (
                          <FileText size={14} className="text-text-muted group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <span className={cn("truncate flex-1", state.activeSceneId === scene.id ? "font-bold" : "font-medium")}>{scene.title || 'Untitled Scene'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ chapterId: chapter.id, sceneId: scene.id, title: scene.title || 'Untitled Scene' });
                        }}
                        className={cn(
                          "opacity-100 md:opacity-0 group-hover:opacity-100 transition-all p-2 md:p-1.5 rounded-lg active:scale-95 shrink-0",
                          state.activeSceneId === scene.id ? "text-white hover:bg-white/20" : "text-text-muted hover:text-red-400 hover:bg-bg-panel"
                        )}
                      >
                        <Trash2 size={12} className="transition-transform duration-300 hover:scale-110" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
              )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-bg-panel border border-[rgba(255,255,255,0.05)] shadow-2xl rounded-xl w-full max-w-sm relative z-10 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trash2 size={18} className="text-red-400" />
                    Delete Scene
                  </h3>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="p-1 text-text-muted hover:text-white rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <p className="text-text-muted text-sm leading-relaxed mb-6">
                  Are you sure you want to delete <span className="text-white font-medium">"{deleteTarget.title}"</span>? You can use the undo button to reverse this if you make a mistake.
                </p>
                
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-white bg-bg-card hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      dispatch({ type: 'DELETE_SCENE', payload: { chapterId: deleteTarget.chapterId, sceneId: deleteTarget.sceneId } });
                      setDeleteTarget(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-all"
                  >
                    Delete Scene
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BeatsModal
        isOpen={!!activeBeatSceneId}
        onClose={() => setActiveBeatSceneId(null)}
        sceneId={activeBeatSceneId!}
      />
    </>
  );
};
