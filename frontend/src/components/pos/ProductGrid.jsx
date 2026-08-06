import ProductCard, { MobileProductRow } from './ProductCard.jsx';

function SkeletonCard() {
  return (
    <div className="card p-3 overflow-hidden relative rounded-2xl">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="rounded-lg h-28 bg-gray-200 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

function MobileSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ backgroundColor: 'var(--bg)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 rounded w-2/3" style={{ backgroundColor: 'var(--bg)' }} />
        <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'var(--bg)' }} />
      </div>
      <div className="w-10 h-10 rounded-2xl flex-shrink-0" style={{ backgroundColor: 'var(--bg)' }} />
    </div>
  );
}

export default function ProductGrid({ products = [], onAdd, loading }) {
  const safeProducts = Array.isArray(products) ? products : [];

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        {/* Mobile skeleton */}
        <div className="sm:hidden flex flex-col divide-y divide-[var(--border)]">
          {Array.from({ length: 10 }).map((_, i) => <MobileSkeletonRow key={i} />)}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 p-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!safeProducts.length) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
        No se encontraron productos
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Mobile: lista horizontal (1 columna) */}
      <div className="sm:hidden flex flex-col divide-y divide-[var(--border)]">
        {safeProducts.map(p => (
          <MobileProductRow key={p.id} product={p} onAdd={onAdd} />
        ))}
      </div>

      {/* Desktop: grilla de tarjetas */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 p-3 content-start">
        {safeProducts.map(p => (
          <ProductCard key={p.id} product={p} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}
