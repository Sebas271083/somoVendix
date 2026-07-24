import { useState, useEffect } from 'react';
import { Plus, Edit2, KeyRound, ToggleLeft, ToggleRight, X, UserCog } from 'lucide-react';
import { usersApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const ROLES = [
  { key: 'admin',   label: 'Administrador',   desc: 'Acceso total al sistema' },
  { key: 'manager', label: 'Gerente',          desc: 'Todo excepto usuarios y configuración' },
  { key: 'cashier', label: 'Cajero/Vendedor',  desc: 'Solo POS, productos y clientes' },
];

const EMPTY = { name: '', email: '', password: '', role: 'cashier' };

function UserModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(
    editing
      ? { name: editing.name, email: editing.email, role: editing.role, password: '' }
      : EMPTY
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing && !form.password) {
      toast.error('La contraseña es requerida para nuevos usuarios');
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const payload = { name: form.name, email: editing.email, role: form.role, active: editing.active ?? true };
        await usersApi.update(editing.id, payload);
        toast.success('Usuario actualizado');
      } else {
        await usersApi.create({ ...form, sendEmail });
        toast.success(sendEmail ? 'Usuario creado — se envió el email con credenciales' : 'Usuario creado');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.key === form.role);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }} className="hover:opacity-70"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Nombre *</label>
            <input required value={form.name} onChange={f('name')} className="input" placeholder="Nombre completo" />
          </div>
          {!editing && (
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Email *</label>
              <input required type="email" value={form.email} onChange={f('email')} className="input" placeholder="correo@ejemplo.com" />
            </div>
          )}
          {editing && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
              Email: <span className="font-medium" style={{ color: 'var(--ink)' }}>{editing.email}</span>
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Rol *</label>
            <select value={form.role} onChange={f('role')} className="input">
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            {selectedRole && (
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{selectedRole.desc}</p>
            )}
          </div>
          {!editing && (
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Contraseña *</label>
              <input required type="password" value={form.password} onChange={f('password')} className="input" placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
          )}
          {!editing && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="w-4 h-4 rounded accent-brand"
              />
              <span className="text-sm" style={{ color: 'var(--ink)' }}>
                Enviar email con credenciales de acceso
              </span>
            </label>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      await usersApi.resetPassword(user.id, { password });
      toast.success('Contraseña restablecida');
      onClose();
    } catch (err) {
      toast.error(err?.error || 'Error al restablecer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="font-semibold text-lg mb-1">Restablecer contraseña</h3>
        <p className="text-sm text-gray-500 mb-4">{user.name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nueva contraseña</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="Mínimo 6 caracteres" minLength={6} autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Confirmar contraseña</label>
            <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="input" placeholder="Repetir contraseña" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {loading ? 'Guardando...' : 'Restablecer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_LABELS = { admin: 'Administrador', manager: 'Gerente', cashier: 'Cajero/Vendedor' };
const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', cashier: 'bg-teal-100 text-teal-700' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [maxUsers, setMaxUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.users ?? res);
      setMaxUsers(res.max_users ?? null);
    } catch { toast.error('Error al cargar usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (u) => {
    try {
      await usersApi.update(u.id, { name: u.name, email: u.email, role: u.role, active: !u.active });
      load();
    } catch { toast.error('Error'); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog size={20} className="text-gray-500" />
          <h1 className="text-xl font-semibold">Usuarios</h1>
          {maxUsers !== null ? (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${users.length >= maxUsers ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
              {users.length} / {maxUsers}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{users.length} {users.length === 1 ? 'usuario' : 'usuarios'}</span>
          )}
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          disabled={maxUsers !== null && users.length >= maxUsers}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          title={maxUsers !== null && users.length >= maxUsers ? `Límite de ${maxUsers} usuarios alcanzado` : ''}
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          {u.id === currentUser?.id && (
                            <p className="text-[10px] text-blue-500 font-medium">Vos</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => u.id !== currentUser?.id && toggleActive(u)}
                        disabled={u.id === currentUser?.id}
                        className={`transition-colors disabled:cursor-not-allowed ${u.active ? 'text-green-500' : 'text-gray-300'}`}
                        title={u.id === currentUser?.id ? 'No podés desactivar tu propio usuario' : ''}
                      >
                        {u.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('es-AR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setResetting(u)}
                          title="Restablecer contraseña"
                          className="text-gray-400 hover:text-amber-600 transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => { setEditing(u); setShowForm(true); }}
                          title="Editar"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserModal
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
        />
      )}
    </div>
  );
}
