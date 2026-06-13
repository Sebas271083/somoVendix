import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { suppliersApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const EMPTY = { name: '', contact: '', phone: '', email: '', address: '', notes: '' };

export default function Suppliers() {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = async (s = search) => {
    try { setSuppliers(await suppliersApi.list(s)); }
    catch { toast.error('Error al cargar proveedores'); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm(s); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await suppliersApi.update(editing.id, form); toast.success('Proveedor actualizado'); }
      else { await suppliersApi.create(form); toast.success('Proveedor creado'); }
      setShowForm(false); load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar proveedor?')) return;
    try { await suppliersApi.delete(id); toast.success('Eliminado'); load(); }
    catch { toast.error('Error al eliminar'); }
  };

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Proveedores</h1>
        {isAdmin && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo proveedor</button>}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedores..." className="input pl-9" />
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              {['Nombre', 'Contacto', 'Teléfono', 'Email', 'Dirección', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.contact || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.address || '—'}</td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b"><h2 className="text-lg font-semibold">{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                <input required value={form.name} onChange={f('name')} className="input" />
              </div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Contacto</label><input value={form.contact} onChange={f('contact')} className="input" /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label><input value={form.phone} onChange={f('phone')} className="input" /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Email</label><input type="email" value={form.email} onChange={f('email')} className="input" /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Dirección</label><input value={form.address} onChange={f('address')} className="input" /></div>
              <div className="col-span-2"><label className="text-sm font-medium text-gray-700 block mb-1">Notas</label><textarea value={form.notes} onChange={f('notes')} rows={2} className="input resize-none" /></div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
