import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ChevronRight, ChevronDown, FileText, Plus, Folder, Trash2, Feather } from 'lucide-react';
import { cn } from '../utils/cn';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

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
    <div className="w-full bg-bg-main flex flex-col h-full text-text-muted z-20 border-r border-[rgba(255,255,255,0.05)] shadow-2xl xl:shadow-none">
      <div className="p-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] bg-bg-panel">
        <h2 className="font-bold text-text-muted tracking-widest uppercase text-xs flex items-center gap-2">
          <Feather size={14} className="text-accent-primary" />
          Manuscript
        </h2>
        <button onClick={handleAddChapter} className="text-text-muted hover:text-white p-3 md:p-1.5 rounded-lg hover:bg-bg-card transition-all active:scale-95 group">
          <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {state.project.chapters.map((chapter) => (
          <div key={chapter.id} className="mb-2">
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-bg-card cursor-pointer group transition-all active:scale-[0.98]"
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
            {expandedChapters[chapter.id] && (
              <div className="ml-7 space-y-1 mt-1 border-l border-[rgba(255,255,255,0.05)] pl-2">
                {chapter.scenes.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_SCENE', payload: scene.id });
                      if (window.innerWidth < 1280) dispatch({ type: 'TOGGLE_SIDEBAR' });
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-300 group active:scale-[0.98]",
                      state.activeSceneId === scene.id
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-text-muted hover:bg-bg-card hover:text-white border border-transparent"
                    )}
                  >
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
                        dispatch({ type: 'DELETE_SCENE', payload: { chapterId: chapter.id, sceneId: scene.id } });
                      }}
                      className={cn(
                        "opacity-100 md:opacity-0 group-hover:opacity-100 transition-all p-2 md:p-1.5 rounded-lg active:scale-95",
                        state.activeSceneId === scene.id ? "text-white hover:bg-white/20" : "text-text-muted hover:text-red-400 hover:bg-bg-card"
                      )}
                    >
                      <Trash2 size={12} className="transition-transform duration-300 hover:scale-110" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
