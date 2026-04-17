import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Project, Chapter, Scene, Snippet, StagingItem, CleanupSettings, SceneStatus, Snapshot, AppNotification } from './types';

type Action =
  | { type: 'SET_ACTIVE_VIEW'; payload: AppState['activeView'] }
  | { type: 'SET_ACTIVE_SCENE'; payload: string | null }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'SET_RIGHT_PANEL_OPEN'; payload: boolean }
  | { type: 'UPDATE_SCENE_CONTENT'; payload: { id: string; content: string } }
  | { type: 'UPDATE_SCENE_METADATA'; payload: { id: string; metadata: Partial<Scene> } }
  | { type: 'ADD_SCENE'; payload: { chapterId: string; scene: Scene } }
  | { type: 'ADD_CHAPTER'; payload: Chapter }
  | { type: 'DELETE_SCENE'; payload: { chapterId: string; sceneId: string } }
  | { type: 'ADD_SNIPPET'; payload: Snippet }
  | { type: 'UPDATE_SNIPPET'; payload: { id: string; snippet: Partial<Snippet> } }
  | { type: 'DELETE_SNIPPET'; payload: string }
  | { type: 'ADD_STAGING_ITEM'; payload: StagingItem }
  | { type: 'DELETE_STAGING_ITEM'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<CleanupSettings> }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'REORDER_SCENES'; payload: { sourceChapterId: string; destinationChapterId: string; sourceIndex: number; destinationIndex: number } }
  | { type: 'CREATE_SNAPSHOT' }
  | { type: 'RESTORE_SNAPSHOT'; payload: string }
  | { type: 'DELETE_SNAPSHOT'; payload: string }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'SET_LAST_SAVED'; payload: number }
  | { type: 'SHOW_NOTIFICATION'; payload: Omit<AppNotification, 'id'> }
  | { type: 'CLEAR_NOTIFICATION'; payload: string };

const generateId = () => crypto.randomUUID();

const initialScene: Scene = {
  id: generateId(),
  title: 'Scene 1',
  content: '',
  synopsis: '',
  purpose: '',
  status: 'draft',
  tags: [],
  notes: '',
};

const initialChapter: Chapter = {
  id: generateId(),
  title: 'Chapter 1',
  scenes: [initialScene],
};

