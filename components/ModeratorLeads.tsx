
import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, Order } from '../types';

interface ModeratorLeadsProps {
  leads: Lead[];
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  allOrders?: Order[];
}

const ModeratorLeads: React.FC<ModeratorLeadsProps> = ({ leads, onUpdateStatus, allOrders = [] }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('today');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const handleCopy = (num: string, id: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCustomerHistory = (phone: string | undefined) => {
    if (!phone || !allOrders || allOrders.length === 0) return null;
    
    // Normalize lead phone
    const cleanLeadPhone = phone.replace(/[^\d]/g, '').slice(-11);
    
    const history = allOrders.filter(o => {
      if (!o.customerPhone) return false;
      const cleanOrderPhone = o.customerPhone.replace(/[^\d]/g, '').slice(-11);
      return cleanOrderPhone === cleanLeadPhone;
    });
    
    if (history.length === 0) return null;

    const sorted = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastOrder = sorted[0];
    
    return {
      count: history.length,
      lastDate: new Date(lastOrder.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }),
      isVip: history.length >= 3
    };
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'communication': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'no-response': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-200';
    }
  };

  const filteredLeads = useMemo(() => {
    if (dateFilter === 'today') return leads.filter(l => l.assignedDate === todayStr);
    if (dateFilter === 'tomorrow') return leads.filter(l => l.assignedDate === tomorrowStr);
    return leads;
  }, [leads, dateFilter, todayStr, tomorrowStr]);

  const stats = {
    pendingToday: leads.filter(l => l.assignedDate === todayStr && l.status === 'pending').length,
    tomorrow: leads.filter(l => l.assignedDate === tomorrowStr).length,
    total: leads.length
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic">Calling Queue</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Operational Unit Calling Protocol</p>
          </div>
        </div>
        
        <div className="flex bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl overflow-x-auto">
          {['today', 'tomorrow', 'all'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setDateFilter(tab as any)}
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${dateFilter === tab ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'today' ? `Today (${stats.pendingToday})` : tab === 'tomorrow' ? `Tomorrow (${stats.tomorrow})` : `Lifetime (${stats.total})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Call Target</p>
               <p className="text-4xl font-black mt-2">{stats.pendingToday}</p>
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales Today</p>
               <p className="text-3xl font-black text-slate-800">{leads.filter(l => l.assignedDate === todayStr && l.status === 'confirmed').length}</p>
            </div>
         </div>

         <div className="md:col-span-3">
           {filteredLeads.length === 0 ? (
             <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center opacity-30 italic">
               <p className="text-[11px] font-black uppercase tracking-[0.3em]">No Leads Assigned for this period</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {filteredLeads.map((lead) => {
                 const history = getCustomerHistory(lead.phoneNumber);
                 
                 return (
                   <div key={lead.id} className={`group relative bg-white p-8 rounded-[3rem] border-2 transition-all duration-500 hover:shadow-2xl ${history?.isVip ? 'border-orange-400 bg-orange-50/5' : 'border-slate-100'}`}>
                     <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-50">
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusBadge(lead.status)}`}>
                          {lead.status === 'pending' ? 'Waiting' : lead.status}
                        </span>
                        <p className="text-[9px] font-black text-slate-400 uppercase">{lead.assignedDate}</p>
                     </div>

                     <div className="flex items-center gap-6 mb-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-xl ${history ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {lead.customerName ? lead.customerName.charAt(0) : 'P'}
                        </div>
                        <div className="overflow-hidden">
                           <p className="text-xl font-black text-slate-900 font-mono tracking-tighter truncate">{lead.phoneNumber}</p>
                           <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest truncate">{lead.customerName || 'Potential Client'}</p>
                        </div>
                     </div>

                     <div className={`mb-6 p-5 rounded-[2rem] border flex items-center justify-between ${history ? 'bg-slate-900 text-white border-slate-800 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        <div>
                           <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">Intelligence</p>
                           <p className="text-[11px] font-black">
                             {history ? `${history.count} Times Purchased` : 'New Entry'}
                           </p>
                        </div>
                        {history && (
                          <div className="text-right">
                             <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Last Order</p>
                             <p className="text-[10px] font-black">{history.lastDate}</p>
                          </div>
                        )}
                     </div>

                     {/* Action Grid */}
                     <div className="grid grid-cols-2 gap-3 mb-3">
                        <a href={`tel:${lead.phoneNumber}`} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl shadow-lg active:scale-95 transition-all">
                          <span className="text-base">📞</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Call</span>
                        </a>
                        <button onClick={() => handleCopy(lead.phoneNumber, lead.id)} className={`flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all ${copiedId === lead.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-100'}`}>
                          <span className="text-base">{copiedId === lead.id ? '✓' : '📋'}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">{copiedId === lead.id ? 'Copied' : 'Copy'}</span>
                        </button>
                     </div>

                     <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={() => onUpdateStatus(lead.id, 'communication')}
                          className="flex flex-col items-center justify-center py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <span className="text-sm">💬</span>
                          <span className="text-[8px] font-black uppercase mt-1">Talking</span>
                        </button>
                        <button 
                          onClick={() => onUpdateStatus(lead.id, 'no-response')}
                          className="flex flex-col items-center justify-center py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                        >
                          <span className="text-sm">✖</span>
                          <span className="text-[8px] font-black uppercase mt-1">Reject</span>
                        </button>
                        <button 
                          onClick={() => onUpdateStatus(lead.id, 'confirmed')}
                          className="flex flex-col items-center justify-center py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          <span className="text-sm">✔</span>
                          <span className="text-[8px] font-black uppercase mt-1">Confirm</span>
                        </button>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
      </div>
    </div>
  );
};

export default ModeratorLeads;
