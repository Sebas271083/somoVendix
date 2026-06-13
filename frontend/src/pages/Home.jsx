import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, AlertTriangle, BarChart2, DollarSign, TrendingUp, CreditCard, Receipt } from 'lucide-react';
import { reportsApi, productsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

export default function Home() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [salesChart, setSalesChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboard, ls] = await Promise.all([
          reportsApi.dashboard(),
          productsApi.lowStock(),
        ]);
        setStats(dashboard);
        setLowStock(ls);

        if (isAdmin) {
          const today = new Date().toISOString().split('T')[0];
          const from = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
          const chart = await reportsApi.salesByPeriod({ from, to: today });
          setSalesChart(chart.map(d => ({
            date: new Date(d.date).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' }),
            total: parseFloat(d.total),
            count: d.count,
          })));
        }
      } catch { /* fail silently */ }
      finally { setLoading(false); }
    };
    load();
  }, [isAdmin]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.name?.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={15} className="text-blue-500" />
              <p className="text-xs text-gray-500">Ventas hoy</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.today.sales_count}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-green-500" />
              <p className="text-xs text-gray-500">Total hoy</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{fmt(stats.today.sales_total)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={15} className="text-indigo-500" />
              <p className="text-xs text-gray-500">Ticket promedio</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{fmt(stats.today.avg_ticket)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${lowStock.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={15} className={lowStock.length > 0 ? 'text-amber-500' : 'text-gray-400'} />
              <p className="text-xs text-gray-500">Stock bajo</p>
            </div>
            <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {lowStock.length}
            </p>
          </div>
        </div>
      )}

      {/* Admin: month stats + chart */}
      {isAdmin && stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Ventas del mes</p>
            <p className="text-xl font-bold text-gray-900">{stats.month.sales_count}</p>
            <p className="text-sm font-medium text-blue-600">{fmt(stats.month.sales_total)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Cuentas por cobrar</p>
            <p className="text-xl font-bold text-red-600">{fmt(stats.receivables_total)}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Gastos pagados este mes</p>
            <p className="text-xl font-bold text-orange-600">{fmt(stats.expenses_month)}</p>
          </div>
        </div>
      )}

      {/* Chart last 7 days */}
      {isAdmin && salesChart.length > 0 && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Ventas últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link to="/pos" className="bg-white border p-4 rounded-xl hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ShoppingCart size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-sm text-gray-800">Nueva venta</p>
        </Link>
        <Link to="/receivables" className="bg-white border p-4 rounded-xl hover:shadow-md hover:border-red-200 transition-all flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <CreditCard size={20} className="text-red-600" />
          </div>
          <p className="font-medium text-sm text-gray-800">Cuentas por cobrar</p>
        </Link>
        <Link to="/stock" className="bg-white border p-4 rounded-xl hover:shadow-md hover:border-amber-200 transition-all flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <p className="font-medium text-sm text-gray-800">Stock</p>
          {lowStock.length > 0 && (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">{lowStock.length} alertas</span>
          )}
        </Link>
        <Link to="/reports" className="bg-white border p-4 rounded-xl hover:shadow-md hover:border-green-200 transition-all flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-sm text-gray-800">Reportes</p>
        </Link>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Productos con stock bajo
          </h3>
          <div className="space-y-2">
            {lowStock.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800">{p.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
