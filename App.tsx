import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView } from './services/analytics';
import { auth, getHistoryFromCloud, onAuthStateChanged } from './services/firebase'; 

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));

const APPLE_ICON = (
  <svg className="w-6 h-6" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const ANDROID_ICON = (
  <svg className="w-6 h-6" viewBox="0 0 576 512" fill="currentColor">
    <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24zm378.7-151.1l33.8-58.5a11 11 0 0 0-3.9-15.1 11.2 11.2 0 0 0-15.2 4L515 139.75c-50.7-42.3-116.3-65.6-187-65.6s-136.3 23.3-187 65.6l-33.8-58.5a11.2 11.2 0 0 0-15.2-4 11 11 0 0 0-3.9 15.1l33.8 58.5C51.5 197.6 0 285.5 0 384h576c0-98.5-51.5-186.4-121.85-233.17z" />
  </svg>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME); 
  const [user, setUser] = useState<User | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const shareUrl = window.location.origin;

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
        const shareData: ShareData = {
          title: 'Clean Truck Check Compliant 12/26/25',
          text: 'The definitive proactive tool for CA HD I/M compliance. Scans VINs instantly.',
          url: shareUrl
        };

        // Try to fetch the logo and share it as a file for a better preview
        try {
          const response = await fetch('/logo.svg');
          const blob = await response.blob();
          const file = new File([blob], 'logo.svg', { type: 'image/svg+xml' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        } catch (e) {
          console.log('File share prep failed, falling back to basic share');
        }

        await navigator.share(shareData);
      } catch (err) { 
        console.log('Share failed:', err); 
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
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

  const navItems = [
    { id: AppView.ANALYZE, label: 'TOOLS', icon: APPLE_ICON },
    { id: AppView.ADMIN, label: 'ADMIN', icon: ANDROID_ICON },
    { id: AppView.ASSISTANT, label: 'CHAT', icon: APPLE_ICON },
    { id: AppView.GARAGE, label: 'FLEET', icon: ANDROID_ICON },
  ];

  return (
    <div className="dark">
      <div className="min-h-screen flex flex-col bg-carb-navy text-white font-sans transition-colors duration-500">
        
        {/* COMPACT TOP NAVIGATION HEADER */}
        <header className="pt-safe px-4 py-3 fixed top-0 left-0 right-0 glass-dark z-[100] flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <div className="flex flex-col" onClick={() => setCurrentView(AppView.HOME)} role="button">
                    <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">CTC COMPLIANT</h1>
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.25em] -mt-1">V12.26.25</p>
                </div>
                <div className="flex gap-1.5">
                    <button 
                      onClick={triggerTesterSearch}
                      className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest active-haptic"
                    >
                      Find Tester
                    </button>
                    <button onClick={handleShare} className="w-8 h-8 rounded-full glass border border-white/10 flex items-center justify-center text-xs active-haptic">
                      {ANDROID_ICON}
                    </button>
                </div>
            </div>

            {/* QUICK HEADER NAV */}
            <div className="flex justify-between px-2">
                {navItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex flex-col items-center gap-1 transition-all ${currentView === item.id ? 'text-carb-accent' : 'text-gray-500'}`}
                  >
                    <div className="scale-75">{item.icon}</div>
                    <span className="text-[8px] font-black tracking-widest">{item.label}</span>
                  </button>
                ))}
            </div>
        </header>

        {/* MAIN DISPLAY AREA */}
        <main className="flex-1 overflow-y-auto pt-32 pb-12 scroll-smooth">
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
                    <div className="mt-8 grid grid-cols-2 gap-3">
                        <button onClick={triggerTesterSearch} className="glass p-6 rounded-[2rem] flex flex-col items-center gap-3 active-haptic group">
                           <div className="text-carb-accent">{APPLE_ICON}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white">Find Tester</span>
                        </button>
                        <button onClick={() => setCurrentView(AppView.ASSISTANT)} className="glass p-6 rounded-[2rem] flex flex-col items-center gap-3 active-haptic group">
                           <div className="text-carb-accent">{ANDROID_ICON}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Intel</span>
                        </button>
                        <button onClick={() => setShowInstall(true)} className="glass p-6 rounded-[2rem] flex flex-col items-center gap-3 active-haptic group">
                           <div className="text-carb-accent">{APPLE_ICON}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white">Download</span>
                        </button>
                        <button onClick={handleShare} className="glass p-6 rounded-[2rem] flex flex-col items-center gap-3 active-haptic group">
                           <div className="text-carb-accent">{ANDROID_ICON}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-white">Share App</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-10 text-center opacity-10 pb-4">
                <p className="text-[8px] font-black tracking-[0.5em] uppercase italic">CALIFORNIA HD I/M PROTOCOL V12.26.25</p>
            </div>
        </main>

        {/* MODALS */}
        {showInstall && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowInstall(false)}>
                <div className="glass-dark p-10 rounded-[3rem] max-w-sm w-full border border-white/10 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                    <div className="text-center space-y-8">
                        <div className="text-white flex justify-center gap-4">
                          <div className="scale-150">{APPLE_ICON}</div>
                          <div className="scale-150">{ANDROID_ICON}</div>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Technical Install</h2>
                        <p className="text-xs text-gray-400 font-medium px-4 leading-relaxed italic">Add to Home Screen for local diagnostics and offline compliance access.</p>
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