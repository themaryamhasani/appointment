'use client';

import { usePathname } from '@/i18n/routing';

export function RouteContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main key={pathname} className="route-enter flex-1">
      {children}
    </main>
  );
}
