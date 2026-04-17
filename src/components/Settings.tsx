import React from 'react';
import { useAppStore } from '../store';
import { Settings as SettingsIcon, Download, FileText, Type, AlignLeft, Scissors, Trash2, ChevronRight, Palette } from 'lucide-react';

export const Settings: React.FC = () => {
  const { state, dispatch } = useAppStore();

  const handleToggle = (key: keyof typeof state.settings) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [key]: !state.settings[key] },
    });
  };

  const handleThemeChange = (theme: string) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { theme },
    });
  };

  const saveToFileSystem = async (content: string, suggestedName: string, mimeType: string, extension: string) => {
    const fallbackSave = () => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Successfully exported ${extension} file!`, type: 'success' } });
    };

    try {
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [{
              description: 'Novellum File',
              accept: { [mimeType]: [extension] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Successfully exported ${extension} file!`, type: 'success' } });
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') return;
          console.warn('File picker failed, falling back to download:', pickerErr);
          fallbackSave();
        }
      } else {
        fallbackSave();
      }
    } catch (err: any) {
      console.error('Failed to save file:', err);
      dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: `Failed to save file: ${err.message || 'Unknown error'}`, type: 'error' } });
    }
  };

  const handleExportPlain = () => {
    const content = state.project.chapters.map(c => 
      c.scenes.map(s => s.content).join('\n\n***\n\n')
    ).join('\n\n\n');
    
    saveToFileSystem(content, `${state.project.title || 'manuscript'}.txt`, 'text/plain', '.txt');
  };

  const handleExportMarkdown = () => {
    const content = state.project.chapters.map(c => 
      `# ${c.title}\n\n` + c.scenes.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n')
    ).join('\n\n');
    
    saveToFileSystem(content, `${state.project.title || 'manuscript'}.md`, 'text/markdown', '.md');
  };

  const handleExportJson = () => {
    // Strip out transient state
    const stateToExport = { ...state };
    delete stateToExport.saveError;
    delete stateToExport.lastSaved;

    const content = JSON.stringify(stateToExport, null, 2);
    saveToFileSystem(content, `${state.project.title || 'novellum-backup'}-${new Date().toISOString().split('T')[0]}.json`, 'application/json', '.json');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (window.confirm('Are you sure you want to import this backup? This will completely overwrite your current project and all snapshots.')) {
          dispatch({ type: 'LOAD_STATE', payload: parsed });
          dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Backup restored successfully!', type: 'success' } });
          // Reset the file input
          e.target.value = '';
        }
      } catch (err) {
        dispatch({ type: 'SHOW_NOTIFICATION', payload: { message: 'Failed to import backup. The file might be corrupted or invalid.', type: 'error' } });
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const SettingToggle = ({ 
    icon: Icon, 
    title, 
    description, 
    checked, 
    onChange 
  }: { 
    icon: any, 
    title: string, 
    description: string, 
    checked: boolean, 
    onChange: () => void 
  }) => (
    <label className="flex items-center justify-between gap-4 py-4 px-2 md:px-4 border-b border-[rgba(255,255,255,0.03)] last:border-0 cursor-pointer group">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-bg-card flex items-center justify-center shrink-0 group-hover:bg-bg-hover transition-colors">
          <Icon size={18} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium tracking-wide block truncate">{title}</span>
          <span className="text-text-muted text-xs block truncate">{description}</span>
        </div>
      </div>
      <div className="relative shrink-0 ml-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-bg-card rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] peer-checked:after:bg-[var(--accent-primary)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
      </div>
    </label>
  );

  const ActionItem = ({ 
    icon: Icon, 
    title, 
    description, 
    onClick,
    danger = false
  }: { 
    icon: any, 
    title: string, 
    description: string, 
    onClick: () => void,
    danger?: boolean
  }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-4 py-4 px-2 md:px-4 border-b border-[rgba(255,255,255,0.03)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-xl group text-left">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-2xl bg-bg-card flex items-center justify-center shrink-0 group-hover:bg-bg-hover transition-colors ${danger ? 'text-red-400' : 'text-text-muted'}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-medium tracking-wide block truncate ${danger ? 'text-red-400' : 'text-white'}`}>{title}</span>
          <span className="text-text-muted text-xs block truncate">{description}</span>
        </div>
      </div>
      <ChevronRight size={18} className="text-text-muted shrink-0" />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-bg-main h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 pb-12">
        
        <div className="flex items-center justify-center pt-4 pb-2">
          <h2 className="text-xl font-semibold text-white tracking-wide">Settings</h2>
        </div>

        <section>
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 px-4">Appearance</h3>
          <div className="bg-bg-panel rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-4 mb-4 px-2">
              <div className="w-10 h-10 rounded-2xl bg-bg-card flex items-center justify-center shrink-0">
                <Palette size={18} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium tracking-wide block truncate">Color Theme</span>
                <span className="text-text-muted text-xs block truncate">Choose your preferred aesthetic</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-2">
              {[
                { id: 'ignite', name: 'Ignite', color: '#ff6b35' },
                { id: 'twilight', name: 'Twilight', color: '#8B7BFF' },
                { id: 'forest', name: 'Forest', color: '#10b981' },
                { id: 'ocean', name: 'Ocean', color: '#3b82f6' }
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                    state.settings.theme === theme.id 
                      ? 'bg-bg-card border-white/20 shadow-md' 
                      : 'bg-transparent border-transparent hover:bg-bg-hover'
                  }`}
                >
                  <div 
                    className="w-8 h-8 rounded-full shadow-inner"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className={`text-xs font-medium ${state.settings.theme === theme.id ? 'text-white' : 'text-text-muted'}`}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 px-4">Cleanup Preferences</h3>
          <div className="bg-bg-panel rounded-3xl p-2 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)]">
            <SettingToggle
              icon={Scissors}
              title="Remove Bracketed Tags"
              description="Strips out [brackets] or <angle brackets>"
              checked={state.settings.removeBracketedTags}
              onChange={() => handleToggle('removeBracketedTags')}
            />
            <SettingToggle
              icon={Type}
              title="Lowercase ALL CAPS"
              description="Converts capitalized words to lowercase"
              checked={state.settings.lowercaseAllCaps}
              onChange={() => handleToggle('lowercaseAllCaps')}
            />
            <SettingToggle
              icon={AlignLeft}
              title="Normalize Spacing"
              description="Reduces multiple spaces and newlines"
              checked={state.settings.normalizeSpacing}
              onChange={() => handleToggle('normalizeSpacing')}
            />
            <SettingToggle
              icon={SettingsIcon}
              title="Normalize Punctuation"
              description="Fixes spacing around punctuation marks"
              checked={state.settings.normalizePunctuation}
              onChange={() => handleToggle('normalizePunctuation')}
            />
          </div>
        </section>

        <section>
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 px-4">Export & Backup</h3>
          <div className="bg-bg-panel rounded-3xl p-2 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)]">
            <ActionItem
              icon={FileText}
              title="Export as Plain Text"
              description="Download manuscript as .txt"
              onClick={handleExportPlain}
            />
            <ActionItem
              icon={FileText}
              title="Export as Markdown"
              description="Download manuscript as .md"
              onClick={handleExportMarkdown}
            />
            <ActionItem
              icon={Download}
              title="Download Full Backup"
              description="Save complete project state as .json"
              onClick={handleExportJson}
            />
            <label className="w-full flex items-center justify-between gap-4 py-4 px-2 md:px-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-xl group text-left cursor-pointer">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-bg-card flex items-center justify-center shrink-0 group-hover:bg-bg-hover transition-colors text-text-muted">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium tracking-wide block truncate text-white">Restore Backup</span>
                  <span className="text-text-muted text-xs block truncate">Load a previously saved .json file</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0" />
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportJson}
              />
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 px-4">Danger Zone</h3>
          <div className="bg-bg-panel rounded-3xl p-2 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.03)]">
            <ActionItem
              icon={Trash2}
              title="Reset App Data"
              description="Clear all local data and start fresh"
              danger={true}
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
                  localStorage.removeItem('novellum-state');
                  localStorage.removeItem('nexus-writer-state');
                  window.location.reload();
                }
              }}
            />
          </div>
        </section>

      </div>
    </div>
  );
};
