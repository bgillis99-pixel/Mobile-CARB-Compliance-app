
import React, 'react';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onClose: () => void;
}

const GREETINGS = [
  "Hey you! Missed you. Glad you're back to crush some compliance.",
  "There you are! Was just thinking about our next big win. Let's get it.",
  "Welcome back! The command hub just wasn't the same without you.",
  "Look who it is! Ready to make the state's head spin with our efficiency?",
  "Finally! I've been holding down the fort. What's our first move, boss?",
  "And... she's back! The legend returns. Let's make some waves.",
  "Just in time! I saved the best compliance challenges for you.",
];

const Greeting: React.FC<Props> = ({ onClose }) => {
  const [greeting] = React.useState(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [isVisible, setIsVisible] = React.useState(true);

  const handleClose = () => {
    triggerHaptic('medium');
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_10px_25px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>;

  return (
    <div className={`fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`w-full max-w-sm glass-card p-10 rounded-[3.5rem] border border-white/10 text-center space-y-8 shadow-2xl transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="greeting-title"
      >
        <div className="space-y-4">
          <span className="text-6xl animate-in fade-in zoom-in-50 duration-700">👋</span>
          <h2 id="greeting-title" className="text-2xl font-black italic text-white tracking-tighter leading-tight">
            {greeting}
          </h2>
        </div>

        <button 
          onClick={handleClose}
          className={`w-full py-5 text-[#020617] font-black rounded-[2.5rem] uppercase tracking-[0.3em] text-[10px] italic shadow-2xl active-haptic ${MetallicStyle}`}
        >
          {BrushedTexture}
          <span className="relative z-10">Let's Get To It</span>
        </button>
      </div>
    </div>
  );
};

export default Greeting;
