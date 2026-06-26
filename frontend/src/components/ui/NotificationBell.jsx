import { useState, useEffect, useRef } from 'react';
import { Bell, Package, Users, ShoppingCart, X } from 'lucide-react';
import { productsApi, customersApi, purchaseOrdersApi } from '../../services/api.js';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [alerts, setAlerts] = useState({ lowStock: [], debtors: [], pendingOC: [] });
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [lowStock, customers, ocs] = await Promise.all([
          productsApi.lowStock(),
          customersApi.list(),
          purchaseOrdersApi.list({ status: 'pending' }),
        ]);
        setAlerts({
          lowStock,
          debtors: customers.filter(c => parseFloat(c.balance) > 0),
          pendingOC: ocs,
        });
      } catch {}
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const total = alerts.lowStock.length + alerts.debtors.length + alerts.pendingOC.length;

  const go = (path) => { navigate(path); setOpen(false); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificaciones"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold text-gray-900 text-sm">Notificaciones</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>

          {total === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              Todo al día
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {alerts.lowStock.length > 0 && (
                <button onClick={() => go('/stock')} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-amber-50 text-left transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {alerts.lowStock.length} producto{alerts.lowStock.length !== 1 ? 's' : ''} con stock bajo
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {alerts.lowStock.slice(0, 3).map(p => p.name).join(', ')}
                      {alerts.lowStock.length > 3 ? '...' : ''}
                    </p>
                  </div>
                </button>
              )}

              {alerts.debtors.length > 0 && (
                <button onClick={() => go('/receivables')} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-red-50 text-left transition-colors">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users size={14} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {alerts.debtors.length} cliente{alerts.debtors.length !== 1 ? 's' : ''} con saldo pendiente
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Total: ${alerts.debtors.reduce((s, c) => s + parseFloat(c.balance), 0).toLocaleString('es-AR')}
                    </p>
                  </div>
                </button>
              )}

              {alerts.pendingOC.length > 0 && (
                <button onClick={() => go('/purchase-orders')} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShoppingCart size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {alerts.pendingOC.length} orden{alerts.pendingOC.length !== 1 ? 'es' : ''} de compra pendiente{alerts.pendingOC.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Pendientes de recibir</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
