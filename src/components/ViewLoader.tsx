// ============================================================
// VIEW LOADER - Wrapper Suspense avec skeleton
// ============================================================
// Utilisation : <ViewLoader><LazyXxxView /></ViewLoader>
// ============================================================

import { Suspense, ReactNode } from 'react';

interface ViewLoaderProps {
  children: ReactNode;
  variant?: 'default' | 'list' | 'kpi' | 'form';
}

export const ViewLoader = ({ children, variant = 'default' }: ViewLoaderProps) => {
  return <Suspense fallback={<ViewSkeleton variant={variant} />}>{children}</Suspense>;
};

// ============================================================
// SKELETON
// ============================================================

const ViewSkeleton = ({ variant }: { variant: 'default' | 'list' | 'kpi' | 'form' }) => {
  return (
    <div className="p-4 sm:p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-[#1E2E45]" />
          <div className="h-3 w-72 rounded bg-[#1E2E45]/60" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-[#1E2E45]" />
      </div>
      {variant === 'kpi' && <KPISkeleton />}
      {variant === 'list' && <ListSkeleton />}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'default' && <DefaultSkeleton />}
    </div>
  );
};

const KPISkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="p-4 rounded-2xl bg-[#162133] border border-[#2A3447]">
        <div className="h-3 w-24 rounded bg-[#1E2E45] mb-3" />
        <div className="h-8 w-32 rounded bg-[#1E2E45] mb-2" />
        <div className="h-2 w-20 rounded bg-[#1E2E45]/60" />
      </div>
    ))}
  </div>
);

const ListSkeleton = () => (
  <div className="rounded-2xl bg-[#162133] border border-[#2A3447] overflow-hidden">
    <div className="p-3 border-b border-[#2A3447] flex gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-3 flex-1 rounded bg-[#1E2E45]" />
      ))}
    </div>
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="p-3 border-b border-[#2A3447] last:border-0 flex gap-3">
        {[1, 2, 3, 4].map((j) => (
          <div key={j} className="h-3 flex-1 rounded bg-[#1E2E45]/60" />
        ))}
      </div>
    ))}
  </div>
);

const FormSkeleton = () => (
  <div className="max-w-2xl space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="space-y-2">
        <div className="h-3 w-32 rounded bg-[#1E2E45]" />
        <div className="h-10 w-full rounded-xl bg-[#162133] border border-[#2A3447]" />
      </div>
    ))}
    <div className="h-10 w-40 rounded-xl bg-[#1E2E45]" />
  </div>
);

const DefaultSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-5 rounded-2xl bg-[#162133] border border-[#2A3447] space-y-3">
        <div className="h-4 w-32 rounded bg-[#1E2E45]" />
        <div className="h-3 w-full rounded bg-[#1E2E45]/60" />
        <div className="h-3 w-3/4 rounded bg-[#1E2E45]/60" />
        <div className="h-3 w-1/2 rounded bg-[#1E2E45]/60" />
      </div>
    ))}
  </div>
);