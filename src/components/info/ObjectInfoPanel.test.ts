import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pittsburgh1892 } from '../../data/worlds/pittsburgh-1892';
import { ObjectInfoPanel } from './ObjectInfoPanel';

describe('object field notes', () => {
  it('keeps only the object name when no city is available for a Grok tour', () => {
    const object = pittsburgh1892.objects[0];
    const markup = renderToStaticMarkup(
      createElement(ObjectInfoPanel, {
        object,
        onClose: () => {},
      }),
    );
    expect(markup).toContain(object.name);
    expect(markup).toContain('Close object information');
    expect(markup).toContain('A live field note needs a city context.');
    expect(markup).not.toContain(object.description);
    expect(markup).not.toContain(object.whyItMatters);
    expect(markup).not.toContain('Why it matters');
    expect(markup).not.toContain('Reconstruction confidence');
    expect(markup).not.toContain('<h3>Sources</h3>');
    expect(markup).not.toContain('Illustrative demo content');
  });

  it('shows the Grok tour heading instead of authored copy when a city is provided', () => {
    const object = pittsburgh1892.objects[0];
    const markup = renderToStaticMarkup(
      createElement(ObjectInfoPanel, {
        object,
        cityName: 'Pittsburgh',
        year: 1892,
        onClose: () => {},
      }),
    );
    expect(markup).toContain('Grok tour · 1892');
    expect(markup).toContain('Drafting a period summary');
    expect(markup).not.toContain(object.description);
    expect(markup).not.toContain(object.whyItMatters);
    expect(markup).not.toContain('Reconstruction confidence');
    expect(markup).not.toContain('Visit / tickets');
  });
});
