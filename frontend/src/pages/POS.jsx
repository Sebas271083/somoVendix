import { useState, useEffect, useCallback } from 'react';
import { Search, Scan, Filter, Bell } from 'lucide-react';
import { productsApi, categoriesApi } from '../services/api.js';
import { useCart } from '../context/CartContext.jsx';
import CategoryFilter from '../components/pos/CategoryFilter.jsx';
import ProductGrid from '../components/pos/ProductGrid.jsx';
import Cart from '../components/pos/Cart.jsx';
import toast from 'react-hot-toast';

export default function POS() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const handleScannerInput = (e) => {
    if (e.key === 'Enter' && search.length > 3) {
      productsApi.getByCode(search)
        .then((p) => { addItem(p); setSearch(''); toast.success(`${p.name} agregado`); })
        .catch(() => toast.error('Producto no encontrado'));
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-5 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Punto de venta</h1>
              <p className="text-xs text-gray-400">Lista de precios 1</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative text-gray-500 hover:text-gray-700">
                <Bell size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleScannerInput}
                placeholder="Buscar productos, clientes, ventas..."
                className="input pl-9 pr-4"
              />
            </div>
            <button className="btn-secondary px-3" title="Escáner">
              <Scan size={16} />
            </button>
            <button className="btn-secondary px-3" title="Filtros">
              <Filter size={16} />
            </button>
          </div>

          {/* Category filter */}
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid
            products={products}
            onAdd={(p) => { addItem(p); toast.success(`${p.name} agregado`, { duration: 1200 }); }}
            loading={loading}
          />
        </div>
      </div>

      {/* Right: cart */}
      <Cart />
    </div>
  );
}
