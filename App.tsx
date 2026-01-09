import React, { useState, useEffect, Suspense } from 'react';
import VinChecker from './components/VinChecker';
import ComplianceGuide from './components/ComplianceGuide';
import ClientIntake from './components/ClientIntake';
import LandingView from './components/LandingView';
import { AppView, User, HistoryItem } from './types';
import { initGA, trackPageView, trackEvent } from './services/analytics';
import { auth, getHistoryFromCloud, onAuthStateChanged } from './services/firebase'; 
import { triggerHaptic } from './services/haptics';

const ChatAssistant = React.lazy(() => import('./components/ChatAssistant'));
const MediaTools = React.lazy(() => import('./components/MediaTools'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const GarageView = React.lazy(() => import('./components/GarageView'));
const AdminView = React.lazy(() => import('./components/AdminView'));
const InvoiceApp = React.lazy(() => import('./components/InvoiceApp'));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING); 
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    initGA();
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'intake') setCurrentView(AppView.INTAKE);
    if (params.get('mode') === 'invoice') setCurrentView(AppView.INVOICE);
    if (params.get('mode') === 'admin') setCurrentView(AppView.ADMIN);

    onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
            const cloudHistory = await getHistoryFromCloud(firebaseUser.uid);
            setUser({ email: firebaseUser.email || 'Operator', history: cloudHistory as HistoryItem[] });
            if (currentView === AppView.LANDING) setCurrentView(AppView.HOME);
        } else { 
            setUser(null); 
        }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { trackPageView(currentView); }, [currentView]);

  if (currentView === AppView.LANDING) {
    return (
      <LandingView 
        onLaunch={() => setCurrentView(AppView.HOME)} 
        onNavigateTools={() => setCurrentView(AppView.ANALYZE)} 
        onNavigateIntake={() => setCurrentView(AppView.INTAKE)}
        onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
        onNavigateAdmin={() => setCurrentView(AppView.ADMIN)}
      />
    );
  }

  const navItems = [
    { id: AppView.HOME, label: 'HUB' },
    { id: AppView.ADMIN, label: 'OPS' },
    { id: AppView.ASSISTANT, label: 'AI' },
    { id: AppView.GARAGE, label: 'FLEET' },
  ];

  const MetallicStyle = "bg-gradient-to-b from-[#f3f4f6] via-[#d1d5db] to-[#9ca3af] shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-white/20 relative overflow-hidden transition-all";
  const BrushedTexture = <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-10 pointer-events-none"></div>;

  const GlobalHeader = () => (
    <header className="pt-safe px-6 py-4 fixed top-0 left-0 right-0 glass-dark z-[100] border-b border-white/5" role="banner">
      <div className="flex justify-between items-center w-full max-w-md mx-auto">
        <button 
          onClick={() => setCurrentView(AppView.LANDING)}
          className="group relative flex items-center justify-center h-10 px-4 rounded-xl metallic-silver transition-all active:scale-95 border-white/40 shadow-md"
          aria-label="Exit to landing page"
        >
          <div className="brushed-texture opacity-30"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#020617] italic relative z-10 leading-none">
            HOME
          </span>
        </button>
        
        <nav className="flex items-center gap-2" aria-label="Main navigation">
            {navItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => { triggerHaptic('light'); setCurrentView(item.id); }} 
                className={`h-10 px-3 flex items-center justify-center rounded-xl transition-all active-haptic ${currentView === item.id ? 'bg-carb-accent text-white scale-105' : 'opacity-60'} ${MetallicStyle}`}
                aria-current={currentView === item.id ? 'page' : undefined}
              >
                {BrushedTexture}
                <span className={`text-[10px] font-black tracking-widest uppercase relative z-10 ${currentView === item.id ? 'text-white' : 'text-[#020617]'}`}>{item.label}</span>
              </button>
            ))}
        </nav>
      </div>
    </header>
  );

  return (
    <div className="dark min-h-screen bg-carb-navy text-white overflow-x-hidden selection:bg-carb-accent">
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-[10px] font-black uppercase text-center py-1 z-[200] tracking-widest" role="alert">
            Offline Mode
          </div>
        )}

        <GlobalHeader />

        <main className={`flex-1 overflow-y-auto pt-28 pb-32`} role="main">
            <div className="px-6">
                <Suspense fallback={<div className="flex justify-center py-20 animate-pulse text-gray-400 uppercase font-black text-[10px] tracking-widest" aria-live="polite">Initializing...</div>}>
                    {currentView === AppView.HOME && (
                        <div className="animate-in fade-in duration-700">
                          <VinChecker 
                              onAddToHistory={() => {}} 
                              onNavigateChat={() => setCurrentView(AppView.ASSISTANT)}
                              onShareApp={() => {}}
                              onNavigateTools={() => setCurrentView(AppView.ANALYZE)}
                          />
                          <ComplianceGuide />
                        </div>
                    )}
                    {currentView === AppView.INTAKE && <ClientIntake onComplete={() => setCurrentView(AppView.HOME)} />}
                    {currentView === AppView.INVOICE && <InvoiceApp onComplete={() => setCurrentView(AppView.HOME)} />}
                    {currentView === AppView.ASSISTANT && <ChatAssistant />}
                    {currentView === AppView.GARAGE && <GarageView user={user} onNavigateLogin={() => setCurrentView(AppView.PROFILE)} />}
                    {currentView === AppView.ANALYZE && <MediaTools />}
                    {currentView === AppView.PROFILE && <ProfileView user={user} onLogout={() => setUser(null)} onAdminAccess={() => setCurrentView(AppView.ADMIN)} />}
                    {currentView === AppView.ADMIN && <AdminView onNavigateInvoice={() => setCurrentView(AppView.INVOICE)} />}
                </Suspense>
            </div>
        </main>

        <button 
          onClick={() => { triggerHaptic('medium'); setCurrentView(AppView.LANDING); }}
          className="fixed bottom-safe left-1/2 -translate-x-1/2 mb-8 px-10 py-4 metallic-silver rounded-full text-[10px] font-black uppercase tracking-[0.4em] active-haptic z-[100] italic shadow-2xl border border-white/20"
          aria-label="Exit current view and return to home landing"
        >
          <div className="brushed-texture opacity-30"></div>
          <span className="relative z-10">EXIT TO HUB</span>
        </button>
    </div>
  );
};

export default App;