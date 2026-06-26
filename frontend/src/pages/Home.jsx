import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Package, AlertTriangle, BarChart2, TrendingUp,
  CreditCard, Archive, Clock, ShoppingBag, ArrowRight, Banknote,
} from 'lucide-react';
import { reportsApi, productsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;

const METHOD_LABEL = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  transferencia: 'Transfer.', cuenta_corriente: 'Cta. Cte.', mixto: 'Mixto',
};
const METHOD_COLOR = {
  efectivo: '#1F6E5A', debito: '#6366f1', credito: '#f59e0b',
  transferencia: '#06b6d4', cuenta_corriente: '#ef4444', mixto: '#8b5cf6',
};

function greeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12)  return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const ICON_COLORS = {
  brand:  'bg-brand-soft text-brand border border-brand/20',
  green:  'bg-green-50 text-green-600 border border-green-100',
  red:    'bg-red-50 text-red-600 border border-red-100',
  amber:  'bg-amber-50 text-amber-600 border border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  gray:   'bg-gray-100 text-gray-500 border border-gray-200',
};

function StatCard({ icon: Icon, label, value, sub, color = 'brand', to, tooltip }) {
  const iconCls = ICON_COLORS[color] || ICON_COLORS.brand;
  const card = (
    <div
      title={tooltip}
      className="card p-5 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 cursor-pointer group"
      style={{ boxShadow: '0 2px 10px rgba(20,40,30,.05)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCls}`}>
          <Icon size={19} />
        </div>
        {to && (
          <ArrowRight
            size={14}
            className="mt-0.5 group-hover:translate-x-0.5 transition-all duration-150"
            style={{ color: 'var(--border)' }}
            ref={el => {
              if (el) el.closest('.group')?.addEventListener('mouseenter', () => { el.style.color = 'var(--brand)'; });
              if (el) el.closest('.group')?.addEventListener('mouseleave', () => { el.style.color = 'var(--border)'; });
            }}
          />
        )}
      </div>
      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold leading-tight tracking-tight" style={{ color: 'var(--ink)' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function Home() {
  const { user, tenant } = useAuth();
  const [stats,      setStats]      = useState(null);
  const [lowStock,   setLowStock]   = useState([]);
  const [salesChart, setSalesChart] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboard, ls] = await Promise.all([
          reportsApi.dashboard(),
          productsApi.lowStock(),
        ]);
        setStats(dashboard);
        setLowStock(ls);
        const today = new Date().toISOString().split('T')[0];
        const from  = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
        const chart = await reportsApi.salesByPeriod({ from, to: today });
        setSalesChart(chart.map(d => ({
          date:     new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          total:    parseFloat(d.total),
          ganancia: parseFloat(d.profit || 0),
        })));
      } catch { /* fail silently */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--muted)' }}>
          <BarChart2 size={32} className="mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const pieData = (stats?.payment_methods || []).map(m => ({
    name:  METHOD_LABEL[m.payment_method] || m.payment_method,
    value: parseFloat(m.total),
    color: METHOD_COLOR[m.payment_method] || '#94a3b8',
  }));

  const cajaValue = stats?.open_register
    ? fmt(stats.open_register.opening_amount) : '—';
  const cajaSub = stats?.open_register
    ? `Abierta desde ${new Date(stats.open_register.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Sin caja activa';

  const salesCountToday = parseInt(stats?.today?.sales_count || 0);

  return (
    <div className="flex-1 overflow-auto p-5 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {tenant?.business_name && (
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{tenant.business_name} · </span>
            )}
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/pos"
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-brand hover:shadow-brand-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--brand)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--brand-strong)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--brand)'}
        >
          <ShoppingCart size={15} /> Nueva venta
        </Link>
      </div>

      {/* Main KPI row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={ShoppingCart} label="Ventas hoy"           color="brand"  to="/sales"
            value={salesCountToday} sub={fmt(stats.today.sales_total)} tooltip="Ver listado de ventas del día" />
          <StatCard icon={TrendingUp}  label="Ganancia hoy"          color="green"
            value={fmt(stats.today.profit)}
            sub={stats.today.sales_total > 0 ? `${((stats.today.profit/stats.today.sales_total)*100).toFixed(1)}% margen` : '—'}
            tooltip="Ganancia bruta del día (ventas − costo de mercadería)" />
          <StatCard icon={CreditCard}  label="Cuentas por cobrar"    color="red"    to="/receivables"
            value={fmt(stats.receivables_total)} sub="saldo pendiente clientes"
            tooltip="Total adeudado por clientes con cuenta corriente" />
          <StatCard
            icon={stats.open_register ? Archive : Clock}
            label="Caja"
            color={stats.open_register ? 'green' : 'gray'}
            to="/cash-register"
            value={cajaValue} sub={cajaSub}
            tooltip={stats.open_register ? 'Ver detalle de caja abierta' : 'Abrir caja del día'} />
        </div>
      )}

      {/* Secondary KPI row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={BarChart2}     label="Ventas del mes"      color="indigo" to="/sales"
            value={stats.month.sales_count} sub={fmt(stats.month.sales_total)}
            tooltip="Ver todas las ventas del mes actual" />
          <StatCard icon={Banknote}      label="Ticket promedio hoy" color="brand"
            value={fmt(stats.today.avg_ticket)} tooltip="Promedio de importe por venta en el día de hoy" />
          <StatCard icon={AlertTriangle} label="Stock bajo"
            color={lowStock.length > 0 ? 'amber' : 'gray'} to="/stock"
            value={lowStock.length}
            sub={lowStock.length > 0 ? 'productos por reponer' : 'todo en orden'}
            tooltip={lowStock.length > 0 ? `${lowStock.length} producto${lowStock.length > 1 ? 's' : ''} con stock igual o menor al mínimo` : 'Sin productos con stock crítico'} />
          <StatCard icon={ShoppingBag}   label="OC pendientes"
            color={stats.pending_oc > 0 ? 'amber' : 'gray'} to="/purchase-orders"
            value={stats.pending_oc}
            sub={stats.pending_oc > 0 ? 'órdenes por recibir' : 'sin pendientes'}
            tooltip="Órdenes de compra pendientes de recepción" />
        </div>
      )}

      {/* Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>
            Ventas y ganancia — últimos 7 días
          </h3>
          {salesChart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                   style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                <BarChart2 size={26} style={{ color: 'var(--border)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Sin ventas en los últimos 7 días</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--border)' }}>Realizá tu primera venta para ver datos aquí</p>
              </div>
              <Link to="/pos" className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--brand)' }}>
                <ShoppingCart size={12} /> Nueva venta
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={salesChart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name === 'total' ? 'Ventas' : 'Ganancia']}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--ink)', fontSize: 12 }}
                />
                <Bar dataKey="total"    name="total"    fill="var(--brand-soft)"  radius={[4,4,0,0]} />
                <Bar dataKey="ganancia" name="ganancia" fill="var(--brand)"       radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>Métodos de pago hoy</h3>
          {pieData.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2 text-center">
              <CreditCard size={28} style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin ventas hoy</p>
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {pieData.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: m.color }} />
                      <span style={{ color: 'var(--muted)' }}>{m.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--ink)' }}>{fmt(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Últimas ventas + Stock bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Últimas ventas</h3>
              {salesCountToday > 0 && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{salesCountToday} hoy</span>
              )}
            </div>
            <Link to="/sales" className="text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--brand)' }}>
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          {!stats?.recent_sales?.length ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <ShoppingCart size={28} style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin ventas recientes</p>
              <Link to="/pos" className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--brand)' }}>
                Ir al punto de venta
              </Link>
            </div>
          ) : (
            <div className="space-y-0">
              {stats.recent_sales.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2.5 border-b last:border-0"
                     style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      #{s.ticket_number}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
                        {s.customer_name || 'Consumidor Final'}
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(s.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{METHOD_LABEL[s.payment_method] || s.payment_method}
                    </p>
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--brand)' }}>{fmt(s.total)}</span>
                </div>
              ))}
              {salesCountToday > stats.recent_sales.length && (
                <Link to="/sales" className="block text-center text-xs font-semibold pt-2 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--brand)' }}>
                  Ver las {salesCountToday - stats.recent_sales.length} ventas más
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Stock bajo</h3>
              {lowStock.length > 0 && (
                <span className="text-xs font-semibold" style={{ color: 'var(--warn)' }}>
                  {lowStock.length} producto{lowStock.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Link to="/stock" className="text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--warn)' }}>
              Ver todo <ArrowRight size={11} />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: 'var(--muted)' }}>
              <Package size={28} />
              <p className="text-sm">Todo el stock en orden</p>
            </div>
          ) : (
            <div className="space-y-0">
              {lowStock.slice(0, 7).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0"
                     style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0 mr-3">
                    <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{p.name}</p>
                    {p.code && <p className="text-xs" style={{ color: 'var(--muted)' }}>{p.code}</p>}
                  </div>
                  <span
                    title={p.stock <= 0
                      ? `Sin stock (mínimo: ${p.min_stock} u.)`
                      : `Stock: ${p.stock} u. — Mínimo: ${p.min_stock} u.`}
                    className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full cursor-help ${
                      p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}
                  </span>
                </div>
              ))}
              {lowStock.length > 7 && (
                <Link to="/stock" className="block text-center text-xs font-semibold pt-2 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--warn)' }}>
                  +{lowStock.length - 7} productos más
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
