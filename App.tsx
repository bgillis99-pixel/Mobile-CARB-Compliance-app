import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME); 
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const shareUrl = 'https://clean-truck-check-compliant-25.web.app';

  useEffect(() => {
    initGA();
    if (auth) {
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
                setUser({ 
                    email: firebaseUser.email || 'User', 
                    history: cloudHistory as HistoryItem[] 
                });
            } else {
                setUser(null);
            }
        });
    }
  }, []);

  useEffect(() => {
      trackPageView(currentView);
  }, [currentView]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Clean Truck Check Compliant 12/26/25',
          text: 'Official proactive tool for CA HD I/M compliance.',
          url: shareUrl
        });
      } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied!');
    }
  };

  const handleAddToHistory = (value: string, type: 'VIN' | 'ENTITY' | 'TRUCRS') => {
    if (!user) return;
    const newItem: HistoryItem = { id: Date.now().toString(), value, type, timestamp: Date.now() };
    setUser({ ...user, history: [newItem, ...user.history] });
  };

  const triggerTesterSearch = () => {
    if (currentView !== AppView.HOME) {
        setCurrentView(AppView.HOME);
        setTimeout(() => document.getElementById('find-tester-trigger')?.click(), 100);
    } else {
        document.getElementById('find-tester-trigger')?.click();
    }
  };

  return (
    <div className="dark">
      <div className="min-h-screen flex flex-col bg-carb-navy text-white font-sans transition-colors duration-500">
        
        {/* TESLA STYLE HEADER */}
        <header className="pt-safe px-6 py-4 flex justify-between items-center fixed top-0 left-0 right-0 glass-dark z-[100]">
            <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">CTC COMPLIANT</h1>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.25em] -mt-1 animate-pulse-slow">EST. 12/26/25</p>
            </div>
            <div className="flex gap-2 items-center">
                <button 
                  onClick={triggerTesterSearch}
                  className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest active-haptic"
                >
                  Find Tester
                </button>
                <button onClick={() => window.location.href = 'tel:6173596953'} className="w-9 h-9 rounded-full glass border border-white/10 flex items-center justify-center text-base active-haptic transition-all">📞</button>
                <button onClick={handleShare} className="w-9 h-9 rounded-full glass border border-white/10 flex items-center justify-center text-base active-haptic transition-all">📤</button>
            </div>
        </header>

        {/* MAIN DISPLAY AREA */}
        <main className="flex-1 overflow-y-auto pt-24 pb-44 scroll-smooth">
            <div className="px-6">
                <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-carb-accent border-t-transparent rounded-full animate-spin"></div></div>}>
                    {currentView === AppView.HOME && (
                        <>
                          <VinChecker 
                              onAddToHistory={handleAddToHistory} 
                              onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                              onShareApp={() => setShowInstall(true)}
                              onNavigateTools={() => setCurrentView(AppView.ANALYZE)}
                          />
                          <ComplianceGuide />
                        </>
                    )}
                    {currentView === AppView.ASSISTANT && <ChatAssistant />}
                    {currentView === AppView.GARAGE && <GarageView user={user} onNavigateLogin={() => setCurrentView(AppView.PROFILE)} />}
                    {currentView === AppView.ANALYZE && <MediaTools />}
                    {currentView === AppView.PROFILE && (
                        <ProfileView 
                            user={user} 
                            onLogin={() => {}} 
                            onRegister={() => {}} 
                            onLogout={() => setUser(null)}
                            onAdminAccess={() => setCurrentView(AppView.ADMIN)}
                            isOnline={true}
                            isDarkMode={true}
                            toggleTheme={() => {}}
                        />
                    )}
                    {currentView === AppView.ADMIN && <AdminView />}
                </Suspense>

                {currentView === AppView.HOME && (
                    <div className="mt-12 space-y-2 pb-10">
                        {[
                          { label: "Find Tester", icon: "📍", action: triggerTesterSearch },
                          { label: "AI Diagnostic Chat", icon: "🤖", action: () => setCurrentView(AppView.ASSISTANT) },
                          { label: "Document Scanning", icon: "📄", action: () => setCurrentView(AppView.ANALYZE) },
                          { label: "Apply for 5-Day Pass", icon: "🎟️", action: () => window.open('https://cleantruckcheck.arb.ca.gov/Fleet/FiveDayPass', '_blank') },
                          { label: "Legal & Privacy", icon: "🛡️", action: () => setShowPrivacy(true) }
                        ].map((item, idx) => (
                            <button 
                                key={idx}
                                onClick={item.action}
                                className="w-full flex items-center justify-between p-6 rounded-[2rem] glass hover:bg-white/5 active-haptic transition-all group"
                            >
                                <div className="flex items-center gap-5">
                                    <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                                    <span className="text-base font-bold text-gray-200 tracking-tight">{item.label}</span>
                                </div>
                                <span className="text-gray-600 text-2xl font-thin group-hover:text-white transition-colors">›</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-10 text-center opacity-20 pb-10">
                <p className="text-[10px] font-black tracking-[0.5em] uppercase">CALIFORNIA HD I/M PROTOCOL V12.26.25</p>
            </div>
        </main>

        {/* FLOATING BOTTOM NAVIGATION */}
        <nav className="fixed bottom-8 left-6 right-6 h-20 glass-dark rounded-[2.5rem] border border-white/10 flex justify-around items-center px-4 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            {[
                { id: AppView.HOME, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "STATUS" },
                { id: AppView.ASSISTANT, icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", label: "INTEL" },
                { id: AppView.GARAGE, icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", label: "FLEET" },
                { id: AppView.ANALYZE, icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", label: "TOOLS" },
                { id: AppView.PROFILE, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "COMMAND" }
            ].map(btn => (
                <button 
                    key={btn.id}
                    onClick={() => setCurrentView(btn.id as AppView)}
                    className="flex flex-col items-center justify-center p-2 relative group active-haptic"
                >
                    <div className={`transition-all duration-300 ${currentView === btn.id ? 'scale-110 text-carb-accent' : 'text-gray-500 scale-90'}`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={currentView === btn.id ? 2 : 1.5}><path strokeLinecap="round" strokeLinejoin="round" d={btn.icon} /></svg>
                    </div>
                    {currentView === btn.id && (
                        <div className="absolute -bottom-2 w-1.5 h-1.5 bg-carb-accent rounded-full shadow-[0_0_12px_#3b82f6]"></div>
                    )}
                </button>
            ))}
        </nav>

        {/* MODALS */}
        {showInstall && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowInstall(false)}>
                <div className="glass-dark p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                    <div className="text-center space-y-8">
                        <div className="text-6xl grayscale">📲</div>
                        <h2 className="text-3xl font-black tracking-tight">Technical Install</h2>
                        <p className="text-sm text-gray-400 font-medium px-4 leading-relaxed italic">Add to Home Screen for local diagnostics and offline compliance access.</p>
                        <button onClick={() => setShowInstall(false)} className="w-full py-5 bg-white text-carb-navy rounded-3xl font-black uppercase tracking-widest text-xs active-haptic transition-all">
                            INITIALIZE
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showPrivacy && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowPrivacy(false)}>
                <div className="glass-dark p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                    <div className="text-center space-y-6">
                        <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">Agency Disclosure</h2>
                        <p className="text-xs text-gray-500 leading-relaxed text-left font-medium">
                            NorCal CARB Mobile LLC is a specialized third-party agency. This tool is a technical interface for public records and regulatory compliance management. We are not a government entity.
                        </p>
                        <button onClick={() => setShowPrivacy(false)} className="w-full py-4 glass text-white rounded-2xl font-bold uppercase tracking-widest text-xs active-haptic">DISMISS</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;