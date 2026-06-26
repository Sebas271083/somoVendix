import { useState, useEffect, useCallback } from 'react';
import { cashFlowApi } from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const CATEGORIES_INCOME  = ['Ventas', 'Cobro deuda', 'Otro ingreso'];
const CATEGORIES_EXPENSE = ['Compras', 'Gastos operativos', 'Sueldos', 'Alquiler', 'Servicios', 'Impuestos', 'Otro egreso'];

function MovementModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ type: 'income', amount: '', description: '', category: 'Otro ingreso', payment_method: 'efectivo' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return toast.error('Completá todos los campos');
    setLoading(true);
    try {
      await cashFlowApi.create(form);
      toast.success('Movimiento registrado');
      onSuccess();
    } catch (err) { toast.error(err?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const categories = form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Nuevo movimiento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex rounded-lg border overflow-hidden">
            {['income','expense'].map(t => (
              <button key={t} type="button"
                onClick={() => { set('type', t); set('category', t === 'income' ? CATEGORIES_INCOME[2] : CATEGORIES_EXPENSE[5]); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.type === t ? (t === 'income' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'text-gray-500 hover:bg-gray-50'}`}>
                {t === 'income' ? 'Ingreso' : 'Egreso'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Pago de alquiler" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Monto *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Método de pago</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="efectivo">Efectivo</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CashFlow() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [movements, setMovements] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [modal, setModal] = useState(false);
  const [filters, setFilters] = useState({ from: thirtyDaysAgo, to: today, type: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mov, daily, chart] = await Promise.all([
        cashFlowApi.list(filters),
        cashFlowApi.daily(today),
        cashFlowApi.period({ from: filters.from, to: filters.to }),
      ]);
      setMovements(mov);
      setDailySummary(daily);
      setChartData(chart.map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
        income: parseFloat(d.income),
        expense: parseFloat(d.expense),
      })));
    } catch { toast.error('Error al cargar flujo de caja'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await cashFlowApi.delete(id);
      toast.success('Movimiento eliminado');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flujo de caja</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresos y egresos del negocio</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Nuevo movimiento
        </button>
      </div>

      {/* Stats: hoy + período */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {dailySummary && (<>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 col-span-1">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-green-600" />
              <p className="text-xs font-medium text-green-600">Ingresos hoy</p>
            </div>
            <p className="text-xl font-bold text-green-700">{fmt(dailySummary.total_income)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 col-span-1">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown size={13} className="text-red-600" />
              <p className="text-xs font-medium text-red-600">Egresos hoy</p>
            </div>
            <p className="text-xl font-bold text-red-700">{fmt(dailySummary.total_expense)}</p>
          </div>
          <div className={`border rounded-xl p-4 col-span-1 ${parseFloat(dailySummary.balance) >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={13} className={parseFloat(dailySummary.balance) >= 0 ? 'text-blue-600' : 'text-orange-600'} />
              <p className={`text-xs font-medium ${parseFloat(dailySummary.balance) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Balance hoy</p>
            </div>
            <p className={`text-xl font-bold ${parseFloat(dailySummary.balance) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {fmt(dailySummary.balance)}
            </p>
          </div>
        </>)}
        {chartData.length > 0 && (() => {
          const pIncome = chartData.reduce((s, d) => s + d.income, 0);
          const pExpense = chartData.reduce((s, d) => s + d.expense, 0);
          const pBalance = pIncome - pExpense;
          return (<>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 col-span-1">
              <p className="text-xs font-medium text-green-600 mb-1">Ingresos período</p>
              <p className="text-xl font-bold text-green-700">{fmt(pIncome)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 col-span-1">
              <p className="text-xs font-medium text-red-600 mb-1">Egresos período</p>
              <p className="text-xl font-bold text-red-700">{fmt(pExpense)}</p>
            </div>
            <div className={`border rounded-xl p-4 col-span-1 ${pBalance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <p className={`text-xs font-medium mb-1 ${pBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Balance período</p>
              <p className={`text-xl font-bold ${pBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(pBalance)}</p>
            </div>
          </>);
        })()}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Evolución del período</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Egresos" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          <option value="income">Solo ingresos</option>
          <option value="expense">Solo egresos</option>
        </select>
      </div>

      {/* Movements list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Descripción</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Método</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Monto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin movimientos en el período</td></tr>
              ) : movements.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3 text-gray-900">{m.description}</td>
                  <td className="px-4 py-3 text-gray-500">{m.category}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{m.payment_method}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${m.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                    {m.type === 'income' ? '+' : '-'}{fmt(m.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {!m.reference_type && (
                      <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-500">
                        <X size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MovementModal onClose={() => setModal(false)} onSuccess={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}
