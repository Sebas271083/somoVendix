import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#f97316','#ec4899','#8b5cf6','#14b8a6'];

const PAYMENT_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  transferencia: 'Transferencia', cuenta_corriente: 'Cta. Cte.', mixto: 'Mixto',
};

function DateRangePicker({ from, to, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={from} onChange={e => onChange({ from: e.target.value, to })}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <span className="text-gray-400 text-sm">→</span>
      <input type="date" value={to} onChange={e => onChange({ from, to: e.target.value })}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [range, setRange] = useState({ from: monthStart, to: today });
  const [tab, setTab] = useState('sales');
  const [data, setData] = useState({
    salesByPeriod: [], paymentMethods: [], topProducts: [],
    topCustomers: [], salesBySeller: [], salesByCategory: [], inventoryValue: null,
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = range;
      const [period, methods, products, customers, sellers, categories, inventory] = await Promise.all([
        reportsApi.salesByPeriod(params),
        reportsApi.salesByPaymentMethod(params),
        reportsApi.topProducts(params),
        reportsApi.topCustomers(params),
        reportsApi.salesBySeller(params),
        reportsApi.salesByCategory(params),
        reportsApi.inventoryValue(),
      ]);
      setData({
        salesByPeriod: period.map(d => ({
          ...d,
          date: new Date(d.date).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' }),
          total: parseFloat(d.total),
        })),
        paymentMethods: methods.map(m => ({
          ...m, name: PAYMENT_LABELS[m.payment_method] || m.payment_method, total: parseFloat(m.total),
        })),
        topProducts: products,
        topCustomers: customers,
        salesBySeller: sellers,
        salesByCategory: categories,
        inventoryValue: inventory,
      });
    } catch { toast.error('Error al cargar reportes'); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { id: 'sales',     label: 'Ventas',    icon: TrendingUp },
    { id: 'products',  label: 'Productos', icon: Package },
    { id: 'customers', label: 'Clientes',  icon: Users },
    { id: 'inventory', label: 'Inventario',icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Análisis de ventas, productos y clientes</p>
        </div>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Cargando...</div>}

      {!loading && tab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Ventas por día</h2>
              <button onClick={() => exportCSV(data.salesByPeriod, 'ventas_por_dia.csv')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5">
                <Download size={13} /> CSV
              </button>
            </div>
            {data.salesByPeriod.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Sin ventas en el período</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.salesByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Por método de pago</h2>
              {data.paymentMethods.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.paymentMethods} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {data.paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Por vendedor</h2>
              {data.salesBySeller.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.salesBySeller.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900">{s.name}</span>
                          <span className="text-gray-500">{s.total_sales} ventas</span>
                        </div>
                        <p className="text-xs text-gray-400">{fmt(s.total_amount)} · Ticket prom: {fmt(s.avg_ticket)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'products' && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top 10 productos más vendidos</h2>
            <button onClick={() => exportCSV(data.topProducts, 'top_productos.csv')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5">
              <Download size={13} /> CSV
            </button>
          </div>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Sin ventas en el período</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.topProducts.slice(0,10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={160} />
                  <Tooltip />
                  <Bar dataKey="total_qty" name="Unidades" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-sm mt-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500">#</th>
                    <th className="text-left px-3 py-2 text-gray-500">Producto</th>
                    <th className="text-left px-3 py-2 text-gray-500">Categoría</th>
                    <th className="text-right px-3 py-2 text-gray-500">Unidades</th>
                    <th className="text-right px-3 py-2 text-gray-500">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2 text-gray-400">{i+1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                      <td className="px-3 py-2 text-gray-500">{p.category_name}</td>
                      <td className="px-3 py-2 text-right">{p.total_qty}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(p.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {!loading && tab === 'customers' && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top 10 mejores clientes</h2>
            <button onClick={() => exportCSV(data.topCustomers, 'top_clientes.csv')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5">
              <Download size={13} /> CSV
            </button>
          </div>
          {data.topCustomers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Sin datos en el período</p>
          ) : (
            <div className="space-y-3">
              {data.topCustomers.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i+1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone} · {c.total_sales} compras</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{fmt(c.total_spent)}</p>
                    <p className="text-xs text-gray-400">Ticket prom: {fmt(c.avg_ticket)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'inventory' && data.inventoryValue && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Productos activos', value: data.inventoryValue.total_products, isAmount: false, color: 'blue' },
              { label: 'Total unidades', value: data.inventoryValue.total_units, isAmount: false, color: 'indigo' },
              { label: 'Valor al costo', value: data.inventoryValue.inventory_cost, isAmount: true, color: 'orange' },
              { label: 'Ganancia potencial', value: data.inventoryValue.potential_profit, isAmount: true, color: 'green' },
            ].map(({ label, value, isAmount, color }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
                <p className={`text-xs font-medium text-${color}-600`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-700 mt-1`}>
                  {isAmount ? fmt(value) : value}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Valor de inventario al precio de venta</h2>
            <p className="text-3xl font-bold text-gray-900">{fmt(data.inventoryValue.inventory_value)}</p>
            <p className="text-sm text-gray-400 mt-1">Margen bruto potencial: {fmt(data.inventoryValue.potential_profit)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
