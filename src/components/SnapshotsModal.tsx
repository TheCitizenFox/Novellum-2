import React from 'react';
import { useAppStore } from '../store';
import { X, Clock, RotateCcw, Trash2, Camera } from 'lucide-react';

interface SnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppStore();

  if (!isOpen) return null;

  const handleCreateSnapshot = () => {
    dispatch({ type: 'CREATE_SNAPSHOT' });
  };

  const handleRestore = (id: string) => {
    if (window.confirm('Are you sure you want to restore this snapshot? Your current unsaved progress will be lost.')) {
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: id });
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this snapshot?')) {
      dispatch({ type: 'DELETE_SNAPSHOT', payload: id });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.05)] bg-bg-main">
          <div className="flex items-center gap-3">
            <Clock className="text-accent-primary" size={24} />
            <h2 className="text-xl font-bold text-white">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white p-2 rounded-xl hover:bg-bg-card transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-bg-panel">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold mb-1">Current Manuscript</h3>
              <p className="text-text-muted text-sm">Take a snapshot of your current work to restore later.</p>
            </div>
            <button
              onClick={handleCreateSnapshot}
              className="flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[#e85d2c] text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(255,107,53,0.3)] active:scale-95 shrink-0"
            >
              <Camera size={16} /> Take Snapshot
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-bg-main">
          {state.snapshots && state.snapshots.length > 0 ? (
            <div className="space-y-4">
              {state.snapshots.map((snapshot) => {
                const date = new Date(snapshot.timestamp);
                return (
                  <div key={snapshot.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-2xl hover:border-[rgba(255,255,255,0.1)] transition-all">
                    <div>
                      <div className="text-white font-bold mb-1">
                        {date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-text-muted text-sm flex items-center gap-2">
                        <Clock size={12} />
                        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleRestore(snapshot.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-hover text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                      <button
                        onClick={() => handleDelete(snapshot.id)}
                        className="p-2 text-text-muted hover:text-red-400 hover:bg-bg-card rounded-xl transition-all active:scale-95 shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-bg-card rounded-2xl flex items-center justify-center mb-4">
                <Clock size={24} className="text-text-muted" />
              </div>
              <h3 className="text-white font-bold mb-2">No Snapshots Yet</h3>
              <p className="text-text-muted text-sm max-w-sm">
                Take a snapshot to save a version of your manuscript that you can restore at any time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
