import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            <Shield size={18} className="text-[#d4a254]" />
            <span className="font-semibold">Janus</span>
          </span>
        ),
        url: '/',
      }}
      sidebar={{
        defaultOpenLevel: 1,
      }}
    >
      {children}
    </DocsLayout>
  );
}
