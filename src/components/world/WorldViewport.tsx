import type { ReactNode } from 'react';

export interface WorldPresentation {
  layout: 'standard' | 'immersive';
  informationOpen: boolean;
}

/** The renderer measures this unobstructed region; controls occupy separate grid tracks. */
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
