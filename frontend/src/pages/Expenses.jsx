import { useState, useEffect, useCallback } from 'react';
import { expensesApi, suppliersApi } from '../services/api';
import { Plus, X, CheckCircle, Clock, AlertCircle, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const STATUS_CONFIG = {
  pending:  { label: 'Pendiente', color: 'bg-gray-100 text-gray-600',  icon: Clock, dot: 'bg-gray-400' },
  paid:     { label: 'Pagado',    color: 'bg-green-100 text-green-700', icon: CheckCircle, dot: 'bg-green-500' },
  overdue:  { label: 'Vencido',   color: 'bg-red-100 text-red-600',    icon: AlertCircle, dot: 'bg-red-500' },
};

const CATEGORIES = ['Alquiler', 'Servicios', 'Sueldos', 'Mercadería', 'Impuestos', 'Marketing', 'Mantenimiento', 'Transporte', 'General', 'Otro'];

function ExpenseModal({ expense, suppliers, onClose, onSuccess }) {
  const [form, setForm] = useState({
    description: expense?.description || '',
    amount: expense?.amount || '',
    category: expense?.category || 'General',
    due_date: expense?.due_date?.split('T')[0] || '',
    supplier_id: expense?.supplier_id || '',
    is_recurring: expense?.is_recurring ? true : false,
    recurrence_period: expense?.recurrence_period || 'monthly',
    payment_method: expense?.payment_method || 'efectivo',
    notes: expense?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return toast.error('Completá descripción y monto');
    setLoading(true);
    try {
      if (expense?.id) await expensesApi.update(expense.id, form);
      else await expensesApi.create(form);
      toast.success(expense?.id ? 'Gasto actualizado' : 'Gasto creado');
      onSuccess();
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{expense?.id ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Descripción *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Alquiler local enero" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Monto *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Vencimiento</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
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
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Proveedor (opcional)</label>
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sin proveedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="recurring" checked={form.is_recurring}
              onChange={e => set('is_recurring', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            <label htmlFor="recurring" className="text-sm font-medium text-gray-700">Gasto recurrente</label>
            {form.is_recurring && (
              <select value={form.recurrence_period} onChange={e => set('recurrence_period', e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones opcionales..." />
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

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [exp, sum, sup] = await Promise.all([
        expensesApi.list({ status: filters.status, category: filters.category }),
        expensesApi.summary(),
        suppliersApi.list(),
      ]);
      setExpenses(exp);
      setSummary(sum);
      setSuppliers(sup);
    } catch { toast.error('Error al cargar gastos'); }
    finally { setLoading(false); }
  }, [filters.status, filters.category]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (id) => {
    try {
      await expensesApi.markPaid(id);
      toast.success('Marcado como pagado');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await expensesApi.delete(id);
      toast.success('Gasto eliminado');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 text-sm mt-1">Control de egresos y vencimientos</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Nuevo gasto
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pendientes', value: summary.pending_count, amount: summary.pending_amount, color: 'gray' },
            { label: 'Pagados este mes', value: summary.paid_count, amount: summary.paid_this_month, color: 'green' },
            { label: 'Vencidos', value: summary.overdue_count, amount: summary.overdue_amount, color: 'red' },
            { label: 'Total gastos', value: summary.total, amount: null, color: 'blue' },
          ].map(({ label, value, amount, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
              <p className={`text-xs font-medium text-${color}-600`}>{label}</p>
              <p className={`text-2xl font-bold text-${color}-700 mt-1`}>{value}</p>
              {amount != null && <p className={`text-xs text-${color}-500 mt-0.5`}>{fmt(amount)}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar gasto..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagados</option>
          <option value="overdue">Vencidos</option>
        </select>
        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay gastos</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(expense => {
            const cfg = STATUS_CONFIG[expense.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={expense.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{expense.description}</p>
                    {expense.is_recurring && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Recurrente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{expense.category}</span>
                    {expense.due_date && (
                      <span className="text-xs text-gray-400">
                        Vence: {new Date(expense.due_date).toLocaleDateString('es-AR')}
                      </span>
                    )}
                    {expense.supplier_name && (
                      <span className="text-xs text-gray-400">{expense.supplier_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{fmt(expense.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="flex gap-1 ml-2">
                  {expense.status !== 'paid' && (
                    <button onClick={() => handleMarkPaid(expense.id)}
                      title="Marcar como pagado"
                      className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => setModal(expense)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg text-xs">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(expense.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg">
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <ExpenseModal expense={modal?.id ? modal : null} suppliers={suppliers}
          onClose={() => setModal(null)} onSuccess={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
