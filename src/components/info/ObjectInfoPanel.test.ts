import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pittsburgh1892 } from '../../data/worlds/pittsburgh-1892';
import { ObjectInfoPanel } from './ObjectInfoPanel';

describe('object field notes', () => {
  it('displays source links and the authored distinction between documented and inferred details', () => {
    const markup = renderToStaticMarkup(
      createElement(ObjectInfoPanel, {
        object: {
          ...pittsburgh1892.objects[0],
          confidence: 'Plan documented; color inferred.',
          sources: [
            {
              id: 'museum-record',
              title: 'Museum record',
              url: 'https://example.org/object',
            },
          ],
        },
        onClose: () => {},
      }),
    );
    expect(markup).toContain('Reconstruction confidence');
    expect(markup).toContain('Plan documented; color inferred.');
    expect(markup).toContain('href="https://example.org/object"');
    expect(markup).toContain('Museum record');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).not.toContain('Illustrative demo content');
  });

  it('keeps legacy field notes readable when confidence and sources are absent', () => {
    const markup = renderToStaticMarkup(
      createElement(ObjectInfoPanel, {
        object: pittsburgh1892.objects[0],
        onClose: () => {},
      }),
    );
    expect(markup).toContain(pittsburgh1892.objects[0].name);
    expect(markup).toContain('Illustrative demo content');
    expect(markup).toContain('Close object information');
    expect(markup).not.toContain('<h3>Sources</h3>');
  });
});
