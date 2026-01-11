
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ADMIN_USER, ADMIN_USER_2 } from '../constants';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
  moderators: User[];
  logoUrl?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, moderators, logoUrl }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Check if it's Root Admin 1
      if (email.toLowerCase() === 'baburchiadmin01@gmail.com') {
        if (password === '09780978') {
          onLogin(ADMIN_USER);
          return;
        } else {
          setError('Incorrect admin password.');
          setIsLoading(false);
          return;
        }
      }

      // 2. Check if it's Root Admin 2
      if (email.toLowerCase() === 'obidurrahman2024@gmail.com') {
        if (password === '654321') {
          onLogin(ADMIN_USER_2);
          return;
        } else {
          setError('Incorrect admin password.');
          setIsLoading(false);
          return;
        }
      }

      // 3. Check in Supabase moderators table
      const { data: dbUser, error: dbError } = await supabase
        .from('moderators')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (dbError || !dbUser) {
        setError('Unauthorized access. User identity not found.');
      } else {
        // SECURITY CHECK: Verify if account is active
        if (dbUser.is_active === false) {
          setError('🚫 Access Denied: Your account has been deactivated. Please contact your Administrator.');
          setIsLoading(false);
          return;
        }

        // Verify the password
        if (dbUser.password === password) {
          onLogin({
            id: String(dbUser.id),
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role as UserRole
          });
        } else {
          setError('Incorrect password for moderator session.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure. Check your internet or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-orange-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-blue-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-950 p-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-3xl backdrop-blur-md mb-6 border border-white/10 shadow-xl p-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Baburchi" className="w-full h-full object-contain" />
              ) : (
                <span className="text-3xl font-black text-orange-500">BB</span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tighter">Baburchi</h1>
            <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cloud Portal Access</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-bold text-slate-700"
                  placeholder="Enter your registered email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Token</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-bold text-slate-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-xs text-rose-600 font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              {isLoading ? 'Verifying Identity...' : 'Authorize Session'}
            </button>
          </form>

          <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              © 2025 Baburchi Enterprise Security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
