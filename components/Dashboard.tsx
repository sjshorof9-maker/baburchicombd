
import React, { useMemo, useState, useEffect } from 'react';
import { Order, OrderStatus, User, UserRole, Product, Lead } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { STATUS_COLORS } from '../constants';
import { getSalesInsights } from '../services/geminiService';

interface DashboardProps {
  orders: Order[];
  products: Product[];
  leads: Lead[];
  currentUser: User;
  moderators?: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ orders, products, leads, currentUser, moderators = [] }) => {
  const [aiInsights, setAiInsights] = useState<string>('Initializing Intelligence...');
  
  useEffect(() => {
    const fetchInsights = async () => {
      if (orders.length > 0) {
        const insights = await getSalesInsights(orders);
        setAiInsights(insights);
      } else {
        setAiInsights("No order data available for analysis.");
      }
    };
    fetchInsights();
  }, [orders]);

  const getBSTDate = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 6));
  };

  const todayStr = getBSTDate().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const totalRev = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const todayOrders = orders.filter(o => o.createdAt.startsWith(todayStr));
    const todayRev = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const pendingLeadsCount = leads.filter(l => l.status === 'pending').length;
    const confirmedCount = orders.filter(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CONFIRMED).length;
    const globalConversion = orders.length > 0 ? Math.round((confirmedCount / orders.length) * 100) : 0;

    return { totalRev, todayRev, todayCount: todayOrders.length, pendingLeads: pendingLeadsCount, globalConversion };
  }, [orders, leads, todayStr]);

  const weeklyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      revenue: orders.filter(o => o.createdAt.startsWith(date)).reduce((sum, o) => sum + o.grandTotal, 0)
    }));
  }, [orders]);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Strategic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter italic">Command Center</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Unit Intelligence Protokol: Active</p>
          </div>
        </div>
        <div className="bg-slate-950 p-5 rounded-[2rem] shadow-2xl flex items-center gap-6 border border-white/10">
           <div className="text-right">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Time (BST)</p>
             <p className="text-xs font-black text-white">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
           </div>
           <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-xl">🛡️</div>
        </div>
      </div>

      {/* AI Insight Bar */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/30 border border-indigo-400 relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-3xl shrink-0">🤖</div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-1">AI Sales Intelligence</h4>
            <div className="text-sm font-medium prose prose-invert max-w-none">
              {aiInsights.split('\n').map((line, i) => <p key={i} className="m-0 leading-relaxed">{line}</p>)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Volume', val: `৳${metrics.totalRev.toLocaleString()}`, sub: 'Lifetime Network Sales', color: 'text-slate-900', icon: '💎' },
          { label: "Today's Intake", val: `৳${metrics.todayRev.toLocaleString()}`, sub: `${metrics.todayCount} Operations`, color: 'text-indigo-600', icon: '🚀' },
          { label: 'Lead Pipeline', val: `${metrics.pendingLeads} Leads`, sub: 'Queue depth awaiting calls', color: 'text-orange-500', icon: '📡' },
          { label: 'Success Score', val: `${metrics.globalConversion}%`, sub: 'Conversion Efficiency', color: 'text-emerald-600', icon: '⚡' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 group">
             <span className="text-3xl mb-4 block group-hover:rotate-12 transition-transform">{kpi.icon}</span>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
             <p className={`text-3xl font-black ${kpi.color} tracking-tighter`}>{kpi.val}</p>
             <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 italic">Operational Velocity</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Transaction flow (7 Days)</p>
          </div>
        </div>
        <div className="h-[300px] w-full">
           <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