const initialState: AppState = {
  project: {
    id: generateId(),
    title: 'Untitled Project',
    chapters: [initialChapter],
  },
  snapshots: [],
  snippets: [],
  stagingItems: [],
  settings: {
    removeBracketedTags: true,
    lowercaseAllCaps: true,
    normalizeSpacing: true,
    normalizePunctuation: true,
    theme: 'ignite',
  },
  activeSceneId: initialScene.id,
  activeView: 'editor',
  isSidebarOpen: true,
  isRightPanelOpen: false,
  saveError: null,
  lastSaved: null,
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...initialState, ...action.payload };
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_ACTIVE_SCENE':
      return { ...state, activeSceneId: action.payload, activeView: 'editor' };
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case 'SET_SIDEBAR_OPEN':
      return { ...state, isSidebarOpen: action.payload };
    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, isRightPanelOpen: !state.isRightPanelOpen };
    case 'SET_RIGHT_PANEL_OPEN':
      return { ...state, isRightPanelOpen: action.payload };
    case 'UPDATE_SCENE_CONTENT': {
      const { id, content } = action.payload;
      const newChapters = state.project.chapters.map((chapter) => ({
        ...chapter,
        scenes: chapter.scenes.map((scene) =>
          scene.id === id ? { ...scene, content } : scene
        ),
      }));
      return { ...state, project: { ...state.project, chapters: newChapters } };
    }
    case 'UPDATE_SCENE_METADATA': {
      const { id, metadata } = action.payload;
      const newChapters = state.project.chapters.map((chapter) => ({
        ...chapter,
        scenes: chapter.scenes.map((scene) =>
          scene.id === id ? { ...scene, ...metadata } : scene
        ),
      }));
      return { ...state, project: { ...state.project, chapters: newChapters } };
    }
    case 'ADD_SCENE': {
      const { chapterId, scene } = action.payload;
      const newChapters = state.project.chapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, scenes: [...chapter.scenes, scene] }
          : chapter
      );
      return { ...state, project: { ...state.project, chapters: newChapters }, activeSceneId: scene.id, activeView: 'editor' };
    }
    case 'ADD_CHAPTER':
      return {
        ...state,
        project: { ...state.project, chapters: [...state.project.chapters, action.payload] },
      };
    case 'DELETE_SCENE': {
      const { chapterId, sceneId } = action.payload;
      const newChapters = state.project.chapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, scenes: chapter.scenes.filter((s) => s.id !== sceneId) }
          : chapter
      );
      const activeSceneId = state.activeSceneId === sceneId ? null : state.activeSceneId;
      return { ...state, project: { ...state.project, chapters: newChapters }, activeSceneId };
    }
    case 'ADD_SNIPPET':
      return { ...state, snippets: [...state.snippets, action.payload] };
    case 'UPDATE_SNIPPET':
      return {
        ...state,
        snippets: state.snippets.map((s) => (s.id === action.payload.id ? { ...s, ...action.payload.snippet } : s)),
      };
    case 'DELETE_SNIPPET':
      return { ...state, snippets: state.snippets.filter((s) => s.id !== action.payload) };
    case 'ADD_STAGING_ITEM':
      return { ...state, stagingItems: [...state.stagingItems, action.payload] };
    case 'DELETE_STAGING_ITEM':
      return { ...state, stagingItems: state.stagingItems.filter((s) => s.id !== action.payload) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'CREATE_SNAPSHOT': {
      const newSnapshot: Snapshot = {
        id: generateId(),
        timestamp: Date.now(),
        project: JSON.parse(JSON.stringify(state.project)), // Deep copy
      };
      return { ...state, snapshots: [newSnapshot, ...state.snapshots] };
    }
    case 'RESTORE_SNAPSHOT': {
      const snapshot = state.snapshots.find(s => s.id === action.payload);
      if (!snapshot) return state;
      return { ...state, project: JSON.parse(JSON.stringify(snapshot.project)) };
    }
    case 'DELETE_SNAPSHOT':
      return { ...state, snapshots: state.snapshots.filter(s => s.id !== action.payload) };
    case 'REORDER_SCENES': {
      const { sourceChapterId, destinationChapterId, sourceIndex, destinationIndex } = action.payload;
      const newChapters = [...state.project.chapters];
      const sourceChapterIndex = newChapters.findIndex(c => c.id === sourceChapterId);
      const destChapterIndex = newChapters.findIndex(c => c.id === destinationChapterId);

      if (sourceChapterIndex === -1 || destChapterIndex === -1) return state;

      const sourceChapter = { ...newChapters[sourceChapterIndex], scenes: [...newChapters[sourceChapterIndex].scenes] };
      const [movedScene] = sourceChapter.scenes.splice(sourceIndex, 1);

      if (sourceChapterId === destinationChapterId) {
        sourceChapter.scenes.splice(destinationIndex, 0, movedScene);
        newChapters[sourceChapterIndex] = sourceChapter;
      } else {
        const destChapter = { ...newChapters[destChapterIndex], scenes: [...newChapters[destChapterIndex].scenes] };
        destChapter.scenes.splice(destinationIndex, 0, movedScene);
        newChapters[sourceChapterIndex] = sourceChapter;
        newChapters[destChapterIndex] = destChapter;
      }

      return { ...state, project: { ...state.project, chapters: newChapters } };
    }
    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.payload };
    case 'SET_LAST_SAVED':
      return { ...state, lastSaved: action.payload };
    case 'SHOW_NOTIFICATION':
      return { ...state, notification: { ...action.payload, id: generateId() } };
    case 'CLEAR_NOTIFICATION':
      return state.notification?.id === action.payload ? { ...state, notification: null } : state;
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load state on mount
  useEffect(() => {
    let saved = localStorage.getItem('novellum-state');
    
    // Migration from old app name
    if (!saved) {
      saved = localStorage.getItem('nexus-writer-state');
      if (saved) {
        localStorage.setItem('novellum-state', saved);
      }
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Don't load transient state like save errors
        delete parsed.saveError;
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error('Failed to load state', e);
      }
    }
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme || 'ignite');
  }, [state.settings.theme]);

  // Debounced save
  useEffect(() => {
    const saveState = () => {
      try {
        // Strip out transient state before saving
        const stateToSave = { ...state };
        delete stateToSave.saveError;
        
        localStorage.setItem('novellum-state', JSON.stringify(stateToSave));
        dispatch({ type: 'SET_SAVE_ERROR', payload: null });
        dispatch({ type: 'SET_LAST_SAVED', payload: Date.now() });
      } catch (e: any) {
        console.error('Failed to save state', e);
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          dispatch({ 
            type: 'SET_SAVE_ERROR', 
            payload: 'Storage limit reached. Please export your project and clear old snapshots to continue saving.' 
          });
        } else {
          dispatch({ type: 'SET_SAVE_ERROR', payload: 'Failed to save your progress. Please export your project as a backup.' });
        }
      }
    };

    const timeoutId = setTimeout(saveState, 1000); // 1 second debounce
    return () => clearTimeout(timeoutId);
  }, [state.project, state.snapshots, state.snippets, state.stagingItems, state.settings]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
