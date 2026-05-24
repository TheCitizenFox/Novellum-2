import React from 'react';
import { useAppStore } from '../store';
import { Download, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const RecoveryView: React.FC = () => {
  const { state } = useAppStore();

  const handleDownloadRaw = () => {
    if (!state.recoveryData) return;
    const blob = new Blob([state.recoveryData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novellum-recovery-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartFresh = () => {
    if (window.confirm("Are you sure you want to clear your local storage and start a fresh project? Make sure you have downloaded your recovery data first!")) {
      localStorage.removeItem('novellum-state');
      localStorage.removeItem('nexus-writer-state');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-[#121214] border border-red-500/20 rounded-3xl p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.15)] flex flex-col gap-6"
      >
        <div className="flex items-center gap-4 text-red-500 mb-2">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={28} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Recovery Required</h1>
            <p className="text-sm text-red-400 font-medium">Automatic saves disabled to protect your data.</p>
          </div>
        </div>

        <div className="space-y-4 text-[#a1a1aa] text-sm leading-relaxed">
          <p>
             Your existing manuscript data could not be parsed safely. To prevent an empty or 
             default project from overwriting your previous work, Novellum has engaged a 
             <strong> fail-safe read-only mode</strong>.
          </p>
          <p>
             Your unreadable raw stored value has been preserved in your browser under a unique, 
             quarantined safe-key that will not be overwritten.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={handleDownloadRaw}
            className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold transition-all active:scale-[0.98] shadow-lg shadow-red-500/20"
          >
            <Download size={20} />
            Download Raw Recovery Data
          </button>
          <p className="text-center text-xs text-[#52525b] mt-1 mb-4">
            * This file contains raw characters. It may be malformed JSON.
          </p>

          <div className="h-[1px] w-full bg-white/5 my-2" />

          <button
            onClick={handleStartFresh}
            className="w-full flex items-center justify-center gap-3 bg-transparent hover:bg-white/5 border border-white/10 text-[#a1a1aa] hover:text-white py-4 rounded-xl font-medium transition-all active:scale-[0.98]"
          >
            Clear Data & Start Fresh Project
          </button>
        </div>
      </motion.div>
    </div>
  );
};
