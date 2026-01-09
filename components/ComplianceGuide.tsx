import React from 'react';
import { triggerHaptic } from '../services/haptics';

const ComplianceGuide: React.FC = () => {
  const steps = [
    {
      icon: "🏢",
      title: "Register Entity",
      url: "https://cleantruckcheck.arb.ca.gov/Entity/EntityManagement/RegisterEntity"
    },
    {
      icon: "🚛",
      title: "List Vehicles",
      url: "https://cleantruckcheck.arb.ca.gov/Fleet/Vehicle/VehicleManagement"
    },
    {
      icon: "⚡",
      title: "Find OBD Tester",
      url: "#",
      internalAction: true
    }
  ];

  const MetallicStyle = "bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-200 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 pointer-events-none"></div>;

  return (
    <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Quick Access Hub</h3>
        <span className="h-px flex-1 mx-4 bg-white/5"></span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {steps.map((step, idx) => (
          <button 
            key={idx}
            onClick={() => {
              triggerHaptic('light');
              if (step.internalAction) {
                document.getElementById('find-tester-trigger')?.click();
              } else {
                window.open(step.url, '_blank');
              }
            }}
            className={`w-full py-5 px-8 rounded-3xl flex items-center justify-between group active-haptic ${MetallicStyle}`}
          >
            {BrushedTexture}
            <div className="flex items-center gap-4 relative z-10">
              <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{step.icon}</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest italic">{step.title}</span>
            </div>
            <span className="text-slate-800 font-thin text-xl relative z-10 group-hover:translate-x-1 transition-transform">›</span>
          </button>
        ))}
      </div>

      <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 text-center mt-4">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
          System Status: <span className="text-carb-green">Connected</span> • Registry Sync Active
        </p>
      </div>
    </div>
  );
};

export default ComplianceGuide;