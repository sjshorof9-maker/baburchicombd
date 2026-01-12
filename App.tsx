
import React, { useState, useEffect } from 'react';
import { User, Order, OrderStatus, CourierConfig, Product, Lead, UserRole, LeadStatus } from './types';
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
import { handleSteadfastWebhook } from './services/courierService';

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
    baseUrl: 'https://portal.packzy.com/api/v1',
    accountEmail: ''
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  const fetchModerators = async () => {
    const { data, error } = await supabase.from('moderators').select('*');
    if (!error && data) {
      setModerators(data.map(m => ({
        id: String(m.id),
        businessId: String(m.business_id || 'system'),
        name: m.name,
        email: m.email,
        role: m.role as UserRole,
        is_active: m.is_active !== false 
      })));
    }
  };

  const fetchOrders = async () => {
    const { data: dbOrders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && dbOrders) {
      setOrders(dbOrders.map((o: any) => ({
        id: String(o.id),
        businessId: String(o.business_id || 'system'),
        moderatorId: String(o.moderator_id),
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerAddress: o.customer_address,
        deliveryRegion: o.delivery_region,
        deliveryCharge: Number(o.delivery_charge),
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
        totalAmount: Number(o.total_amount),
        advanceAmount: Number(o.advance_amount || 0),
        grandTotal: Number(o.grand_total),
        status: o.status as OrderStatus,
        createdAt: o.created_at,
        steadfastId: o.steadfast_id,
        courierStatus: o.courier_status,
        notes: o.notes,
        successRate: o.success_rate || 'New'
      })));
    }
  };

  const fetchLeads = async () => {
    const { data: dbLeads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && dbLeads) {
      setLeads(dbLeads.map((l: any) => ({
        id: String(l.id),
        businessId: String(l.business_id || 'system'),
        phoneNumber: l.phone_number,
        customerName: l.customer_name,
        address: l.address,
        moderatorId: String(l.moderator_id),
        status: l.status,
        assignedDate: l.assigned_date,
        createdAt: l.created_at,
        successRate: l.success_rate
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

        const [{ data: dbProducts }, { data: dbSettings }] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('settings').select('*').maybeSingle()
        ]);

        await Promise.all([
          fetchModerators(),
          fetchOrders(),
          fetchLeads()
        ]);
        
        if (dbProducts) setProducts(dbProducts.map((p: any) => ({ ...p, id: String(p.id), businessId: String(p.business_id || 'system') })));
        
        if (dbSettings) {
          if (dbSettings.courier_config) setCourierConfig(dbSettings.courier_config);
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
        business_id: String(newOrder.businessId),
        moderator_id: String(newOrder.moderatorId),
        customer_name: String(newOrder.customerName),
        customer_phone: String(newOrder.customerPhone),
        customer_address: String(newOrder.customerAddress),
        delivery_region: String(newOrder.deliveryRegion),
        delivery_charge: Number(newOrder.deliveryCharge),
        items: JSON.stringify(newOrder.items), 
        total_amount: Number(newOrder.totalAmount),
        grand_total: Number(newOrder.grandTotal),
        status: String(newOrder.status),
        created_at: new Date(newOrder.createdAt).toISOString(),
        notes: String(newOrder.notes || ''),
        advance_amount: Number(newOrder.advanceAmount || 0),
        success_rate: String(newOrder.successRate || '0%')
      };

      const { error } = await supabase.from('orders').insert([dbPayload]);
      if (error) throw new Error(error.message);
      
      // Update local state and global orders
      await fetchOrders();
      setActiveTab('orders'); 
    } catch (err: any) {
      alert(`❌ অর্ডার সেভ হয়নি: ${err.message}`);
      throw err; 
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus, courierData?: { id: string, status: string }) => {
    try {
      const updatePayload: any = { status: newStatus };
      if (courierData) {
        updatePayload.steadfast_id = String(courierData.id);
        updatePayload.courier_status = String(courierData.status);
      }

      const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        status: newStatus, 
        steadfastId: courierData?.id || o.steadfastId,
        courierStatus: courierData?.status || o.courierStatus
      } : o));
    } catch (err: any) {
      alert("Status Update Error: " + err.message);
    }
  };

  const handleBulkUpdateOrderStatus = async (orderIds: string[], newStatus: OrderStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', orderIds);
      if (error) throw error;
      setOrders(prev => prev.map(o => orderIds.includes(o.id) ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      alert("Bulk Update Error: " + err.message);
    }
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

  const handleSaveSettings = async (config: CourierConfig) => {
    try {
      const { error } = await supabase.from('settings').upsert({
        id: 1,
        courier_config: config,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setCourierConfig(config);
      alert("Settings successfully saved to Cloud.");
    } catch (err: any) {
      alert("Settings Save Error: " + err.message);
    }
  };

  const handleUpdateLogo = async (url: string | null) => {
    try {
      const { error } = await supabase.from('settings').upsert({
        id: 1,
        logo_url: url,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setLogoUrl(url);
    } catch (err: any) {
      alert("Logo Update Error: " + err.message);
    }
  };

  // Improved Lead Handling
  const handleAssignLeads = async (newLeads: Lead[]) => {
    try {
      const dbLeads = newLeads.map(l => ({
        phone_number: l.phoneNumber,
        customer_name: l.customerName,
        address: l.address,
        moderator_id: l.moderatorId === '' ? null : l.moderatorId,
        status: l.status,
        assigned_date: l.assignedDate || null,
        created_at: l.createdAt
      }));
      
      const { error } = await supabase.from('leads').insert(dbLeads);
      if (error) throw error;
      await fetchLeads();
    } catch (err: any) {
      alert("Lead Assignment Error: " + err.message);
    }
  };

  const handleBulkUpdateLeads = async (leadIds: string[], modId: string, date: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          moderator_id: modId, 
          assigned_date: date, 
          status: 'pending' 
        })
        .in('id', leadIds);
      
      if (error) throw error;
      await fetchLeads();
    } catch (err: any) {
      alert("Bulk Update Error: " + err.message);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      await fetchLeads();
    } catch (err: any) {
      alert("Delete Error: " + err.message);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest">Baburchi Intelligence Loading...</div>;
  if (!currentUser) return <Login onLogin={handleLogin} moderators={moderators} logoUrl={logoUrl} />;

  const isAdmin = currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.OWNER;

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} logoUrl={logoUrl}>
      {activeTab === 'dashboard' && isAdmin && <Dashboard orders={orders} products={products} leads={leads} currentUser={currentUser} moderators={moderators} />}
      {activeTab === 'create' && <OrderForm products={products} currentUser={currentUser} onOrderCreate={handleCreateOrder} leads={leads} allOrders={orders} courierConfig={courierConfig} />}
      {activeTab === 'orders' && <OrderList orders={orders} currentUser={currentUser} products={products} moderators={moderators} courierConfig={courierConfig} onUpdateStatus={handleUpdateOrderStatus} onBulkUpdateStatus={handleBulkUpdateOrderStatus} />}
      {activeTab === 'leads' && isAdmin && (
        <LeadManager 
          moderators={moderators} 
          leads={leads} 
          orders={orders} 
          onAssignLeads={handleAssignLeads} 
          onBulkUpdateLeads={handleBulkUpdateLeads} 
          onDeleteLead={handleDeleteLead} 
        />
      )}
      {activeTab === 'myleads' && currentUser.role === UserRole.MODERATOR && (
        <ModeratorLeads 
          leads={leads.filter(l => String(l.moderatorId) === String(currentUser.id))} 
          onUpdateStatus={async (id, status) => {
            const { error } = await supabase.from('leads').update({ status }).eq('id', id);
            if (!error) await fetchLeads();
          }} 
          allOrders={orders} 
        />
      )}
      {activeTab === 'customers' && isAdmin && <CustomerManager orders={orders} leads={leads} />}
      {activeTab === 'messages' && <Messenger currentUser={currentUser} moderators={moderators} />}
      {activeTab === 'moderators' && isAdmin && (
        <ModeratorManager 
          moderators={moderators} 
          leads={leads} 
          orders={orders} 
          onAddModerator={async (m) => {
            const { data, error } = await supabase.from('moderators').insert([{
              name: m.name,
              email: m.email,
              password: m.password,
              role: m.role,
              is_active: true
            }]).select();
            if (error) { alert(error.message); return false; }
            await fetchModerators();
            return true;
          }} 
          onDeleteModerator={async (id) => {
            await supabase.from('moderators').delete().eq('id', id);
            await fetchModerators();
          }} 
          onToggleStatus={async (id, active) => {
            await supabase.from('moderators').update({ is_active: active }).eq('id', id);
            await fetchModerators();
          }} 
        />
      )}
      {activeTab === 'products' && isAdmin && <ProductManager products={products} currentUser={currentUser} onAddProduct={() => {}} onUpdateProduct={() => {}} onDeleteProduct={() => {}} />}
      {activeTab === 'settings' && isAdmin && <Settings config={courierConfig} onSave={handleSaveSettings} onUpdateLogo={handleUpdateLogo} logoUrl={logoUrl} />}
    </Layout>
  );
};

export default App;
