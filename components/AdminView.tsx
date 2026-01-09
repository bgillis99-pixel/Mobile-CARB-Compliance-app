
import React, { useState, useEffect } from 'react';
import { getClientsFromCRM, subscribeToInboundIntakes, saveClientToCRM } from '../services/firebase';
import { CrmClient, IntakeSubmission } from '../types';
import { triggerHaptic } from '../services/haptics';

interface Props {
  onNavigateInvoice: (data?: any) => void;
}

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode] = useState('1225');
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'INTAKES' | 'CRM'>('DASHBOARD');
  const [intakes, setIntakes] = useState<IntakeSubmission[]>([]);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
        const unsub = subscribeToInboundIntakes((data) => setIntakes(data));
        getClientsFromCRM().then(data => setCrmClients(data));
        return () => unsub();
    }
  }, [isAuthorized]);

  const handleLogin = () => {
    triggerHaptic('medium');
    if (passInput === adminCode) { setIsAuthorized(true); triggerHaptic('success'); }
    else { triggerHaptic('error'); alert("Access Denied."); }
  };

  const handleSyncContacts = async () => {
    const nav = navigator as any;
    if (!('contacts' in nav && 'select' in nav.contacts)) {
      alert("Device Contact Sync requires a modern mobile browser (Chrome/Safari on iOS/Android). Please use a mobile device for this feature.");
      return;
    }

    try {
      setIsSyncing(true);
      triggerHaptic('medium');
      const props = ['name', 'email', 'tel'];
      const opts = { multiple: true };
      
      const contacts = await nav.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        for (const contact of contacts) {
          const name = contact.name?.[0] || 'Unknown Contact';
          const email = contact.email?.[0] || '';
          const phone = contact.tel?.[0] || '';
          
          await saveClientToCRM({
            clientName: name,
            email: email,
            phone: phone,
            vin: '',
            plate: '',
            timestamp: Date.now(),
            status: 'New',
            notes: 'Imported from Google/Device Contacts'
          });
        }
        
        // Refresh local list
        const updated = await getClientsFromCRM();
        setCrmClients(updated);
        triggerHaptic('success');
        alert(`Successfully synced ${contacts.length} contacts to CRM.`);
      }
    } catch (err) {
      console.error("Contact Sync Error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="glass-card p-6 rounded-[2rem] border border-white/5">
       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-2xl font-black italic text-white tracking-tighter">{value}</p>
    </div>
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-in fade-in duration-500">
        <div className="w-full max-w-xs glass-card p-10 rounded-[3rem] border border-white/10 text-center space-y-8">
            <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">COMMAND</h2>
            <input 
              type="password" 
              value={passInput} 
              onChange={e => setPassInput(e.target.value)} 
              placeholder="CODE" 
              className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-center text-2xl font-black tracking-widest outline-none focus:border-carb-accent" 
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={handleLogin} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px]">Access Console</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
       <div className="flex gap-2 overflow-x-auto no-scrollbar items-center justify-between">
          <div className="flex gap-2">
            {['DASHBOARD', 'INTAKES', 'CRM'].map(m => (
              <button 
                key={m} 
                onClick={() => setViewMode(m as any)}
                className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest italic border transition-all ${viewMode === m ? 'bg-carb-accent text-white border-carb-accent' : 'bg-white/5 text-slate-500 border-white/5'}`}
              >
                {m}
              </button>
            ))}
          </div>
          {viewMode === 'CRM' && (
            <button 
              onClick={handleSyncContacts}
              disabled={isSyncing}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest italic border border-white/10 transition-all flex items-center gap-2"
            >
              <span>{isSyncing ? '⏳' : '🔄'}</span>
              {isSyncing ? 'Syncing...' : 'Sync Device Contacts'}
            </button>
          )}
       </div>

       {viewMode === 'DASHBOARD' && (
          <div className="space-y-8">
             <div className="grid grid-cols-2 gap-4">
                <StatBox label="Revenue MTD" value="$14,250" />
                <StatBox label="Active Invoices" value="09" />
                <StatBox label="Compliance %" value="98.4%" />
                <StatBox label="Pending Intakes" value={intakes.length.toString()} />
             </div>
             
             <div className="glass-card p-8 rounded-[3rem] space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Live Operations Feed</h3>
                <div className="divide-y divide-white/5">
                   {intakes.slice(0, 3).map(i => (
                     <div key={i.id} className="py-4 flex justify-between items-center">
                        <div>
                           <p className="text-sm font-black text-white italic">{i.clientName}</p>
                           <p className="text-[8px] font-bold text-slate-600 uppercase">VIN: {(i.extractedData as any)?.vin || '---'}</p>
                        </div>
                        <button onClick={() => onNavigateInvoice({ name: i.clientName, vin: (i.extractedData as any)?.vin })} className="bg-white/5 p-2 rounded-xl text-xs">📄</button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       )}

       {viewMode === 'INTAKES' && (
         <div className="space-y-4">
            {intakes.map(i => (
              <div key={i.id} className="glass-card p-6 rounded-3xl flex justify-between items-center border border-white/5">
                 <div>
                    <p className="text-lg font-black italic text-white leading-none">{i.clientName}</p>
                    <p className="text-[8px] text-carb-accent font-black uppercase mt-1">FIELD SESSION: {i.sessionId}</p>
                 </div>
                 <button onClick={() => onNavigateInvoice({ name: i.clientName, vin: (i.extractedData as any)?.vin })} className="bg-carb-accent text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase italic">Invoice</button>
              </div>
            ))}
         </div>
       )}

       {viewMode === 'CRM' && (
          <div className="space-y-4">
             {crmClients.length === 0 ? (
               <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                  <p className="text-2xl mb-2 opacity-50">📇</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">No clients found. Sync your contacts to get started.</p>
               </div>
             ) : (
               crmClients.map(c => (
                 <div key={c.id} className="glass-card p-6 rounded-3xl flex justify-between items-center border border-white/5">
                    <div>
                      <p className="text-lg font-black italic text-white leading-none">{c.clientName}</p>
                      <p className="text-[8px] text-slate-500 font-black uppercase mt-1">{c.phone || c.email || 'NO CONTACT'}</p>
                    </div>
                    <button onClick={() => onNavigateInvoice(c)} className="bg-carb-accent text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase italic">Invoice</button>
                 </div>
               ))
             )}
          </div>
       )}
    </div>
  );
};

export default AdminView;
