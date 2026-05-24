import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Project, Chapter, Scene, Snippet, StagingItem, CleanupSettings, SceneStatus, Snapshot, AppNotification } from './types';
import { saveSnapshotDb, deleteSnapshotDb, loadSnapshotsDb } from './utils/db';

type Action =
  | { type: 'UNDO' }
  | { type: 'REDO' }
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
  | { type: 'CREATE_SNAPSHOT'; payload?: { isAuto?: boolean } }
  | { type: 'SET_SNAPSHOTS'; payload: Snapshot[] }
  | { type: 'RESTORE_SNAPSHOT'; payload: string }
  | { type: 'DELETE_SNAPSHOT'; payload: string }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'SET_LAST_SAVED'; payload: number }
  | { type: 'SHOW_NOTIFICATION'; payload: Omit<AppNotification, 'id'> }
  | { type: 'CLEAR_NOTIFICATION'; payload: string }
  | { type: 'SET_INFOGRAPHIC_MODE'; payload: boolean }
  | { type: 'ADD_BEATS'; payload: { sceneId: string; beats: import('./types').Beat[] } }
  | { type: 'UPDATE_BEAT_CONTENT'; payload: { sceneId: string; beatId: string; content: string } }
  | { type: 'DELETE_BEAT'; payload: { sceneId: string; beatId: string } };

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
    title: 'Liturgies of Lead',
    chapters: [initialChapter],
  },
  pastProjects: [],
  futureProjects: [],
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
  isInfographicMode: false,
  saveError: null,
  lastSaved: null,
};

const baseReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...initialState, ...action.payload, isInfographicMode: false }; // always reset on load
    case 'SET_INFOGRAPHIC_MODE':
      return { ...state, isInfographicMode: action.payload };
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
    case 'ADD_BEATS': {
      const { sceneId, beats } = action.payload;
      const newChapters = state.project.chapters.map((chapter) => ({
        ...chapter,
        scenes: chapter.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, beats: [...(scene.beats || []), ...beats] } : scene
        ),
      }));
      return { ...state, project: { ...state.project, chapters: newChapters } };
    }
    case 'UPDATE_BEAT_CONTENT': {
      const { sceneId, beatId, content } = action.payload;
      const newChapters = state.project.chapters.map((chapter) => ({
        ...chapter,
        scenes: chapter.scenes.map((scene) => {
          if (scene.id !== sceneId || !scene.beats) return scene;
          return {
            ...scene,
            beats: scene.beats.map(b => b.id === beatId ? { ...b, content } : b)
          };
        }),
      }));
      return { ...state, project: { ...state.project, chapters: newChapters } };
    }
    case 'DELETE_BEAT': {
      const { sceneId, beatId } = action.payload;
      const newChapters = state.project.chapters.map((chapter) => ({
        ...chapter,
        scenes: chapter.scenes.map((scene) => {
          if (scene.id !== sceneId || !scene.beats) return scene;
          return {
             ...scene,
             beats: scene.beats.filter(b => b.id !== beatId)
          };
        }),
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
      const isAuto = action.payload?.isAuto ?? false;
      
      // Safety guard: If this is an auto-snapshot, and the project has been emptied,
      // but we have existing snapshots containing real content, DO NOT take a snapshot or prune older snapshots!
      const currentProjectWordCount = state.project.chapters.reduce((acc, c) => 
        acc + c.scenes.reduce((sAcc, s) => {
          const mainLength = s.content?.length || 0;
          const beatLength = s.beats?.reduce((bAcc, b) => bAcc + (b.content?.length || 0), 0) || 0;
          return sAcc + mainLength + beatLength;
        }, 0)
      , 0);

      // If project has less than 50 characters, and we already have snapshots, check if they had content.
      if (isAuto && currentProjectWordCount < 50 && state.snapshots.length > 0) {
        // Find if any existing snapshot has substantial content
        const hasSubstantialSnapshot = state.snapshots.some(snap => {
          const snapCount = snap.project.chapters.reduce((acc, c) => 
            acc + c.scenes.reduce((sAcc, s) => {
              const mainLength = s.content?.length || 0;
              const beatLength = s.beats?.reduce((bAcc, b) => bAcc + (b.content?.length || 0), 0) || 0;
              return sAcc + mainLength + beatLength;
            }, 0)
          , 0);
          return snapCount > 100;
        });
        
        if (hasSubstantialSnapshot) {
          console.log("Refusing to take a blank automatic snapshot over existing substantial history!");
          return state; // No-op, preserve historical data!
        }
      }

      const newSnapshot: Snapshot = {
        id: generateId(),
        timestamp: Date.now(),
        project: JSON.parse(JSON.stringify(state.project)), // Deep copy
      };
      
      // Auto-prune old auto-snapshots (keep max 60 total snapshots now with IndexedDB storage)
      return { 
        ...state, 
        snapshots: [newSnapshot, ...state.snapshots].slice(0, 60) 
      };
    }
    case 'SET_SNAPSHOTS':
      return { ...state, snapshots: action.payload };
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

let lastHistoryPushTime = 0;

const reducer = (state: AppState, action: Action): AppState => {
  if (action.type === 'UNDO') {
    if (state.pastProjects.length === 0) return state;
    const previous = state.pastProjects[state.pastProjects.length - 1];
    const newPast = state.pastProjects.slice(0, -1);
    return {
      ...state,
      pastProjects: newPast,
      futureProjects: [state.project, ...state.futureProjects],
      project: previous
    };
  }
  
  if (action.type === 'REDO') {
    if (state.futureProjects.length === 0) return state;
    const next = state.futureProjects[0];
    const newFuture = state.futureProjects.slice(1);
    return {
      ...state,
      pastProjects: [...state.pastProjects, state.project].slice(-50),
      futureProjects: newFuture,
      project: next
    };
  }

  const newState = baseReducer(state, action);
  
  if (newState.project !== state.project) {
    if (action.type === 'LOAD_STATE') {
      return { ...newState, pastProjects: [], futureProjects: [] };
    }
    
    const now = Date.now();
    let shouldPushHistory = true;

    if (action.type === 'UPDATE_SCENE_CONTENT' || action.type === 'UPDATE_BEAT_CONTENT') {
      if (now - lastHistoryPushTime < 2000) {
        shouldPushHistory = false;
      } else {
        lastHistoryPushTime = now;
      }
    } else {
       lastHistoryPushTime = now;
    }

    if (shouldPushHistory) {
      const newPast = [...state.pastProjects, state.project].slice(-50);
      return {
        ...newState,
        pastProjects: newPast,
        futureProjects: []
      };
    } else {
      return newState;
    }
  }

  return newState;
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const lastSnapshotsRef = React.useRef<Snapshot[]>([]);

  // Load state on mount
  useEffect(() => {
    let saved = localStorage.getItem('novellum-state');
    let legacySnapshots: Snapshot[] = [];
    
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
        // Expose legacy snapshots so we can migrate them to IndexedDB
        if (parsed.snapshots && Array.isArray(parsed.snapshots)) {
          legacySnapshots = parsed.snapshots;
        }
        // Don't load transient state like save errors
        delete parsed.saveError;
        // Don't put snapshots in state yet; we'll merge them from DB
        parsed.snapshots = [];
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error('Failed to load state', e);
      }
    }
    
    // Load and migrate snapshots to IndexedDB
    const loadAndMigrateDb = async () => {
      try {
        const dbSnaps = await loadSnapshotsDb();
        const merged = [...dbSnaps];
        
        let migratedAny = false;
        for (const legacySnap of legacySnapshots) {
          if (!merged.some(m => m.id === legacySnap.id)) {
            merged.push(legacySnap);
            await saveSnapshotDb(legacySnap);
            migratedAny = true;
          }
        }
        
        // Sort newest first
        merged.sort((a, b) => b.timestamp - a.timestamp);
        
        dispatch({ type: 'SET_SNAPSHOTS', payload: merged });
        lastSnapshotsRef.current = merged;
        
        if (migratedAny && saved) {
          try {
            const parsed = JSON.parse(saved);
            delete parsed.snapshots;
            localStorage.setItem('novellum-state', JSON.stringify(parsed));
          } catch (e) {
            console.error('Failed to clean legacy snapshots from localStorage', e);
          }
        }
      } catch (err) {
        console.error('Failed to initialize snapshots database', err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadAndMigrateDb();
  }, []);

  // Sync snapshots to IndexedDB
  useEffect(() => {
    if (!isLoaded) return;
    
    const prevSnaps = lastSnapshotsRef.current;
    const currentSnaps = state.snapshots;
    
    const added = currentSnaps.filter(s => !prevSnaps.some(p => p.id === s.id));
    const deleted = prevSnaps.filter(p => !currentSnaps.some(s => s.id === p.id));
    
    added.forEach(async (snap) => {
      try {
        await saveSnapshotDb(snap);
      } catch (err) {
        console.error('Failed to save snapshot to IndexedDB', err);
      }
    });

    deleted.forEach(async (snap) => {
      try {
        await deleteSnapshotDb(snap.id);
      } catch (err) {
        console.error('Failed to delete snapshot from IndexedDB', err);
      }
    });

    lastSnapshotsRef.current = currentSnaps;
  }, [state.snapshots, isLoaded]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme || 'ignite');
  }, [state.settings.theme]);

  // Auto-snapshot
  useEffect(() => {
    if (!isLoaded) return;

    // Take an initial backup 5 seconds after load to ensure they have a session restore point
    const initialTimeout = setTimeout(() => {
      dispatch({ type: 'CREATE_SNAPSHOT', payload: { isAuto: true } });
    }, 5000);

    // Take a snapshot every 10 minutes
    const intervalId = setInterval(() => {
      dispatch({ type: 'CREATE_SNAPSHOT', payload: { isAuto: true } });
    }, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [isLoaded]);

  // Debounced save
  useEffect(() => {
    if (!isLoaded) return;

    const saveState = () => {
      try {
        // Strip out transient state before saving
        const stateToSave = { ...state };
        delete stateToSave.saveError;
        delete (stateToSave as any).pastProjects;
        delete (stateToSave as any).futureProjects;
        delete (stateToSave as any).snapshots; // Exclude from localStorage completely!
        
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
  }, [isLoaded, state.project, state.snippets, state.stagingItems, state.settings]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
