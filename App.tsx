
import React, { useState, useEffect } from 'react';
import { User, Order, OrderStatus, CourierConfig, Product, Lead, UserRole, LeadStatus, Message } from './types';
import { INITIAL_PRODUCTS, ADMIN_USER } from './constants';
import { supabase } from './services/supabase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Login from './components/Login';
import ModeratorManager from './components/ModeratorManager';
import Settings from './components/Settings';
import ProductManager from './components/ProductManager';
import LeadManager from './components/LeadManager';
import ModeratorLeads from './components/ModeratorLeads';
import CustomerManager from './components/CustomerManager';
import Messenger from './components/Messenger';

const SESSION_KEY = 'baburchi_user_session';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [moderators, setModerators] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courierConfig, setCourierConfig] = useState<CourierConfig>({
    apiKey: '',
    secretKey: '',
    baseUrl: 'https://portal.steadfast.com.bd/api/v1',
    webhookUrl: '',
    accountEmail: '',
    accountPassword: ''
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  const fetchModerators = async () => {
    const { data, error } = await supabase.from('moderators').select('*');
    if (!error && data) {
      setModerators(data.map(m => ({
        id: String(m.id),
        name: m.name,
        email: m.email,
        role: m.role as UserRole,
        is_active: m.is_active !== false 
      })));
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedUser = localStorage.getItem(SESSION_KEY);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setCurrentUser({ ...parsed, id: String(parsed.id) });
        }

        const [
          { data: dbProducts },
          { data: dbOrders },
          { data: dbLeads },
          { data: dbSettings }
        ] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('leads').select('*').order('created_at', { ascending: false }),
          supabase.from('settings').select('*').maybeSingle()
        ]);

        await fetchModerators();
        if (dbProducts) setProducts(dbProducts);
        if (dbOrders) {
          setOrders(dbOrders.map((o: any) => ({
            id: String(o.id),
            moderatorId: String(o.moderator_id),
            customerName: o.customer_name,
            customerPhone: o.customer_phone,
            customerAddress: o.customer_address,
            deliveryRegion: o.delivery_region,
            deliveryCharge: Number(o.delivery_charge),
            items: o.items,
            totalAmount: Number(o.total_amount),
            advanceAmount: Number(o.advance_amount || 0),
            grandTotal: Number(o.grand_total),
            status: o.status as OrderStatus,
            createdAt: o.created_at,
            steadfastId: o.steadfast_id,
            courierStatus: o.courier_status,
            notes: o.notes
          })));
        }
        if (dbLeads) {
          setLeads(dbLeads.map((l: any) => ({
            id: String(l.id),
            phoneNumber: l.phone_number,
            customerName: l.customer_name,
            address: l.address,
            moderatorId: String(l.moderator_id),
            status: l.status,
            assignedDate: l.assigned_date,
            createdAt: l.created_at
          })));
        }
        if (dbSettings) {
          setCourierConfig(dbSettings.courier_config || courierConfig);
          setLogoUrl(dbSettings.logo_url);
        }
      } catch (error) {
        console.error("Critical Init Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleCreateOrder = async (newOrder: Order) => {
    try {
      const dbPayload = {
        id: String(newOrder.id),
        moderator_id: String(newOrder.moderatorId),
        customer_name: String(newOrder.customerName),
        customer_phone: String(newOrder.customerPhone),
        customer_address: String(newOrder.customerAddress),
        delivery_region: String(newOrder.deliveryRegion),
        delivery_charge: Number(newOrder.deliveryCharge),
        items: JSON.parse(JSON.stringify(newOrder.items)),
        total_amount: Number(newOrder.totalAmount),
        advance_amount: Number(newOrder.advanceAmount),
        grand_total: Number(newOrder.grandTotal),
        status: String(newOrder.status),
        created_at: String(newOrder.createdAt),
        notes: String(newOrder.notes || '')
      };

      const { error } = await supabase.from('orders').insert([dbPayload]);
      if (error) throw new Error(error.message);

      setOrders(prev => [newOrder, ...prev]);
      setActiveTab('orders'); 
    } catch (err: any) {
      alert("❌ অর্ডার সেভ করতে সমস্যা হয়েছে: " + err.message);
    }
  };

  const handleAssignLeads = async (newLeads: Lead[]) => {
    const dbLeads = newLeads.map(l => ({
      id: l.id,
      phone_number: l.phoneNumber,
      customer_name: l.customerName || '',
      address: l.address || '',
      moderator_id: String(l.moderatorId),
      status: l.status,
      assigned_date: l.assignedDate,
      created_at: l.createdAt
    }));
    const { error } = await supabase.from('leads').insert(dbLeads);
    if (error) throw error;
    setLeads(prev => [...prev, ...newLeads]);
  };

  const handleBulkUpdateLeads = async (leadIds: string[], modId: string, date: string) => {
    const { error } = await supabase.from('leads').update({
      moderator_id: String(modId),
      assigned_date: date,
      status: 'pending'
    }).in('id', leadIds);
    
    if (!error) {
      setLeads(prev => prev.map(l => leadIds.includes(l.id) ? { ...l, moderatorId: String(modId), assignedDate: date, status: 'pending' } : l));
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (!error) setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus) => {
    const { error } = await supabase.from('leads').update({ status }).eq('id', leadId);
    if (!error) setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setActiveTab(user.role === UserRole.MODERATOR ? 'myleads' : 'dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setActiveTab('dashboard');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest">Baburchi Intelligence Loading...</div>;
  if (!currentUser) return <Login onLogin={handleLogin} moderators={moderators} logoUrl={logoUrl} />;

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} logoUrl={logoUrl}>
      {activeTab === 'dashboard' && currentUser.role === UserRole.ADMIN && <Dashboard orders={orders} products={products} leads={leads} currentUser={currentUser} moderators={moderators} />}
      {activeTab === 'create' && <OrderForm products={products} currentUser={currentUser} onOrderCreate={handleCreateOrder} leads={leads} allOrders={orders} />}
      {activeTab === 'orders' && <OrderList orders={orders} currentUser={currentUser} products={products} moderators={moderators} courierConfig={courierConfig} onUpdateStatus={() => {}} onBulkUpdateStatus={() => {}} />}
      {activeTab === 'leads' && currentUser.role === UserRole.ADMIN && <LeadManager moderators={moderators} leads={leads} orders={orders} onAssignLeads={handleAssignLeads} onBulkUpdateLeads={handleBulkUpdateLeads} onDeleteLead={handleDeleteLead} />}
      {activeTab === 'myleads' && currentUser.role === UserRole.MODERATOR && <ModeratorLeads leads={leads.filter(l => String(l.moderatorId) === String(currentUser.id))} onUpdateStatus={handleUpdateLeadStatus} allOrders={orders} />}
      {activeTab === 'customers' && currentUser.role === UserRole.ADMIN && <CustomerManager orders={orders} leads={leads} />}
      {activeTab === 'messages' && <Messenger currentUser={currentUser} moderators={moderators} />}
      {activeTab === 'moderators' && currentUser.role === UserRole.ADMIN && <ModeratorManager moderators={moderators} leads={leads} orders={orders} onAddModerator={async () => true} onDeleteModerator={async () => {}} onToggleStatus={async () => {}} />}
      {activeTab === 'products' && currentUser.role === UserRole.ADMIN && <ProductManager products={products} onAddProduct={() => {}} onUpdateProduct={() => {}} onDeleteProduct={() => {}} />}
      {activeTab === 'settings' && currentUser.role === UserRole.ADMIN && <Settings config={courierConfig} onSave={() => {}} onUpdateLogo={() => {}} />}
    </Layout>
  );
};

export default App;
