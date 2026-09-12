import type { ReactNode } from 'react';

export function WorldViewport({ children }: { children: ReactNode }) {
  return <div className="world-viewport">{children}</div>;
}
