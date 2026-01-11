
import React from 'react';
import { User, UserRole } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logoUrl?: string | null;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab, logoUrl }) => {
  // Fix: UserRole does not have ADMIN, using SUPER_ADMIN based on types.ts
  const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OWNER;

  const navItems = isAdmin 
    ? [
        { id: 'dashboard', name: 'Home', icon: '📊', mobile: true },
        { id: 'orders', name: 'Orders', icon: '📦', mobile: true },
        { id: 'messages', name: 'Messages', icon: '💬', mobile: true, highlight: true },
        { id: 'create', name: 'New', icon: '➕', mobile: true },
        { id: 'leads', name: 'Leads', icon: '📞', mobile: true },
        { id: 'customers', name: 'Clients', icon: '👤', mobile: true },
        { id: 'products', name: 'Stock', icon: '🛒', mobile: false },
        { id: 'moderators', name: 'Team', icon: '👥', mobile: false },
        { id: 'settings', name: 'Settings', icon: '⚙️', mobile: true }
      ]
    : [
        { id: 'myleads', name: 'Calls', icon: '📞', mobile: true },
        { id: 'orders', name: 'Orders', icon: '📦', mobile: true },
        { id: 'messages', name: 'Messages', icon: '💬', mobile: true, highlight: true },
        { id: 'create', name: 'New', icon: '➕', mobile: true }
      ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-50 bg-slate-950 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
           {logoUrl ? (
             <img src={logoUrl} alt="Baburchi" className="h-8 w-8 object-contain rounded-lg bg-white p-1" />
           ) : (
             <div className="bg-orange-600 p-1.5 rounded-lg">
               <span className="text-xs font-black">BB</span>
             </div>
           )}
           <span className="font-black tracking-tighter text-sm uppercase">Baburchi</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-black border-2 border-white/20">
            {user.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex w-64 bg-slate-950 text-white flex-shrink-0 flex-col border-r border-slate-900 shadow-xl overflow-y-auto h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Baburchi" className="h-10 w-10 object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
                <span className="text-xl font-black">BB</span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-black tracking-tighter leading-none">Baburchi</h1>
              <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Enterprise</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 px-4 space-y-1 flex-1">
          {navItems.map((item: any) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all relative ${
                activeTab === item.id
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20 translate-x-1'
                  : 'text-slate-500 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className="text-lg relative">
                {item.icon}
                {item.highlight && activeTab !== 'messages' && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                )}
              </span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-900 bg-black/20 mt-auto">
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-900 rounded-xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 flex justify-around items-center z-50 pb-safe shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
        {navItems.filter(item => item.mobile).map((item: any) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 transition-all px-3 py-1 rounded-xl relative ${
              activeTab === item.id 
              ? 'text-orange-600' 
              : 'text-slate-400'
            }`}
          >
            <span className={`text-xl transition-transform relative ${activeTab === item.id ? 'scale-125' : ''}`}>
              {item.icon}
              {item.highlight && activeTab !== 'messages' && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              )}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
              {item.name}
            </span>
            {activeTab === item.id && (
              <div className="w-1 h-1 bg-orange-600 rounded-full mt-0.5"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
