
import React, { useState, useRef } from 'react';
import { scoutTruckLead } from '../services/geminiService';
import { Lead, HotLead } from '../types';

const HOT_LEADS_DATA: HotLead[] = [
  {
    id: '1',
    company: "Lassen Forest Products Inc",
    phone: "(530) 527-7677",
    email: "alex@lassenforestproducts.com",
    address: "22829 Casale Rd, Red Bluff, CA 96080",
    fleetSize: "12 Trucks",
    status: 'HOT',
    zone: "NorCal",
    source: "BBB/Yelp",
    smsTemplate: "🚛 LASSEN FOREST - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '2',
    company: "Mendocino Forest Products",
    phone: "(707) 485-6882",
    email: "info@mendoco.com",
    address: "3700 Old Redwood Hwy Ste 200, Santa Rosa, CA",
    fleetSize: "51-200",
    status: 'HOT',
    zone: "✅ GOOD (50-100mi)",
    source: "ZoomInfo",
    smsTemplate: "🚛 MENDOCINO FOREST - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  },
  {
    id: '3',
    company: "Yandell Truckaway Inc",
    phone: "(707) 748-0132",
    email: "tom.twyford@yandelltruckaway.com",
    address: "360 Industrial Ct, Benicia, CA 94510",
    fleetSize: "22 employees",
    status: 'HOT',
    zone: "🔥 HOT (<50mi)",
    source: "ZoomInfo",
    smsTemplate: "🚛 YANDELL TRUCKAWAY - CARB ALERT: Fleet NOT COMPLIANT in CTC-VIS. DMV holds + CHP citations coming. Mobile testing $75 OBD / $250 smoke. Text YES - NorCal CARB 916-890-4427"
  }
];

const AdminView: React.FC = () => {
  const [currentApp, setCurrentApp] = useState<'HOME' | 'LEADS' | 'ANALYTICS'>('HOME');
  const [scouting, setScouting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AppIcon = ({ label, icon, color, onClick, badge }: any) => (
      <button 
        onClick={onClick}
        className="flex flex-col items-center gap-3 transition-transform active:scale-90 group"
      >
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl text-white shadow-2xl relative border border-white/10 ${color}`}>
             <span className="group-hover:scale-110 transition-transform">{icon}</span>
             {badge > 0 && (
                 <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#020617] shadow-xl">
                     {badge}
                 </div>
             )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 italic group-hover:text-white transition-colors">{label}</span>
      </button>
  );

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScouting(true);
    try {
        await scoutTruckLead(file);
        alert('Lead captured and analyzed. Redirecting to CRM...');
    } catch (err) { alert('Scout analysis failed.'); } finally { setScouting(false); }
  };

  const renderApp = () => {
      if (currentApp === 'HOME') {
        return (
          <div className="min-h-screen bg-carb-navy p-10 relative overflow-hidden animate-in fade-in duration-1000">
              <div className="flex justify-between text-[10px] font-black text-gray-600 mb-16 relative z-10 uppercase tracking-[0.4em] italic">
                  <span>Carrier Hub v3.4</span>
                  <div className="flex gap-4">
                      <span className="text-blue-500 animate-pulse">● LIVE</span>
                      <span>100% LINKED</span>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-y-16 gap-x-10 relative z-10 max-w-sm mx-auto">
                  <AppIcon label="Hot Leads" icon="🎯" color="bg-red-600/80" onClick={() => setCurrentApp('LEADS')} badge={HOT_LEADS_DATA.length} />
                  <AppIcon label="Momentum" icon="📈" color="bg-purple-600/80" onClick={() => setCurrentApp('ANALYTICS')} />
                  <AppIcon label="Dispatch" icon="📞" color="bg-green-600/80" onClick={() => window.location.href = 'tel:6173596953'} />
                  <AppIcon label="Scout" icon="📸" color="bg-gray-800" onClick={() => fileInputRef.current?.click()} />
                  <AppIcon label="Cloud" icon="📂" color="bg-yellow-600/80" onClick={() => window.open('https://drive.google.com', '_blank')} />
                  <AppIcon label="CARB" icon="🏛️" color="bg-blue-600/80" onClick={() => window.open('https://cleantruckcheck.arb.ca.gov/', '_blank')} />
              </div>

              <div className="absolute bottom-12 left-10 right-10 glass-dark rounded-[3.5rem] p-8 flex justify-around items-center z-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10">
                  <AppIcon label="" icon="📞" color="bg-green-500 shadow-2xl" onClick={() => window.location.href = 'tel:6173596953'} />
                  <AppIcon label="" icon="🌐" color="bg-blue-400 shadow-2xl" onClick={() => window.open('https://carbcleantruckcheck.app', '_blank')} />
                  <AppIcon label="" icon="🤖" color="bg-carb-navy shadow-2xl border-white/20" onClick={() => setCurrentApp('HOME')} />
              </div>

              <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          </div>
        );
      }

      if (currentApp === 'LEADS') {
          return (
              <div className="h-full bg-carb-navy flex flex-col p-8 space-y-10 pb-32 overflow-y-auto animate-in slide-in-from-right duration-500">
                  <header className="flex justify-between items-center">
                    <button onClick={() => setCurrentApp('HOME')} className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">‹ BACK</button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Carrier Leads</h2>
                    <div className="w-10"></div>
                  </header>

                  <div className="space-y-6">
                      {HOT_LEADS_DATA.map((lead) => (
                          <div key={lead.id} className="glass p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group hover:border-carb-accent/30 transition-all shadow-xl">
                              {lead.status === 'HOT' && <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest italic">Urgent</div>}
                              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">{lead.company}</h3>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">📍 {lead.address}</p>
                              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-6">Zone: {lead.zone}</p>
                              
                              <div className="flex gap-4">
                                  <a href={`tel:${lead.phone.replace(/\D/g, '')}`} className="flex-1 py-4 bg-white text-carb-navy rounded-2xl font-black text-[10px] text-center uppercase tracking-widest active-haptic italic shadow-lg">Voice</a>
                                  <a href={`sms:${lead.phone.replace(/\D/g, '')}?body=${encodeURIComponent(lead.smsTemplate)}`} className="flex-1 py-4 glass text-carb-accent rounded-2xl font-black text-[10px] text-center uppercase tracking-widest border border-carb-accent/20 active-haptic italic">SMS</a>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      if (currentApp === 'ANALYTICS') {
          return (
              <div className="h-full bg-carb-navy p-10 space-y-12 animate-in zoom-in duration-500">
                  <header className="flex justify-between items-center">
                    <button onClick={() => setCurrentApp('HOME')} className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">‹ BACK</button>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Momentum</h2>
                    <div className="w-10"></div>
                  </header>

                  <div className="glass p-12 rounded-[4rem] border border-white/5 space-y-4 text-center">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic">Network Pings (7D)</p>
                      <p className="text-8xl font-light text-white tracking-tighter">84</p>
                      <div className="bg-green-500/10 text-green-500 px-4 py-1 inline-block rounded-full text-[9px] font-black uppercase border border-green-500/20 italic tracking-widest">+12% VELOCITY</div>
                  </div>

                  <div className="glass p-10 rounded-[3.5rem] border border-white/5 space-y-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Zone Intensity</p>
                      <div className="space-y-4">
                          {[
                              { loc: 'Sacramento Valley', val: 32 },
                              { loc: 'Bay Area Hub', val: 24 },
                              { loc: 'Central Valley', val: 18 },
                              { loc: 'SoCal Transit', val: 10 }
                          ].map(z => (
                              <div key={z.loc} className="flex justify-between items-center">
                                  <span className="text-xs font-black text-white italic uppercase">{z.loc}</span>
                                  <div className="flex items-center gap-4 flex-1 justify-end">
                                      <div className="h-1 bg-white/5 rounded-full flex-1 max-w-[100px] overflow-hidden">
                                          <div className="h-full bg-carb-accent" style={{width: `${(z.val/32)*100}%`}}></div>
                                      </div>
                                      <span className="text-xs font-black text-carb-accent">{z.val}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          );
      }

      return null;
  };

  return renderApp();
};

export default AdminView;
