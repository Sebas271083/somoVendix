import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ScanLine, Maximize2, Minimize2, RotateCcw, CheckCircle2, HelpCircle, X, Package, ShoppingCart as CartIcon } from 'lucide-react';
import { productsApi, categoriesApi } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import CategoryFilter from '../components/pos/CategoryFilter.jsx';
import ProductGrid from '../components/pos/ProductGrid.jsx';
import Cart from '../components/pos/Cart.jsx';
import ReturnModal from '../components/pos/ReturnModal.jsx';
import VariantPicker from '../components/pos/VariantPicker.jsx';
import toast from 'react-hot-toast';

export default function POS() {
  const { addItem, itemCount } = useCart();
  const [mobileTab, setMobileTab] = useState('products'); // 'products' | 'cart'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pickingVariant, setPickingVariant] = useState(null);
  const searchRef = useRef(null);
  const scanStartTime = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        productsApi.list({ category_id: selectedCategory, search, active: true }),
        categories.length ? Promise.resolve(categories) : categoriesApi.list(),
      ]);
      setProducts(prods);
      if (!categories.length) setCategories(cats);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    const t = setTimeout(loadData, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadData]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Auto-focus al cargar
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Atajos de teclado
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp((v) => !v);
      }
      if (e.key === 'Escape') setShowHelp(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Rastrear velocidad de escritura para detectar scanner
  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (!search && val) scanStartTime.current = Date.now();
    setSearch(val);
  };

  const handleScannerInput = (e) => {
    if (e.key !== 'Enter' || !search.trim()) return;

    const elapsed = Date.now() - (scanStartTime.current ?? Date.now());
    const looksLikeCode = elapsed < 300 || !/\s/.test(search.trim());

    setScanning(true);
    productsApi.getByCode(search.trim())
      .then((p) => {
        addItem(p);
        setSearch('');
        searchRef.current?.focus();
        toast(`${p.name}`, {
          icon: <CheckCircle2 size={16} className="text-green-500" />,
          duration: 1500,
          style: { fontSize: '13px' },
        });
      })
      .catch(() => {
        if (looksLikeCode) toast.error(`Código "${search.trim()}" no encontrado`);
      })
      .finally(() => setScanning(false));
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Left: products — hidden on mobile when cart tab is active */}
      <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="border-b px-5 pt-4 pb-3" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Punto de venta</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>F2 buscar · F8 cobrar · F9 nuevo ticket</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowReturn(true)}
                title="Registrar devolución"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
                style={{ color: '#f97316', backgroundColor: '#fff7ed' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffedd5'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff7ed'}
              >
                <RotateCcw size={13} />
                Devolución
              </button>
              <button
                onClick={() => setShowHelp(true)}
                title="Atajos de teclado"
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                <HelpCircle size={17} />
              </button>
              <button
                onClick={toggleFullscreen}
                title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            </div>
          </div>

          {/* Search / Barcode */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              {scanning
                ? <ScanLine size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-pulse" style={{ color: 'var(--brand)' }} />
                : <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              }
              <input
                ref={searchRef}
                id="pos-search"
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleScannerInput}
                placeholder="Buscar producto o escanear código..."
                className={`input pl-10 pr-4 transition-all ${scanning ? 'ring-2' : ''}`}
                style={scanning ? { '--tw-ring-color': 'var(--brand)', borderColor: 'var(--brand)' } : {}}
                autoComplete="off"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => { searchRef.current?.focus(); searchRef.current?.select(); }}
              className="btn-secondary px-3.5"
              title="Clic para enfocar escáner (F2)"
            >
              <ScanLine size={16} />
            </button>
          </div>

          {/* Category filter */}
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* Product grid — pb-16 en mobile para el tab bar */}
        <div className="flex-1 overflow-hidden pb-16 md:pb-0">
          <ProductGrid
            products={products}
            onAdd={(p) => {
              if (p.has_variants && !p._variant_id) {
                setPickingVariant(p);
              } else {
                addItem(p);
                toast.success(`${p.name} agregado`, { duration: 1200 });
              }
            }}
            loading={loading}
          />
        </div>
      </div>

      {/* Right: cart — hidden on mobile when products tab is active */}
      <div className={`${mobileTab === 'products' ? 'hidden md:block' : 'block w-full md:w-auto'}`}>
        <Cart />
      </div>

      {showReturn && (
        <ReturnModal
          onClose={() => setShowReturn(false)}
          onSuccess={() => {}}
        />
      )}

      {pickingVariant && (
        <VariantPicker
          product={pickingVariant}
          onSelect={(variantProduct) => {
            addItem(variantProduct);
            toast.success(`${variantProduct.name} agregado`, { duration: 1200 });
          }}
          onClose={() => setPickingVariant(null)}
        />
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowHelp(false)}>
          <div className="rounded-2xl shadow-xl w-80 p-6" style={{ backgroundColor: 'var(--surface)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Atajos de teclado</h2>
              <button onClick={() => setShowHelp(false)} style={{ color: 'var(--muted)' }} className="hover:opacity-70">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['F1', 'Abrir / cerrar esta ayuda'],
                ['F2', 'Enfocar búsqueda / escáner'],
                ['F8', 'Cobrar ticket actual'],
                ['F9', 'Nuevo ticket'],
                ['Enter', 'Agregar código escaneado al carrito'],
                ['Esc', 'Cerrar modal activo'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="min-w-[2.5rem] text-center px-2 py-0.5 rounded text-xs font-mono font-semibold"
                       style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                    {key}
                  </kbd>
                  <span style={{ color: 'var(--muted)' }}>{desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px]" style={{ color: 'var(--muted)' }}>Presioná Esc o hacé clic fuera para cerrar</p>
          </div>
        </div>
      )}

      {/* ── Mobile tab bar ─────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex safe-area-pb"
           style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setMobileTab('products')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors"
          style={{ color: mobileTab === 'products' ? 'var(--brand)' : 'var(--muted)' }}
        >
          <Package size={22} />
          Productos
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors relative"
          style={{ color: mobileTab === 'cart' ? 'var(--brand)' : 'var(--muted)' }}
        >
          <span className="relative">
            <CartIcon size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
                    style={{ backgroundColor: 'var(--brand)' }}>
                {itemCount}
              </span>
            )}
          </span>
          Ticket
        </button>
      </div>
    </div>
  );
}
