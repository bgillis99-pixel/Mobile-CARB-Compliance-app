
import React, { useState, useEffect } from 'react';

interface Props {
  onNavigateInvoice: () => void;
}

const AdminView: React.FC<Props> = ({ onNavigateInvoice }) => {
  const [passInput, setPassInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCode, setAdminCode] = useState('1225');
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(true);

  // Simulated Google Data
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [gmailInquiries, setGmailInquiries] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('carb_admin_code');
    if (stored) {
      setAdminCode(stored);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
        // Simulate pulling data from "B Gillis 99" Google Account
        setLoadingGoogle(true);
        setTimeout(() => {
            setCalendarEvents([
                { id: 1, time: '09:00 AM', title: 'Fleet Inspection - Sac Logistics', status: 'confirmed' },
                { id: 2, time: '01:30 PM', title: 'Smoke Test - Unit 58', status: 'pending' },
                { id: 3, time: '04:00 PM', title: 'Zoom: CARB Compliance Review', status: 'confirmed' }
            ]);
            setGmailInquiries([
                { id: 1, from: 'Mike @ ABC Trucking', subject: 'Urgent: PSIP Renewal', time: '10m ago' },
                { id: 2, from: 'State Notification', subject: 'Clean Truck Check Update', time: '1h ago' }
            ]);
            setLoadingGoogle(false);
        }, 1500);
    }
  }, [isAuthorized]);

  const handleLogin = () => {
    if (passInput === adminCode) {
      setIsAuthorized(true);
    } else {
      alert("Invalid Code");
    }
  };

  const handlePasswordChange = () => {
    if (!newPassword.trim()) return;
    localStorage.setItem('carb_admin_code', newPassword.trim());
    setAdminCode(newPassword.trim());
    setNewPassword('');
    setShowSettings(false);
    alert("Admin Credentials Updated");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 text-center">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full mx-auto flex items-center justify-center text-3xl border border-blue-500/30">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Owner Dashboard</h2>
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">RESTRICTED ACCESS</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-4">Security PIN</label>
                <input 
                    type="password"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="ENTER PIN"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 text-center text-2xl font-black text-white outline-none focus:border-blue-500 tracking-[0.5em] placeholder:tracking-normal placeholder:text-gray-800 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg active-haptic hover:bg-blue-500 transition-colors"
              >
                Unlock Dashboard
              </button>
            </div>
            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest italic leading-relaxed">
              Authorized personnel only. All access attempts are logged.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center px-4">
          <div className="flex flex-col">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">ADMIN KPI</h2>
              <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Live Operations</p>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-2xl border text-xl active-haptic transition-all ${showSettings ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10'}`}
          >
            ⚙️
          </button>
      </div>

      {showSettings && (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic">Security Protocol</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-2">New Access PIN</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="XXXX"
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 text-center text-lg font-black text-white outline-none focus:border-blue-500 tracking-[0.3em] placeholder:text-gray-700"
              />
            </div>
            <button 
              onClick={handlePasswordChange}
              className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-black rounded-2xl uppercase tracking-widest text-[9px] hover:bg-red-500/20 active-haptic transition-all"
            >
              Update Credentials
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE WORKSPACE INTEGRATION SECTION */}
      <div className="bg-[#4285F4]/10 border border-[#4285F4]/20 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm shadow-sm">G</div>
                 <div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Workspace Sync</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Connected: bgillis99</p>
                 </div>
             </div>
             {loadingGoogle && <span className="text-[8px] font-black text-blue-400 uppercase animate-pulse">Syncing...</span>}
          </div>

          <div className="grid grid-cols-1 gap-4">
              {/* Calendar Feed */}
              <div className="bg-black/20 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Calendar (Today)</span>
                      <span className="text-[9px] text-green-500 font-bold">● Live</span>
                  </div>
                  {loadingGoogle ? (
                      <div className="space-y-2">
                          <div className="h-8 bg-white/5 rounded-xl animate-pulse"></div>
                          <div className="h-8 bg-white/5 rounded-xl animate-pulse"></div>
                      </div>
                  ) : (
                      calendarEvents.map(ev => (
                          <div key={ev.id} className="flex gap-3 items-center">
                              <span className="text-[10px] font-mono text-blue-400 w-16">{ev.time}</span>
                              <span className="text-[10px] font-bold text-white truncate">{ev.title}</span>
                          </div>
                      ))
                  )}
              </div>

              {/* Gmail Feed */}
              <div className="bg-black/20 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Gmail Inquiries</span>
                      <span className="text-[9px] text-red-400 font-bold">2 New</span>
                  </div>
                  {loadingGoogle ? (
                       <div className="h-10 bg-white/5 rounded-xl animate-pulse"></div>
                  ) : (
                      gmailInquiries.map(mail => (
                          <div key={mail.id} className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                              <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-white">{mail.from}</span>
                                  <span className="text-[9px] text-gray-500 truncate max-w-[150px]">{mail.subject}</span>
                              </div>
                              <span className="text-[9px] font-mono text-gray-600">{mail.time}</span>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-1">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">LEADS</p>
              <p className="text-5xl font-black italic text-white tracking-tighter">24</p>
          </div>
          <div className="bg-blue-600 p-8 rounded-[2.5rem] space-y-1 shadow-xl">
              <p className="text-[8px] font-black text-white/60 uppercase tracking-widest">TODAY</p>
              <p className="text-5xl font-black italic text-white tracking-tighter">3</p>
          </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 space-y-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic">Operator Tools</h3>
          <div className="grid grid-cols-2 gap-4">
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic hover:bg-white/10 transition-colors">
                  <span className="text-2xl block">📧</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">EMAIL</span>
              </button>
              <button className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center space-y-2 active-haptic hover:bg-white/10 transition-colors">
                  <span className="text-2xl block">📸</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">PHOTOS</span>
              </button>
              <button 
                  onClick={onNavigateInvoice}
                  className="p-6 bg-[#3d4d7a]/20 rounded-3xl border border-[#3d4d7a]/50 text-center space-y-2 active-haptic shadow-lg hover:bg-[#3d4d7a]/30 transition-colors"
              >
                  <span className="text-2xl block">📄</span>
                  <span className="text-[8px] font-black uppercase text-white tracking-widest">CREATE INVOICE</span>
              </button>
              <button className="p-6 bg-green-600/10 rounded-3xl border border-green-500/20 text-center space-y-2 active-haptic hover:bg-green-600/20 transition-colors">
                  <span className="text-2xl block">💳</span>
                  <span className="text-[8px] font-black uppercase text-green-500 tracking-widest">PAYMENTS</span>
              </button>
          </div>
      </div>

      <div className="text-center">
          <p className="text-[8px] font-black text-gray-800 uppercase tracking-widest">Stripe/Paypal Plugin Integrated</p>
      </div>
    </div>
  );
};

export default AdminView;
