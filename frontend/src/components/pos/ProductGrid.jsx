import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ products, onAdd, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-44 animate-pulse bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No se encontraron productos
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 overflow-y-auto">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  );
}
