
import React from 'react';
import { Order, Product } from '../types';

interface InvoiceModalProps {
  order: Order;
  products: Product[];
  logoUrl?: string | null;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, products, logoUrl, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-[800px] h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl print:h-auto print:rounded-none print:shadow-none">
        {/* Modal Controls (Hidden on Print) */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 flex justify-between items-center border-b print:hidden">
          <button onClick={onClose} className="px-6 py-2 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Close</button>
          <button onClick={handlePrint} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-200">🖨️ Print Invoice</button>
        </div>

        {/* Invoice Structure (From your PHP template) */}
        <div className="p-10 text-slate-900" id="print-area">
          <div className="flex justify-between items-start mb-10">
            <div className="w-32">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full object-contain" />
              ) : (
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">BB</div>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Invoice</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operational Unit Copy</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mb-10 border-y border-slate-100 py-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Invoice To:</p>
              <h4 className="font-black text-lg">{order.customerName}</h4>
              <p className="text-sm font-bold text-slate-600">{order.customerPhone}</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{order.customerAddress}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Order Meta:</p>
              <p className="text-sm font-black text-slate-700">Invoice No: <span className="text-indigo-600">#{order.id}</span></p>
              <p className="text-sm font-black text-slate-700">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
              <p className="text-sm font-black text-slate-700">Region: <span className="capitalize">{order.deliveryRegion}</span></p>
            </div>
          </div>

          {/* Steadfast Consignment Simulation */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-8 mb-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <img src="https://portal.steadfast.com.bd/assets/img/logo.png" alt="Steadfast" className="w-20" />
             </div>
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Courier Partner</h5>
                  <p className="font-black text-xl italic">Steadfast Courier LTD</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase">CN ID</p>
                   <p className="font-mono font-black text-lg">#{order.steadfastId || 'PENDING'}</p>
                </div>
             </div>
             <div className="border-t border-slate-200 pt-6 flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase">Success Score</p>
                   <p className="font-black text-emerald-600">{order.successRate || 'N/A'}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase italic">Cash on Delivery</p>
                   <p className="text-4xl font-black tracking-tighter">৳{order.grandTotal}</p>
                </div>
             </div>
          </div>

          <table className="w-full mb-10">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-4 text-left text-[9px] font-black uppercase rounded-tl-xl">Item Asset</th>
                <th className="p-4 text-center text-[9px] font-black uppercase">Qty</th>
                <th className="p-4 text-center text-[9px] font-black uppercase">Price</th>
                <th className="p-4 text-right text-[9px] font-black uppercase rounded-tr-xl">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y border-x">
              {order.items.map((item, idx) => {
                const p = products.find(prod => prod.id === item.productId);
                return (
                  <tr key={idx}>
                    <td className="p-4">
                      <p className="text-sm font-black">{p?.name || 'Unknown'}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">SKU: {p?.sku}</p>
                    </td>
                    <td className="p-4 text-center font-bold text-sm">{item.quantity}</td>
                    <td className="p-4 text-center font-bold text-sm">৳{item.price}</td>
                    <td className="p-4 text-right font-black text-sm">৳{item.quantity * item.price}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase">
                <span>Subtotal</span>
                <span>৳{order.totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase">
                <span>Shipping</span>
                <span>৳{order.deliveryCharge}</span>
              </div>
              {order.advanceAmount > 0 && (
                <div className="flex justify-between text-sm font-black text-emerald-600 uppercase">
                  <span>Advance</span>
                  <span>-৳{order.advanceAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                <span className="text-xs font-black uppercase">Grand Total</span>
                <span className="text-3xl font-black italic">৳{order.grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Thank you for your business</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
