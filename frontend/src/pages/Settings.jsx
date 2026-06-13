import { useState, useEffect } from 'react';
import { settingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { Save, Store, Receipt, CreditCard, Zap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'business', label: 'Negocio', icon: Store },
  { id: 'receipts', label: 'Recibos', icon: Receipt },
  { id: 'payments', label: 'Pagos y moneda', icon: CreditCard },
  { id: 'plan', label: 'Mi plan', icon: Zap },
];

const planLabels = { free: 'Gratis', pro: 'Pro', business: 'Business' };
const planColors = { free: 'bg-gray-100 text-gray-700', pro: 'bg-blue-100 text-blue-700', business: 'bg-purple-100 text-purple-700' };

export default function Settings() {
  const { tenant, trialDaysLeft } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('business');

  useEffect(() => {
    settingsApi.getAll().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toast.success('Configuración guardada');
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando configuración...</div>;

  const days = trialDaysLeft();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-1">Datos del negocio y preferencias del sistema</p>
        </div>
        {activeSection !== 'plan' && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60">
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeSection === id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white border rounded-xl p-6">
          {activeSection === 'business' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 border-b pb-3">Datos del negocio</h2>
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre del negocio</label>
                <input value={settings.business_name || ''} onChange={e => set('business_name', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mi Papelería" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Dirección</label>
                <input value={settings.business_address || ''} onChange={e => set('business_address', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Av. Corrientes 1547" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <input value={settings.business_phone || ''} onChange={e => set('business_phone', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="011-4444-0000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={settings.business_email || ''} onChange={e => set('business_email', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="info@minegocio.com" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">URL del logo</label>
                <input value={settings.logo_url || ''} onChange={e => set('logo_url', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..." />
                {settings.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="mt-2 h-16 object-contain rounded border" />
                )}
              </div>
            </div>
          )}

          {activeSection === 'receipts' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 border-b pb-3">Configuración de recibos</h2>
              <div>
                <label className="text-sm font-medium text-gray-700">Mensaje al pie del recibo</label>
                <textarea value={settings.receipt_footer || ''} onChange={e => set('receipt_footer', e.target.value)}
                  rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="¡Gracias por tu compra!" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Ancho impresora térmica</label>
                <select value={settings.thermal_printer_width || '80'}
                  onChange={e => set('thermal_printer_width', e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="58">58mm</option>
                  <option value="80">80mm</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'payments' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 border-b pb-3">Moneda y pagos</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Moneda</label>
                  <select value={settings.currency || 'ARS'} onChange={e => set('currency', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ARS">ARS - Peso argentino</option>
                    <option value="USD">USD - Dólar</option>
                    <option value="UYU">UYU - Peso uruguayo</option>
                    <option value="CLP">CLP - Peso chileno</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Símbolo de moneda</label>
                  <input value={settings.currency_symbol || '$'} onChange={e => set('currency_symbol', e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="$" maxLength={3} />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settings.tax_enabled === '1'}
                    onChange={e => set('tax_enabled', e.target.checked ? '1' : '0')}
                    className="w-4 h-4 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Habilitar impuesto (IVA)</span>
                </label>
              </div>
              {settings.tax_enabled === '1' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Tasa de IVA (%)</label>
                  <input type="number" value={settings.tax_rate || '21'} onChange={e => set('tax_rate', e.target.value)}
                    className="mt-1 w-40 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0" max="100" step="0.5" />
                </div>
              )}
            </div>
          )}

          {activeSection === 'plan' && tenant && (
            <div className="space-y-6">
              <h2 className="font-semibold text-gray-900 border-b pb-3">Mi plan</h2>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border">
                <div>
                  <p className="text-sm text-gray-500">Plan actual</p>
                  <span className={`inline-block mt-1 text-sm font-semibold px-3 py-1 rounded-full ${planColors[tenant.plan_slug] || planColors.free}`}>
                    {planLabels[tenant.plan_slug] || tenant.plan_name}
                  </span>
                </div>
                <div className="ml-6">
                  <p className="text-sm text-gray-500">Estado</p>
                  <p className="text-sm font-medium text-gray-800 mt-1 capitalize">{tenant.status}</p>
                </div>
                {tenant.status === 'trial' && days !== null && (
                  <div className="ml-6">
                    <p className="text-sm text-gray-500">Trial</p>
                    <p className={`text-sm font-medium mt-1 ${days <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                      {days} {days === 1 ? 'día restante' : 'días restantes'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Límites del plan</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Productos', value: tenant.max_products },
                    { label: 'Usuarios', value: tenant.max_users },
                    { label: 'Ventas por mes', value: tenant.max_sales_per_month },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-800">
                        {value === null ? 'Ilimitado' : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {tenant.features && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Módulos incluidos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(tenant.features).map(([key, enabled]) => (
                      <div key={key} className={`flex items-center gap-2 text-sm ${enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                        <CheckCircle size={14} className={enabled ? 'text-green-500' : 'text-gray-300'} />
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tenant.plan_slug !== 'business' && (
                <div className="border-t pt-4">
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
                    <Zap size={15} />
                    Actualizar a plan superior
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Contactanos para conocer los planes disponibles.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
