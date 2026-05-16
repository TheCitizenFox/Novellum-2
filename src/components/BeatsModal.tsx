import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutList } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAppStore } from '../store';

interface BeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId: string;
}

export const BeatsModal: React.FC<BeatsModalProps> = ({ isOpen, onClose, sceneId }) => {
  const { dispatch } = useAppStore();
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) return;

    const beats = lines.map(line => ({
      id: crypto.randomUUID(),
      label: line.replace(/^[\d.-]+\s*|\*\s*/, ''), // strip leading bullets/numbers
      content: ''
    }));

    dispatch({ type: 'ADD_BEATS', payload: { sceneId, beats } });
    setContent('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="flex flex-col bg-bg-panel border border-[rgba(255,255,255,0.05)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-3 text-white">
                <LayoutList className="text-[var(--accent-primary)]" size={24} />
                <h3 className="text-xl font-bold tracking-wide">Add Scene Beats</h3>
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-bg-card transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 p-6 gap-4">
              <p className="text-text-muted text-sm leading-relaxed">
                Paste or type your beats as a list. Each line will become a separate structural block in the scene editor, allowing you to flesh out the prose for each beat individually.
              </p>
              
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
                placeholder="1. The protagonist enters the room...&#10;2. They discover the hidden letter...&#10;3. The antagonist arrives unexpectedly..."
                className="w-full h-64 bg-bg-card border border-[rgba(255,255,255,0.05)] focus:border-[var(--accent-primary)]/50 rounded-xl p-4 text-white placeholder-text-muted/50 focus:outline-none resize-none font-serif leading-relaxed transition-colors shadow-inner"
              />
              
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-text-muted hover:text-white hover:bg-bg-card transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[#e85d2c] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(255,107,53,0.3)]"
                >
                  Generate Blocks
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
