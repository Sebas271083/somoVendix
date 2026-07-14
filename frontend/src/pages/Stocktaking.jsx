import { useState, useEffect } from 'react';
import { stocktakeApi, locationsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ClipboardList, Plus, ChevronRight, CheckCircle, Clock, X, Save, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const diffColor = (d) => d > 0 ? 'text-green-600' : d < 0 ? 'text-red-600' : 'text-gray-400';

function SessionDetail({ sessionId, onBack, onClosed }) {
  const { isAdmin } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setSession(await stocktakeApi.get(sessionId)); }
    catch (err) { setError(err?.error || err?.message || 'Error al cargar la sesión'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [sessionId]);

  const handleCount = async (item, value) => {
    const qty = value === '' ? null : parseFloat(value);
    try {
      await stocktakeApi.updateItem(sessionId, item.id, qty);
      setSession(s => ({
        ...s,
        items: s.items.map(i => i.id === item.id
          ? { ...i, counted_qty: qty, difference: qty !== null ? qty - i.expected_qty : null }
          : i
        ),
      }));
    } catch { toast.error('Error al guardar conteo'); }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await stocktakeApi.close(sessionId);
      toast.success('Inventario cerrado. Ajustes aplicados.');
      onClosed();
    } catch (err) {
      toast.error(err?.error || 'Error al cerrar');
    } finally { setClosing(false); setConfirmClose(false); }
  };

  const filtered = (session?.items || []).filter(i =>
    !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || (i.code || '').includes(search)
  );

  const withDiff = filtered.filter(i => i.counted_qty !== null && Math.abs(i.difference || 0) > 0.001);
  const counted = session?.items.filter(i => i.counted_qty !== null).length ?? 0;
  const total = session?.items.length ?? 0;

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Cargando sesión...</div>;
  if (error) return (
    <div className="p-8 text-center space-y-3">
      <p className="text-red-500 font-medium">No se pudo cargar la sesión</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{error}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={load} className="btn-primary px-4 py-2 text-sm">Reintentar</button>
        <button onClick={onBack} className="btn-secondary px-4 py-2 text-sm">Volver</button>
      </div>
    </div>
  );
  if (!session) return null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Inventario #{session.id}</h2>
          <p className="text-sm text-gray-500">
            {session.location_name || 'Todas las ubicaciones'} · {fmtDate(session.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-blue-700">{counted}</span>/{total} contados
        </div>
        {session.status === 'open' && isAdmin && (
          <button
            onClick={() => setConfirmClose(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Lock size={14} /> Cerrar inventario
          </button>
        )}
        {session.status === 'closed' && (
          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-full font-medium">
            <CheckCircle size={13} /> Cerrado
          </span>
        )}
      </div>

      {withDiff.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <strong>{withDiff.length} producto{withDiff.length > 1 ? 's' : ''}</strong> con diferencias detectadas.
          {session.status === 'open' && ' Se ajustarán al cerrar el inventario.'}
        </div>
      )}

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar producto o código..."
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
      />

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500">Producto</th>
              <th className="text-left px-4 py-3 text-gray-500 hidden sm:table-cell">Código</th>
              {session.items[0]?.variant_label !== undefined && (
                <th className="text-left px-4 py-3 text-gray-500">Variante</th>
              )}
              <th className="text-center px-4 py-3 text-gray-500">Esperado</th>
              <th className="text-center px-4 py-3 text-gray-500">Contado</th>
              <th className="text-center px-4 py-3 text-gray-500">Diferencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(item => (
              <tr key={item.id} className={item.counted_qty === null ? '' : Math.abs(item.difference || 0) > 0.001 ? 'bg-amber-50/40' : 'bg-green-50/30'}>
                <td className="px-4 py-2.5 font-medium text-gray-800">{item.product_name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400 hidden sm:table-cell">{item.code || '—'}</td>
                {item.variant_label !== undefined && (
                  <td className="px-4 py-2.5 text-xs text-indigo-600">{item.variant_label || '—'}</td>
                )}
                <td className="px-4 py-2.5 text-center text-gray-600">{item.expected_qty}</td>
                <td className="px-4 py-2.5 text-center">
                  {session.status === 'open' ? (
                    <input
                      type="number"
                      defaultValue={item.counted_qty ?? ''}
                      onBlur={e => handleCount(item, e.target.value)}
                      className="w-20 text-center border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="—"
                      min="0"
                    />
                  ) : (
                    <span className="font-medium">{item.counted_qty ?? '—'}</span>
                  )}
                </td>
                <td className={`px-4 py-2.5 text-center font-semibold ${item.counted_qty !== null ? diffColor(item.difference) : 'text-gray-300'}`}>
                  {item.counted_qty !== null
                    ? (item.difference > 0 ? `+${item.difference}` : item.difference)
                    : '—'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmClose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-lg mb-2">¿Cerrar inventario?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Se aplicarán ajustes de stock para los <strong>{withDiff.length}</strong> productos con diferencias.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClose(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleClose} disabled={closing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
                {closing ? 'Aplicando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewSessionModal({ locations, onClose, onCreate }) {
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id } = await stocktakeApi.create({ location_id: locationId || null, notes });
      toast.success('Sesión de inventario creada');
      onCreate(id);
    } catch (err) {
      toast.error(err?.error || 'Error al crear sesión');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Nueva sesión de inventario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Ubicación (opcional)</label>
            <select value={locationId} onChange={e => setLocationId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las ubicaciones</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inventario semestral, etc." />
          </div>
          <p className="text-xs text-gray-400">
            Se pre-cargarán todos los productos activos con su stock actual como referencia.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
              {loading ? 'Creando...' : 'Crear inventario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Stocktaking() {
  const { isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([stocktakeApi.list(), locationsApi.list()]);
      setSessions(s);
      setLocations(l);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (activeSession) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-5">
        <SessionDetail
          sessionId={activeSession}
          onBack={() => setActiveSession(null)}
          onClosed={() => { setActiveSession(null); load(); }}
        />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-600" /> Inventario físico
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Conteo físico periódico para auditar y ajustar el stock</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={15} /> Nueva sesión
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay sesiones de inventario aún.</p>
          {isAdmin && <p className="text-sm mt-1">Creá una nueva para empezar el conteo.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className="w-full text-left bg-white border rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">Inventario #{s.id}</span>
                    {s.status === 'open'
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1"><Clock size={10} /> En curso</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1"><CheckCircle size={10} /> Cerrado</span>
                    }
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {s.location_name || 'Todas las ubicaciones'} · {fmtDate(s.created_at)} · {s.created_by_name}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span><strong className="text-gray-800">{s.counted_count}</strong>/{s.item_count} contados</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showNew && (
        <NewSessionModal
          locations={locations}
          onClose={() => setShowNew(false)}
          onCreate={(id) => { setShowNew(false); setActiveSession(id); }}
        />
      )}
    </div>
  );
}
