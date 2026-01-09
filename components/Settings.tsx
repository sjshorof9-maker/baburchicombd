
import React, { useState } from 'react';
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
    baseUrl: config.baseUrl || 'https://portal.steadfast.com.bd/api/v1',
    webhookUrl: config.webhookUrl || '',
    accountEmail: config.accountEmail || '',
    accountPassword: config.accountPassword || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      onSave(formData);
      setIsSaving(false);
      alert('Baburchi configuration updated successfully!');
    }, 600);
  };

  const handleTestConnection = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const result = await testSteadfastConnection(formData);
      setTestResult(result);
      if (result.message) alert(result.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="bg-orange-600 text-white p-3 rounded-2xl shadow-lg shadow-orange-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Settings</h2>
          <p className="text-sm text-slate-500 font-medium">Customize Baburchi brand identity and integrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Brand Identity Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
           <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
             <span className="text-xl">🎨</span>
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Brand Identity</h3>
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-8">
             <div className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center relative group overflow-hidden">
               {logoUrl ? (
                 <img src={logoUrl} alt="Preview" className="w-full h-full object-contain p-4" />
               ) : (
                 <div className="text-center p-4">
                    <span className="text-3xl block mb-2">👨‍🍳</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">No Logo Uploaded</span>
                 </div>
               )}
               <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[10px] font-black uppercase tracking-widest">
                 Upload New
                 <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
               </label>
             </div>
             
             <div className="flex-1 space-y-4">
               <h4 className="font-black text-slate-800">Business Logo</h4>
               <p className="text-sm text-slate-500 font-medium leading-relaxed">
                 Upload your company logo. This will be used across the Baburchi portal and customer invoices.
               </p>
               {logoUrl && (
                 <button 
                  onClick={() => onUpdateLogo(null)}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors"
                 >
                   🗑️ Remove Logo
                 </button>
               )}
             </div>
           </div>
        </div>

        {/* Courier Config Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-[#0e1628] p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl p-2 flex items-center justify-center shadow-2xl">
                  <img src="https://portal.steadfast.com.bd/assets/img/logo.png" alt="Steadfast" className="w-full object-contain" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Steadfast Courier</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Logistics Active</span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleTestConnection}
                disabled={isSaving}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-3 px-6 rounded-xl backdrop-blur-md transition-all border border-white/10 flex items-center gap-2 active:scale-95"
              >
                {isSaving ? 'Checking...' : '⚡ Test Connection'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Portal Account Email</label>
                  <input
                    type="email"
                    value={formData.accountEmail}
                    onChange={(e) => setFormData({...formData, accountEmail: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-semibold text-slate-700"
                    placeholder="name@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Portal Password</label>
                  <input
                    type="password"
                    value={formData.accountPassword}
                    onChange={(e) => setFormData({...formData, accountPassword: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-semibold text-slate-700"
                    placeholder="••••••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">API Access Key</label>
                  <input
                    type="text"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-mono font-bold text-orange-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Secret Access Key</label>
                  <input
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({...formData, secretKey: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-mono font-bold"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-1">Webhook URL</label>
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({...formData, webhookUrl: e.target.value})}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-mono text-slate-500"
                    placeholder="https://your-domain.com/api/webhooks/steadfast"
                  />
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full md:w-auto bg-slate-950 hover:bg-black disabled:bg-slate-300 text-white font-black py-4 px-12 rounded-2xl transition-all shadow-xl active:scale-95 text-sm uppercase tracking-widest"
              >
                {isSaving ? 'Saving...' : 'Update Baburchi Config'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
