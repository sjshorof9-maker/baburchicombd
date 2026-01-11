
import React, { useState, useEffect } from 'react';
import { CourierConfig } from '../types';
import { testSteadfastConnection } from '../services/courierService';

interface SettingsProps {
  config: CourierConfig;
  onSave: (config: CourierConfig) => void;
  logoUrl?: string | null;
  onUpdateLogo: (url: string | null) => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onSave, logoUrl, onUpdateLogo }) => {
  const [formData, setFormData] = useState<CourierConfig>({
    apiKey: config.apiKey || '',
    secretKey: config.secretKey || '',
    baseUrl: 'https://portal.packzy.com/api/v1',
    webhookUrl: config.webhookUrl || '',
    webhookToken: config.webhookToken || '',
    accountEmail: config.accountEmail || ''
  });

  const [liveBalance, setLiveBalance] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config.apiKey && config.secretKey) {
      testSteadfastConnection(config).then(res => {
        if (res.success) setLiveBalance(res.balance);
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    onSave(formData);
    setTimeout(() => setIsSaving(false), 800);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-40 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Settings</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Courier & Security Protocols</p>
        </div>
        {liveBalance && (
          <div className="bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4">
             <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
             <div>
                <p className="text-[8px] font-black uppercase opacity-70 tracking-widest">Available Balance</p>
                <p className="text-2xl font-black italic">৳{liveBalance}</p>
             </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* API Keys */}
          <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
              <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shadow-lg italic">API</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Steadfast Credentials</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                  <input type="text" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-indigo-600 outline-none" placeholder="Paste API Key" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Key</label>
                  <input type="password" value={formData.secretKey} onChange={e => setFormData({...formData, secretKey: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" placeholder="••••••••" />
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 flex flex-col items-center">
             <div className="w-32 h-32 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center relative group overflow-hidden mb-4">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-4" /> : <span className="text-3xl opacity-20">🖼️</span>}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-white text-[8px] font-black uppercase tracking-widest transition-all">
                   Upload Logo
                   <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                     const f = e.target.files?.[0];
                     if(f) {
                       const r = new FileReader();
                       r.onloadend = () => onUpdateLogo(r.result as string);
                       r.readAsDataURL(f);
                     }
                   }} />
                </label>
             </div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Brand Identity</p>
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50">
             {isSaving ? 'Deploying...' : '🚀 Save Global Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
