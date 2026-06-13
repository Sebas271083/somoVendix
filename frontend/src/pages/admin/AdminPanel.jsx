import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/api.js';
import toast from 'react-hot-toast';
import { Users, Package, BarChart2, LogOut, RefreshCw, Edit2, CheckCircle } from 'lucide-react';

const statusColors = {
  trial: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const planColors = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-blue-100 text-blue-700',
  business: 'bg-purple-100 text-purple-700',
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTenant, setEditTenant] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [t, s, p] = await Promise.all([
        superAdminApi.tenants(),
        superAdminApi.stats(),
        superAdminApi.plans(),
      ]);
      setTenants(t);
      setStats(s);
      setPlans(p);
    } catch (err) {
      if (err?.status === 401) navigate('/admin/login');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTrials = async () => {
    try {
      await superAdminApi.checkTrials();
      toast.success('Trials revisados');
      load();
    } catch { toast.error('Error'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleUpdate = async (id, fields) => {
    try {
      await superAdminApi.updateTenant(id, fields);
      toast.success('Actualizado');
      setEditTenant(null);
      load();
    } catch { toast.error('Error al actualizar'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      Cargando...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">G</div>
          <span className="font-semibold text-white">Gestix Super Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCheckTrials} className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg">
            <RefreshCw size={14} /> Revisar trials
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        {stats?.counts && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total', value: stats.counts.total, color: 'text-white' },
              { label: 'Trial', value: stats.counts.trialing, color: 'text-amber-400' },
              { label: 'Activos', value: stats.counts.active, color: 'text-green-400' },
              { label: 'Suspendidos', value: stats.counts.suspended, color: 'text-red-400' },
              { label: 'Cancelados', value: stats.counts.cancelled, color: 'text-gray-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
              </div>
            ))}
          </div>
        )}

        {/* Plan breakdown */}
        {stats?.planBreakdown && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {stats.planBreakdown.map(p => (
              <div key={p.slug} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{p.name}</p>
                  <p className="text-xl font-bold text-white">{p.count}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${planColors[p.slug] || planColors.free}`}>
                  {p.slug}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tenants table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Tenants ({tenants.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  {['ID', 'Negocio', 'Subdominio', 'Plan', 'Estado', 'Ventas', 'Usuarios', 'Creado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-500">{t.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-blue-400 font-mono text-xs">{t.subdomain}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[t.plan_slug] || planColors.free}`}>
                        {t.plan_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{t.total_sales ?? 0}</td>
                    <td className="px-4 py-3 text-gray-300">{t.users_count ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('es-AR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditTenant(t)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="font-semibold text-white mb-4">Editar: {editTenant.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Plan</label>
                <select
                  value={editTenant.plan_id}
                  onChange={e => setEditTenant(p => ({ ...p, plan_id: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Estado</label>
                <select
                  value={editTenant.status}
                  onChange={e => setEditTenant(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {['trial', 'active', 'suspended', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleUpdate(editTenant.id, { plan_id: editTenant.plan_id, status: editTenant.status })}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditTenant(null)}
                className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
