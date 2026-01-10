
import React from 'react';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallPrompt: React.FC<Props> = ({ onInstall, onDismiss }) => {
  const handleInstall = () => {
    triggerHaptic('medium');
    onInstall();
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    onDismiss();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[4000] animate-in slide-in-from-bottom-12 duration-500 pb-safe px-4">
      <div className="bg-slate-800/80 backdrop-blur-xl p-4 rounded-3xl flex items-center gap-4 border border-white/10 shadow-2xl max-w-md mx-auto">
        <span className="text-3xl bg-slate-900 p-3 rounded-xl border border-white/5">📲</span>
        <div className="flex-1 text-left">
          <p className="text-white font-black text-sm leading-tight">Proactive Compliance Hub</p>
          <p className="text-slate-300 text-xs">Add to Home Screen for faster access.</p>
        </div>
        <button 
          onClick={handleInstall} 
          className="bg-carb-accent text-slate-950 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest italic"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="text-slate-500 text-2xl pr-2">&times;</button>
      </div>
    </div>
  );
};

export default InstallPrompt;
