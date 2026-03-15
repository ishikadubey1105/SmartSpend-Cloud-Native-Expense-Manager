/**
 * Premium skeleton loading components for SmartSpend.
 * Used as fallback for React.lazy code-split pages.
 */

export function SkeletonLine({ width = '100%', height = 14 }) {
    return (
        <div
            className="skeleton-shimmer"
            style={{ width, height, borderRadius: 6, flexShrink: 0 }}
        />
    );
}

export function SkeletonCard({ lines = 3, style }) {
    return (
        <div className="skeleton-card" style={style}>
            <SkeletonLine width="40%" height={18} />
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonLine key={i} width={i === lines - 1 ? '60%' : '100%'} />
            ))}
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div style={{ padding: 'var(--space-8)' }}>
            <SkeletonLine width="220px" height={28} />
            <div style={{ marginTop: 8 }}>
                <SkeletonLine width="320px" height={14} />
            </div>
            <div className="grid-4" style={{ marginTop: 'var(--space-8)' }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
            <div className="grid-2" style={{ marginTop: 'var(--space-6)' }}>
                <SkeletonCard lines={5} style={{ minHeight: 200 }} />
                <SkeletonCard lines={5} style={{ minHeight: 200 }} />
            </div>
        </div>
    );
}

export default PageSkeleton;
