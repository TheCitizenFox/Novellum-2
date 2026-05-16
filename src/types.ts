export type SceneStatus = 'draft' | 'revised' | 'final';

export interface Beat {
  id: string;
  label: string;
  content: string;
}

export interface Scene {
  id: string;
  title: string;
  content: string;
  beats?: Beat[];
  synopsis: string;
  purpose: string;
  status: SceneStatus;
  tags: string[];
  notes: string;
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface Project {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface Snippet {
  id: string;
  content: string;
  category: string;
  sourceNote: string;
  comment: string;
}

export interface StagingItem {
  id: string;
  content: string;
}

export interface CleanupSettings {
  removeBracketedTags: boolean;
  lowercaseAllCaps: boolean;
  normalizeSpacing: boolean;
  normalizePunctuation: boolean;
  theme: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  project: Project;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AppState {
  project: Project;
  pastProjects: Project[];
  futureProjects: Project[];
  snapshots: Snapshot[];
  snippets: Snippet[];
  stagingItems: StagingItem[];
  settings: CleanupSettings;
  activeSceneId: string | null;
  activeView: 'editor' | 'cards' | 'vault' | 'staging' | 'settings' | 'manuscript';
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isInfographicMode: boolean;
  saveError?: string | null;
  lastSaved?: number | null;
  notification?: AppNotification | null;
}
