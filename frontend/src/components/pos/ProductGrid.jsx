import ProductCard from './ProductCard.jsx';

function SkeletonCard() {
  return (
    <div className="card p-3 overflow-hidden relative">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="rounded-lg h-28 bg-gray-200 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

export default function ProductGrid({ products, onAdd, loading }) {
  if (loading) {
    return (
      <div className="h-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 overflow-y-auto content-start">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
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
    <div className="h-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 overflow-y-auto content-start">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  );
}
