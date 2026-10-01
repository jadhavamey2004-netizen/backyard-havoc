export const VIDEOGEN_AFFILIATE = Object.freeze({
  id: 'videogen',
  provider: 'VideoGen',
  label: 'Create your own game clips',
  url: 'https://app.videogen.io/affiliates?code=cfbff82e-d675-444b-9bbc-7e08c5847b2d',
  affiliate: true,
  disclosure: 'Affiliate link — we may earn a commission at no extra cost to you.',
  enabled: true
});

export function mountAffiliateLink(container, link = VIDEOGEN_AFFILIATE) {
  if (!container) return null;
  container.replaceChildren();
  container.hidden = !link?.enabled;
  if (!link?.enabled) return null;

  const anchor = document.createElement('a');
  anchor.className = 'affiliate-link';
  anchor.href = link.url;
  anchor.target = '_blank';
  anchor.rel = 'sponsored noopener noreferrer';
  anchor.referrerPolicy = 'no-referrer';
  anchor.textContent = link.label;
  anchor.dataset.affiliateProvider = link.provider;

  const disclosure = document.createElement('p');
  disclosure.className = 'affiliate-disclosure';
  disclosure.textContent = link.disclosure;

  container.append(anchor, disclosure);
  return anchor;
}
