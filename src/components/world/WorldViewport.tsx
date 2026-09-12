import type { ReactNode } from 'react';

export interface WorldPresentation {
  layout: 'standard' | 'immersive' | 'city';
  informationOpen: boolean;
}

/** Legacy layouts reserve grid space; city presentations use a full viewport canvas. */
export function WorldViewport({
  layout,
  informationOpen,
  children,
}: WorldPresentation & { children: ReactNode }) {
  return (
    <div
      className="world-viewport"
      data-layout={layout}
      data-information={informationOpen ? 'open' : 'closed'}
    >
      {children}
    </div>
  );
}
