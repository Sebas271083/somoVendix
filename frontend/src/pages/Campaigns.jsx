import { useState, useEffect } from 'react';
import { Plus, Send, MessageCircle, Edit2, Trash2, X, Copy, ExternalLink } from 'lucide-react';
import { campaignsApi } from '../services/api.js';
import toast from 'react-hot-toast';

const SEGMENTS = [
  { value: 'all', label: 'Todos' },
  { value: 'general', label: 'General' },
  { value: 'minorista', label: 'Minorista' },
  { value: 'mayorista', label: 'Mayorista' },
  { value: 'vip', label: 'VIP' },
];

const EMPTY = { name: '', channel: 'email', segment: 'all', subject: '', body: '' };

function CampaignForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [loading, setLoading] = useState(false);
  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) {
      toast.error(err?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial?.id ? 'Editar campaña' : 'Nueva campaña'}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
            <input required value={form.name} onChange={f('name')} className="input" placeholder="Ej: Promoción invierno" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Canal</label>
              <select value={form.channel} onChange={f('channel')} className="input">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Segmento</label>
              <select value={form.segment} onChange={f('segment')} className="input">
                {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {form.channel === 'email' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Asunto</label>
              <input value={form.subject} onChange={f('subject')} className="input"
                placeholder="Asunto del email" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Mensaje
              <span className="ml-2 text-xs text-gray-400 font-normal">
                Variables: <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code>{' '}
                <code className="bg-gray-100 px-1 rounded">{'{{negocio}}'}</code>
              </span>
            </label>
            <textarea required value={form.body} onChange={f('body')} rows={6}
              className="input resize-none font-mono text-sm"
              placeholder="Hola {{nombre}}, queremos contarte sobre nuestra promoción..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WhatsAppLinksModal({ campaign, onClose }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignsApi.whatsappLinks(campaign.id)
      .then(setLinks)
      .catch(() => toast.error('Error al cargar links'))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold">Links de WhatsApp — {campaign.name}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Generando links...</div>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No hay destinatarios con número de teléfono</div>
          ) : links.map((l, idx) => (
            <div key={l.phone || idx} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">{l.name}</p>
                <p className="text-xs text-gray-400">{l.phone}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(l.url); toast.success('Link copiado'); }}
                  className="text-gray-400 hover:text-gray-700 p-1.5">
                  <Copy size={14} />
                </button>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 p-1.5">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
        {links.length > 0 && (
          <div className="p-5 pt-0">
            <button
              onClick={() => { links.forEach((l) => window.open(l.url, '_blank')); }}
              className="w-full btn-primary justify-center text-sm">
              Abrir todos en WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [waModal, setWaModal] = useState(null);
  const [sending, setSending] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setCampaigns(await campaignsApi.list()); }
    catch { toast.error('Error al cargar campañas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editing) {
      await campaignsApi.update(editing.id, form);
      toast.success('Campaña actualizada');
    } else {
      await campaignsApi.create(form);
      toast.success('Campaña creada');
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleSend = async (c) => {
    if (!confirm(`¿Enviar campaña "${c.name}" por email a los destinatarios del segmento?`)) return;
    setSending(c.id);
    try {
      const res = await campaignsApi.send(c.id);
      toast.success(`Enviados: ${res.sent}, fallidos: ${res.failed}`);
      load();
    } catch (err) {
      toast.error(err?.error || 'Error al enviar');
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar campaña "${c.name}"?`)) return;
    try {
      await campaignsApi.delete(c.id);
      toast.success('Campaña eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  const openEdit = (c) => {
    setEditing({ ...EMPTY, ...c, segment: c.segment || 'all' });
    setShowForm(true);
  };

  const segColors = {
    general: 'bg-gray-100 text-gray-600',
    minorista: 'bg-blue-100 text-blue-700',
    mayorista: 'bg-purple-100 text-purple-700',
    vip: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Campañas</h1>
          <p className="text-sm text-gray-500">Email masivo y links de WhatsApp por segmento</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Nueva campaña
        </button>
      </div>

      <div className="card flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Send size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500">No hay campañas creadas aún</p>
            <button onClick={() => setShowForm(true)} className="mt-4 btn-primary text-sm">
              Crear primera campaña
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
              <tr>
                {['Nombre', 'Tipo', 'Segmento', 'Enviados', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.channel === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {c.channel === 'email' ? '✉ Email' : '💬 WhatsApp'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${segColors[c.segment] || 'bg-gray-100 text-gray-600'}`}>
                      {SEGMENTS.find((s) => s.value === (c.segment || 'all'))?.label || 'Todos'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.sent_count > 0 ? (
                      <span>
                        {c.sent_count} enviados
                        {c.failed_count > 0 && <span className="text-red-500 ml-1">({c.failed_count} fallidos)</span>}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.status === 'sent' ? 'Enviada' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {c.channel === 'email' ? (
                        <button onClick={() => handleSend(c)} disabled={sending === c.id} title="Enviar email"
                          className="text-blue-500 hover:bg-blue-50 p-1.5 rounded disabled:opacity-40">
                          <Send size={14} />
                        </button>
                      ) : (
                        <button onClick={() => setWaModal(c)} title="Links WhatsApp"
                          className="text-green-600 hover:bg-green-50 p-1.5 rounded">
                          <MessageCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} title="Editar"
                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(c)} title="Eliminar"
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <CampaignForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {waModal && <WhatsAppLinksModal campaign={waModal} onClose={() => setWaModal(null)} />}
    </div>
  );
}
