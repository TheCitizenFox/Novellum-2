import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Project, Chapter, Scene, Snippet, StagingItem, CleanupSettings, SceneStatus, Snapshot, AppNotification } from './types';
import { 
  saveSnapshotDb, 
  deleteSnapshotDb, 
  loadSnapshotsDb 
} from './utils/db';

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
  stateVersion: 1,
  isRecoveryMode: false,
};

// --- Schema Migrants & Safe Merges ---
const getTotalContentLength = (project: Project): number => {
  if (!project || !project.chapters) return 0;
  return project.chapters.reduce((acc, c) => 
    acc + (c.scenes || []).reduce((sAcc, s) => {
      const mainLength = s.content?.length || 0;
      const beatLength = s.beats?.reduce((bAcc, b) => bAcc + (b.content?.length || 0), 0) || 0;
      return sAcc + mainLength + beatLength;
    }, 0)
  , 0);
};

export function migrateProject(p: any): Project {
  if (!p || typeof p !== 'object') {
    return {
      id: crypto.randomUUID(),
      title: 'Untitled Project',
      chapters: []
    };
  }

  const chapters = Array.isArray(p.chapters) ? p.chapters.map((chap: any): Chapter => {
    const scenes = Array.isArray(chap.scenes) ? chap.scenes.map((scene: any): Scene => {
      return {
        id: scene.id || crypto.randomUUID(),
        title: scene.title || 'Untitled Scene',
        content: scene.content || '',
        beats: Array.isArray(scene.beats) ? scene.beats.map((b: any) => ({
          id: b.id || crypto.randomUUID(),
          label: b.label || 'Beat',
          content: b.content || '',
        })) : [],
        synopsis: scene.synopsis || '',
        purpose: scene.purpose || '',
        status: scene.status || 'draft',
        tags: Array.isArray(scene.tags) ? scene.tags : [],
        notes: scene.notes || '',
      };
    }) : [];

    return {
      id: chap.id || crypto.randomUUID(),
      title: chap.title || 'Untitled Chapter',
      scenes,
    };
  }) : [];

  return {
    id: p.id || crypto.randomUUID(),
    title: p.title || 'Untitled Project',
    chapters,
  };
}

export function migrateState(s: any): AppState {
  const base = { ...initialState };
  if (!s || typeof s !== 'object') return { ...base, stateVersion: 1 };

  const project = migrateProject(s.project);
  
  const settings = {
    ...base.settings,
    ...(s.settings || {})
  };

  const snippets = Array.isArray(s.snippets) ? s.snippets.map((snip: any) => ({
    id: snip.id || crypto.randomUUID(),
    content: snip.content || '',
    category: snip.category || 'general',
    sourceNote: snip.sourceNote || '',
    comment: snip.comment || '',
  })) : [];

  const stagingItems = Array.isArray(s.stagingItems) ? s.stagingItems.map((item: any) => ({
    id: item.id || crypto.randomUUID(),
    content: item.content || '',
  })) : [];

  return {
    ...base,
    ...s,
    project,
    snippets,
    stagingItems,
    settings,
    snapshots: [], // Always loaded/merged from IndexedDB separately
    activeSceneId: s.activeSceneId || (project.chapters[0]?.scenes[0]?.id || null),
    pastProjects: [],
    futureProjects: [],
    stateVersion: s.stateVersion || 1,
    isRecoveryMode: false,
    recoveryData: undefined,
  };
}

const getInitialState = (): AppState => {
  let saved: string | null = null;
  let hasFailedRead = false;
  
  try {
    saved = localStorage.getItem('novellum-state') || localStorage.getItem('nexus-writer-state');
  } catch (e) {
    console.error('Failed to read localStorage:', e);
    hasFailedRead = true;
  }
  
  // If localStorage throws, we should not blindly return a fresh valid project, as it might get autosaved over real data.
  if (hasFailedRead) {
    return {
      ...initialState,
      stateVersion: 1,
      isRecoveryMode: true,
      recoveryData: 'Error: Storage API is unavailable or threw an exception.'
    };
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      
      // STRUCTURAL VALIDATION
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Parsed JSON is not an object.");
      }
      if (!parsed.project || typeof parsed.project !== 'object') {
        throw new Error("Parsed JSON lacks a valid project object.");
      }
      if (!Array.isArray(parsed.project.chapters)) {
        throw new Error("Parsed JSON lacks a project chapters array.");
      }
      for (const chapter of parsed.project.chapters) {
        if (!chapter || typeof chapter !== 'object') {
          throw new Error("Parsed JSON contains an invalid chapter (not an object).");
        }
        if (!Array.isArray(chapter.scenes)) {
          throw new Error(`Chapter "${chapter.title || 'Unknown'}" lacks a scenes array.`);
        }
        for (const scene of chapter.scenes) {
          if (!scene || typeof scene !== 'object') {
            throw new Error(`Chapter "${chapter.title || 'Unknown'}" contains an invalid scene (not an object).`);
          }
        }
      }

      parsed.snapshots = [];
      delete parsed.saveError;
      return migrateState(parsed);
    } catch (e) {
      console.error('Failed to parse or validate synchronous localStorage state:', e);
      // FAILED TO LOAD! ENTER RECOVERY MODE!
      
      // Quarantine the raw data immediately so it's not lost
      const quarantineKey = `novellum-quarantine-${Date.now()}-${crypto.randomUUID()}`;
      try {
        localStorage.setItem(quarantineKey, saved);
      } catch (err) {
         console.error('Failed to quarantine', err);
      }
      
      return { 
        ...initialState, 
        stateVersion: 1, 
        isRecoveryMode: true, 
        recoveryData: saved 
      };
    }
  }
  return { ...initialState, stateVersion: 1 };
};

const baseReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...migrateState(action.payload), isInfographicMode: false }; // Safe schema migration on load & restore
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
      const currentLen = getTotalContentLength(state.project);

      // Recommendation 4: Compare current project's primary text content against the last confirmed valid snapshots
      if (isAuto && state.snapshots && state.snapshots.length > 0) {
        const lastSnap = state.snapshots[0];
        const lastSnapLen = getTotalContentLength(lastSnap.project);
        
        // If the previous snapshot had substantial content (>1000 characters),
        // and the current project has dropped drastically to <25% of that,
        // bypass the auto-snapshot so we don't overwrite/prune real history with empty/blank data!
        if (lastSnapLen > 1000 && currentLen < lastSnapLen * 0.25) {
          console.warn(`Refusing to take an automatic snapshot because project has shrunk from ${lastSnapLen} to ${currentLen} characters! Protecting version history...`);
          return state;
        }
      }

      // Safety guard: If this is an auto-snapshot, and the project has been emptied,
      // but we have existing snapshots containing real content, DO NOT take a snapshot or prune older snapshots!
      if (isAuto && currentLen < 50 && state.snapshots && state.snapshots.length > 0) {
        const hasSubstantialSnapshot = state.snapshots.some(snap => {
          const snapLen = getTotalContentLength(snap.project);
          return snapLen > 100;
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
        snapshots: [newSnapshot, ...(state.snapshots || [])].slice(0, 60) 
      };
    }
    case 'SET_SNAPSHOTS':
      return { ...state, snapshots: action.payload };
    case 'RESTORE_SNAPSHOT': {
      const snapshot = state.snapshots.find(s => s.id === action.payload);
      if (!snapshot) return state;
      return { ...state, project: migrateProject(snapshot.project) }; // Safe schema restoration
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
    
    let shouldPushHistory = true;

    // Recommendation 5: Intelligent grouping of consecutive, rapid character edits
    if (action.type === 'UPDATE_SCENE_CONTENT' || action.type === 'UPDATE_BEAT_CONTENT') {
      const lastLength = getTotalContentLength(state.project);
      const newLength = getTotalContentLength(newState.project);
      const lengthDiff = Math.abs(newLength - lastLength);
      
      // If the character count has changed incrementally (< 15 characters, like basic typing) and typing quickly
      if (lengthDiff < 15 && Date.now() - lastHistoryPushTime < 2500) {
        shouldPushHistory = false;
      } else {
        lastHistoryPushTime = Date.now();
      }
    } else {
       lastHistoryPushTime = Date.now();
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
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const lastSnapshotsRef = React.useRef<Snapshot[]>([]);

  // Asynchronous load check other db backup + legacy migrator on mount
  useEffect(() => {
    if (state.isRecoveryMode) {
      // Important: halt all IndexedDB backup restoration and snapshot migration
      // running in the background so it doesn't bypass recovery mode.
      setIsLoaded(true);
      return;
    }
    
    let legacySnapshots: Snapshot[] = [];
    const saved = localStorage.getItem('novellum-state');
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.snapshots && Array.isArray(parsed.snapshots)) {
          legacySnapshots = parsed.snapshots;
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    const loadAndMigrateDb = async () => {
      try {
        // --- Synchronize Versions and Snapshots from DB ---
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
    if (!isLoaded || state.isRecoveryMode) return;
    
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
    if (!isLoaded || state.isRecoveryMode) return;

    const initialTimeout = setTimeout(() => {
      dispatch({ type: 'CREATE_SNAPSHOT', payload: { isAuto: true } });
    }, 5000);

    const intervalId = setInterval(() => {
      dispatch({ type: 'CREATE_SNAPSHOT', payload: { isAuto: true } });
    }, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [isLoaded, state.isRecoveryMode]);

  // Recommendation 1: Sequential Transactional Dual-Save Flow
  useEffect(() => {
    if (!isLoaded || state.isRecoveryMode) return;

    const saveState = async () => {
      try {
        const stateToSave = { ...state };
        delete stateToSave.saveError;
        delete (stateToSave as any).pastProjects;
        delete (stateToSave as any).futureProjects;
        delete (stateToSave as any).snapshots; // Exclude snapshots array entirely from localStorage

        const now = Date.now();
        stateToSave.lastSaved = now;
        stateToSave.stateVersion = 1;

        const stringified = JSON.stringify(stateToSave);

        // --- Write to synchronously fast primary storage (localStorage) ---
        localStorage.setItem('novellum-state', stringified);
        dispatch({ type: 'SET_SAVE_ERROR', payload: null });
        dispatch({ type: 'SET_LAST_SAVED', payload: now });

      } catch (e: any) {
        console.error('Failed to save state securely', e);
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
