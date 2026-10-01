import { afterEach, describe, expect, it } from 'vitest';
import { mountAffiliateLink, VIDEOGEN_AFFILIATE } from '../src/affiliate_links.js';

const originalDocument = globalThis.document;

function createElementStub(tagName) {
  return {
    tagName,
    dataset: {},
    className: '',
    textContent: '',
    children: [],
    replaceChildren() { this.children = []; },
    append(...children) { this.children.push(...children); }
  };
}

afterEach(() => {
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
});

describe('VideoGen affiliate placement', () => {
  it('mounts only a disclosed, explicitly clicked, safe external link', () => {
    globalThis.document = { createElement: createElementStub };
    const container = {
      hidden: true,
      children: [],
      replaceChildren() { this.children = []; },
      append(...children) { this.children.push(...children); }
    };

    const anchor = mountAffiliateLink(container);
    expect(VIDEOGEN_AFFILIATE.url)
      .toBe('https://videogen.io/ai-video-generator?fp_ref=amey-ff39df');
    expect(anchor).toMatchObject({
      tagName: 'a',
      href: VIDEOGEN_AFFILIATE.url,
      target: '_blank',
      rel: 'sponsored noopener noreferrer',
      referrerPolicy: 'no-referrer',
      textContent: VIDEOGEN_AFFILIATE.label
    });
    expect(container.hidden).toBe(false);
    expect(container.children[1].textContent)
      .toBe('Affiliate link — we may earn a commission at no extra cost to you.');
  });

  it('removes the placement through the one centralized enabled flag', () => {
    globalThis.document = { createElement: createElementStub };
    const container = {
      hidden: false,
      children: [{}],
      replaceChildren() { this.children = []; },
      append(...children) { this.children.push(...children); }
    };

    expect(mountAffiliateLink(container, { ...VIDEOGEN_AFFILIATE, enabled: false })).toBeNull();
    expect(container.hidden).toBe(true);
    expect(container.children).toEqual([]);
  });
});
