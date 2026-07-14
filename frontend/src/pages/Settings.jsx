import { useState, useEffect } from 'react';
import { settingsApi, billingApi, afipApi, categoriesApi } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { Save, Store, Receipt, CreditCard, Zap, CheckCircle, Loader2, Package, FileText, Wifi, Tag, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'business', label: 'Negocio', icon: Store },
  { id: 'receipts', label: 'Recibos', icon: Receipt },
  { id: 'payments', label: 'Pagos y moneda', icon: CreditCard },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'categories', label: 'Categorías', icon: Tag },
  { id: 'afip', label: 'AFIP', icon: FileText },
  { id: 'plan', label: 'Mi plan', icon: Zap },
];

const PRESET_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b',
  '#f97316','#ec4899','#8b5cf6','#14b8a6',
  '#ef4444','#84cc16','#06b6d4','#a855f7',
];

const toSlug = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const planLabels = { free: 'Gratis', pro: 'Pro', business: 'Business' };
const planColors = { free: 'bg-gray-100 text-gray-700', pro: 'bg-brand-soft text-brand', business: 'bg-purple-100 text-purple-700' };

const featureLabels = {
  reports: 'Reportes avanzados',
  receivables: 'Cuentas a cobrar',
  cashflow: 'Flujo de caja',
  expenses: 'Gestión de gastos',
  suppliers: 'Proveedores y OC',
};

export default function Settings() {
  const { tenant, trialDaysLeft } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('business');
  const [plans, setPlans] = useState([]);
  const [checkingOut, setCheckingOut] = useState(null);

  // Categorías state
  const [categories, setCategories] = useState([]);
  const [catNew, setCatNew] = useState({ name: '', color: '#6366f1' });
  const [catEditing, setCatEditing] = useState(null); // { id, name, color }
  const [catSaving, setCatSaving] = useState(false);

  // AFIP state
  const [afip, setAfip] = useState({
    cuit: '', punto_venta: 1, iva_condition: 'responsable_inscripto',
    environment: 'homologacion', enabled: false,
    cert_pem: '', key_pem: '', has_cert: false, has_key: false,
  });
  const [savingAfip, setSavingAfip] = useState(false);
  const [testingAfip, setTestingAfip] = useState(false);
  const [afipTestResult, setAfipTestResult] = useState(null);

  useEffect(() => {
    settingsApi.getAll().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeSection === 'plan') {
      billingApi.plans().then(setPlans).catch(() => {});
    }
    if (activeSection === 'afip') {
      afipApi.getSettings().then(s => setAfip(prev => ({ ...prev, ...s, cert_pem: '', key_pem: '' }))).catch(() => {});
    }
    if (activeSection === 'categories') {
      categoriesApi.list().then(setCategories).catch(() => {});
    }
  }, [activeSection]);

  const handleCheckout = async (planId) => {
    setCheckingOut(planId);
    try {
      const { init_point } = await billingApi.checkout(planId);
      window.location.href = init_point;
    } catch (err) {
      toast.error(err?.error || 'Error al iniciar el pago');
      setCheckingOut(null);
    }
  };

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toast.success('Configuración guardada');
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleCatCreate = async () => {
    if (!catNew.name.trim()) return;
    setCatSaving(true);
    try {
      const created = await categoriesApi.create({ name: catNew.name.trim(), slug: toSlug(catNew.name), color: catNew.color });
      setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCatNew({ name: '', color: '#6366f1' });
      toast.success('Categoría creada');
    } catch (err) { toast.error(err?.error || 'Error al crear'); }
    finally { setCatSaving(false); }
  };

  const handleCatUpdate = async () => {
    if (!catEditing?.name.trim()) return;
    setCatSaving(true);
    try {
      await categoriesApi.update(catEditing.id, { name: catEditing.name.trim(), slug: toSlug(catEditing.name), color: catEditing.color });
      setCategories(prev => prev.map(c => c.id === catEditing.id ? { ...c, ...catEditing, name: catEditing.name.trim() } : c));
      setCatEditing(null);
      toast.success('Categoría actualizada');
    } catch (err) { toast.error(err?.error || 'Error al actualizar'); }
    finally { setCatSaving(false); }
  };

  const handleCatDelete = async (id) => {
    try {
      await categoriesApi.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoría eliminada');
    } catch (err) { toast.error(err?.error || 'No se puede eliminar — tiene productos asociados'); }
  };

  const handleAfipSave = async () => {
    setSavingAfip(true);
    try {
      await afipApi.saveSettings(afip);
      toast.success('Configuración AFIP guardada');
      afipApi.getSettings().then(s => setAfip(prev => ({ ...prev, ...s, cert_pem: '', key_pem: '' }))).catch(() => {});
    } catch (err) { toast.error(err?.error || 'Error al guardar configuración AFIP'); }
    finally { setSavingAfip(false); }
  };

  const handleAfipTest = async () => {
    setTestingAfip(true);
    setAfipTestResult(null);
    try {
      const result = await afipApi.testConnection();
      setAfipTestResult({ ok: true, msg: `Conexión exitosa en ambiente ${result.ambiente}` });
    } catch (err) {
      setAfipTestResult({ ok: false, msg: err?.error || err?.message || 'Error de conexión' });
    } finally { setTestingAfip(false); }
  };

  const setAfipField = (k, v) => setAfip(p => ({ ...p, [k]: v }));

  if (loading) return <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>Cargando configuración...</div>;

  const days = trialDaysLeft();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Configuración</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Datos del negocio y preferencias del sistema</p>
        </div>
        {activeSection !== 'plan' && activeSection !== 'afip' && activeSection !== 'categories' && (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors font-medium"
                style={activeSection === id
                  ? { backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }
                  : { color: 'var(--muted)' }}
                onMouseEnter={e => { if (activeSection !== id) e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                onMouseLeave={e => { if (activeSection !== id) e.currentTarget.style.backgroundColor = ''; }}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 border rounded-xl p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          {activeSection === 'business' && (
            <div className="space-y-5">
              <h2 className="font-semibold border-b pb-3" style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>Datos del negocio</h2>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Nombre del negocio</label>
                <input value={settings.business_name || ''} onChange={e => set('business_name', e.target.value)}
                  className="input mt-1" placeholder="Mi Papelería" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Dirección</label>
                <input value={settings.business_address || ''} onChange={e => set('business_address', e.target.value)}
                  className="input mt-1" placeholder="Av. Corrientes 1547" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Teléfono</label>
                  <input value={settings.business_phone || ''} onChange={e => set('business_phone', e.target.value)}
                    className="input mt-1" placeholder="011-4444-0000" />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Email</label>
                  <input type="email" value={settings.business_email || ''} onChange={e => set('business_email', e.target.value)}
                    className="input mt-1" placeholder="info@minegocio.com" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>URL del logo</label>
                <input value={settings.logo_url || ''} onChange={e => set('logo_url', e.target.value)}
                  className="input mt-1" placeholder="https://..." />
                {settings.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="mt-2 h-16 object-contain rounded border" style={{ borderColor: 'var(--border)' }} />
                )}
              </div>
            </div>
          )}

          {activeSection === 'receipts' && (
            <div className="space-y-5">
              <h2 className="font-semibold border-b pb-3" style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>Configuración de recibos</h2>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Mensaje al pie del recibo</label>
                <textarea value={settings.receipt_footer || ''} onChange={e => set('receipt_footer', e.target.value)}
                  rows={3} className="input mt-1" placeholder="¡Gracias por tu compra!" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Ancho impresora térmica</label>
                <select value={settings.thermal_printer_width || '80'}
                  onChange={e => set('thermal_printer_width', e.target.value)}
                  className="input mt-1">
                  <option value="58">58mm</option>
                  <option value="80">80mm</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'payments' && (
            <div className="space-y-5">
              <h2 className="font-semibold border-b pb-3" style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>Moneda y pagos</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Moneda</label>
                  <select value={settings.currency || 'ARS'} onChange={e => set('currency', e.target.value)}
                    className="input mt-1">
                    <option value="ARS">ARS - Peso argentino</option>
                    <option value="USD">USD - Dólar</option>
                    <option value="UYU">UYU - Peso uruguayo</option>
                    <option value="CLP">CLP - Peso chileno</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Símbolo de moneda</label>
                  <input value={settings.currency_symbol || '$'} onChange={e => set('currency_symbol', e.target.value)}
                    className="input mt-1" placeholder="$" maxLength={3} />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settings.tax_enabled === '1'}
                    onChange={e => set('tax_enabled', e.target.checked ? '1' : '0')}
                    className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Habilitar impuesto (IVA)</span>
                </label>
              </div>
              {settings.tax_enabled === '1' && (
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Tasa de IVA (%)</label>
                  <input type="number" value={settings.tax_rate || '21'} onChange={e => set('tax_rate', e.target.value)}
                    className="input mt-1 w-40" min="0" max="100" step="0.5" />
                </div>
              )}
            </div>
          )}

          {activeSection === 'inventory' && (
            <div className="space-y-5">
              <h2 className="font-semibold border-b pb-3" style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>Gestión de inventario</h2>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Método de valoración de stock</label>
                <select
                  value={settings.stock_valuation_method || 'weighted_avg'}
                  onChange={e => set('stock_valuation_method', e.target.value)}
                  className="input w-full max-w-xs"
                >
                  <option value="weighted_avg">Promedio ponderado (recomendado)</option>
                  <option value="fifo">FIFO — Primero entrado, primero salido</option>
                </select>
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  {settings.stock_valuation_method === 'fifo'
                    ? 'FIFO: el costo de venta usa el costo de los lotes más antiguos. Requiere registrar órdenes de compra.'
                    : 'Promedio: el costo de venta usa el costo promedio actual del producto.'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Stock mínimo por defecto</label>
                <input
                  type="number"
                  value={settings.default_min_stock || '5'}
                  onChange={e => set('default_min_stock', e.target.value)}
                  className="input w-32"
                  min="0"
                />
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  Valor inicial de stock mínimo al crear un producto nuevo.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'categories' && (
            <div className="space-y-5">
              <div className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Categorías de productos</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Organizá tus productos por categoría. Se usan en el POS y en los reportes.</p>
              </div>

              {/* Nueva categoría */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setCatNew(p => ({ ...p, color: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: catNew.color === c ? 'var(--ink)' : 'transparent' }} />
                  ))}
                </div>
                <input
                  value={catNew.name}
                  onChange={e => setCatNew(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleCatCreate()}
                  placeholder="Nueva categoría..."
                  className="input flex-1"
                />
                <button onClick={handleCatCreate} disabled={catSaving || !catNew.name.trim()}
                  className="btn-primary px-4 disabled:opacity-50 flex items-center gap-1">
                  <Plus size={15} /> Agregar
                </button>
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {categories.length === 0 && (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>No hay categorías. Agregá una arriba.</p>
                )}
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                    {catEditing?.id === cat.id ? (
                      <>
                        <div className="flex gap-1 flex-wrap">
                          {PRESET_COLORS.map(c => (
                            <button key={c} onClick={() => setCatEditing(p => ({ ...p, color: c }))}
                              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                              style={{ backgroundColor: c, borderColor: catEditing.color === c ? 'var(--ink)' : 'transparent' }} />
                          ))}
                        </div>
                        <input
                          value={catEditing.name}
                          onChange={e => setCatEditing(p => ({ ...p, name: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleCatUpdate(); if (e.key === 'Escape') setCatEditing(null); }}
                          className="input flex-1 py-1"
                          autoFocus
                        />
                        <button onClick={handleCatUpdate} disabled={catSaving}
                          className="btn-primary px-3 py-1 text-sm disabled:opacity-50">
                          {catSaving ? '...' : 'Guardar'}
                        </button>
                        <button onClick={() => setCatEditing(null)} className="p-1 rounded" style={{ color: 'var(--muted)' }}>
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{cat.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.color + '22', color: cat.color }}>
                          {cat.product_count ?? ''} {cat.product_count === 1 ? 'producto' : 'productos'}
                        </span>
                        <button onClick={() => setCatEditing({ id: cat.id, name: cat.name, color: cat.color })}
                          className="p-1 rounded hover:bg-gray-100 transition-colors" style={{ color: 'var(--muted)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleCatDelete(cat.id)}
                          className="p-1 rounded hover:bg-red-50 transition-colors text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'afip' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Facturación electrónica AFIP</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Configure sus credenciales para emitir facturas electrónicas con CAE</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Habilitado</span>
                  <div className="relative w-10 h-6 rounded-full transition-colors"
                    style={{ backgroundColor: afip.enabled ? 'var(--brand)' : 'var(--border)' }}
                    onClick={() => setAfipField('enabled', !afip.enabled)}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${afip.enabled ? 'translate-x-4' : ''}`} />
                  </div>
                </label>
              </div>

              {!afip.enabled && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                  <FileText size={20} style={{ color: 'var(--muted)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Facturación electrónica deshabilitada</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Active el switch de arriba para configurar la conexión con AFIP y emitir facturas con CAE.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>CUIT del negocio</label>
                  <input value={afip.cuit || ''} onChange={e => setAfipField('cuit', e.target.value)}
                    placeholder="20-12345678-9" maxLength={13}
                    className="input mt-1 font-mono" />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Sin guiones: 20123456789</p>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Punto de venta</label>
                  <input type="number" value={afip.punto_venta || 1} onChange={e => setAfipField('punto_venta', parseInt(e.target.value))}
                    min={1} max={9999} className="input mt-1" />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Número habilitado en AFIP</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Condición de IVA del negocio</label>
                  <select value={afip.iva_condition || 'responsable_inscripto'} onChange={e => setAfipField('iva_condition', e.target.value)}
                    className="input mt-1">
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                    <option value="monotributista">Monotributista</option>
                    <option value="exento">Exento</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Determina el tipo de factura (A/B/C)</p>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Ambiente</label>
                  <select value={afip.environment || 'homologacion'} onChange={e => setAfipField('environment', e.target.value)}
                    className="input mt-1">
                    <option value="homologacion">Homologación (pruebas)</option>
                    <option value="produccion">Producción</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Use homologación para testing</p>
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-4">
                <p className="text-sm font-medium text-amber-800">Certificados digitales</p>
                <p className="text-xs text-amber-700">
                  Debe generar un certificado digital en el sitio de AFIP (Administración de Certificados Digitales).
                  Pegue el contenido del archivo <strong>.crt</strong> y <strong>.key</strong> en los campos de abajo.
                </p>
                <div>
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                    Certificado (.crt / .pem)
                    {afip.has_cert && <span className="text-xs text-green-600 font-normal">✓ Cargado</span>}
                  </label>
                  <textarea
                    value={afip.cert_pem || ''}
                    onChange={e => setAfipField('cert_pem', e.target.value)}
                    rows={5}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    className="input mt-1 text-xs font-mono resize-y"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Deje en blanco para no modificar el certificado guardado</p>
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ink)' }}>
                    Clave privada (.key)
                    {afip.has_key && <span className="text-xs text-green-600 font-normal">✓ Cargada</span>}
                  </label>
                  <textarea
                    value={afip.key_pem || ''}
                    onChange={e => setAfipField('key_pem', e.target.value)}
                    rows={5}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    className="input mt-1 text-xs font-mono resize-y"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Deje en blanco para no modificar la clave guardada</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleAfipSave} disabled={savingAfip} className="btn-primary flex items-center gap-2">
                  <Save size={16} /> {savingAfip ? 'Guardando...' : 'Guardar configuración AFIP'}
                </button>
                <button onClick={handleAfipTest} disabled={testingAfip || !afip.enabled}
                  title={!afip.enabled ? 'Active AFIP primero' : 'Probar conexión con AFIP'}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-40">
                  {testingAfip ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
                  {testingAfip ? 'Probando...' : 'Probar conexión'}
                </button>
              </div>

              {afipTestResult && (
                <div className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${afipTestResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {afipTestResult.ok ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <span className="shrink-0">✕</span>}
                  {afipTestResult.msg}
                </div>
              )}

              <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Cómo obtener sus credenciales AFIP:</p>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--muted)' }}>
                  <li>Ingrese a <strong>afip.gov.ar</strong> con su CUIT y clave fiscal</li>
                  <li>Vaya a <strong>Administración de Certificados Digitales</strong></li>
                  <li>Genere un nuevo certificado para el servicio <strong>wsfe</strong></li>
                  <li>Descargue el archivo <strong>.crt</strong> (certificado) y guarde su clave privada <strong>.key</strong></li>
                  <li>Habilite el punto de venta en <strong>Mis Aplicaciones Web {'>'} RCEL {'>'} ABM de puntos de venta</strong></li>
                  <li>Pegue el contenido de ambos archivos en los campos de arriba y guarde</li>
                </ol>
              </div>
            </div>
          )}

          {activeSection === 'plan' && tenant && (
            <div className="space-y-6">
              <h2 className="font-semibold border-b pb-3" style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>Mi plan</h2>

              {/* Estado actual */}
              <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Plan actual</p>
                  <span className={`inline-block mt-1 text-sm font-semibold px-3 py-1 rounded-full ${planColors[tenant.plan_slug] || planColors.free}`}>
                    {planLabels[tenant.plan_slug] || tenant.plan_name}
                  </span>
                </div>
                <div className="ml-6">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Estado</p>
                  <p className="text-sm font-medium mt-1 capitalize" style={{ color: 'var(--ink)' }}>{tenant.status}</p>
                </div>
                {tenant.status === 'trial' && days !== null && (
                  <div className="ml-6">
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Trial</p>
                    <p className={`text-sm font-medium mt-1 ${days <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                      {days} {days === 1 ? 'día restante' : 'días restantes'}
                    </p>
                  </div>
                )}
              </div>

              {/* Cards de planes */}
              {plans.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Planes disponibles</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {plans.map((plan) => {
                      const isCurrent = plan.slug === tenant.plan_slug;
                      const isBusiness = plan.slug === 'business';
                      return (
                        <div
                          key={plan.id}
                          className="border rounded-xl p-5 transition-all"
                          style={isCurrent
                            ? { borderColor: 'var(--brand)', backgroundColor: 'var(--brand-soft)' }
                            : { borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${planColors[plan.slug] || planColors.free}`}>
                                  {plan.name}
                                </span>
                                {isCurrent && (
                                  <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Plan actual</span>
                                )}
                              </div>

                              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--ink)' }}>
                                {plan.price > 0
                                  ? `$${Number(plan.price).toLocaleString('es-AR')} ARS`
                                  : 'Gratis'
                                }
                                {plan.price > 0 && <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/mes</span>}
                              </p>

                              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                                {plan.features && Object.entries(plan.features).map(([key, enabled]) => (
                                  <div key={key} className={`flex items-center gap-1.5 text-xs ${enabled ? '' : 'opacity-40'}`} style={{ color: 'var(--ink)' }}>
                                    <CheckCircle size={12} className={enabled ? 'text-green-500' : 'text-gray-300'} />
                                    {featureLabels[key] || key}
                                  </div>
                                ))}
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink)' }}>
                                  <CheckCircle size={12} className="text-green-500" />
                                  {plan.max_products === null ? 'Productos ilimitados' : `${plan.max_products} productos`}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink)' }}>
                                  <CheckCircle size={12} className="text-green-500" />
                                  {plan.max_users === null ? 'Usuarios ilimitados' : `${plan.max_users} usuario${plan.max_users > 1 ? 's' : ''}`}
                                </div>
                              </div>
                            </div>

                            <div className="ml-4 flex-shrink-0">
                              {isCurrent ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-soft text-brand">
                                  <CheckCircle size={13} /> Activo
                                </span>
                              ) : plan.price > 0 ? (
                                <button
                                  onClick={() => handleCheckout(plan.id)}
                                  disabled={checkingOut === plan.id}
                                  className={`flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                                    isBusiness ? 'bg-purple-600 hover:bg-purple-700' : 'btn-primary'
                                  }`}
                                >
                                  {checkingOut === plan.id
                                    ? <><Loader2 size={14} className="animate-spin" /> Redirigiendo...</>
                                    : <><Zap size={14} /> Suscribirse</>
                                  }
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                    Los pagos son procesados de forma segura por MercadoPago. Podés cancelar en cualquier momento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
