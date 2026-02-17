const host = typeof window !== 'undefined' ? window.location.hostname : '';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const localBase = `${protocol}//${host}/StoreMenu/backend`;

export const API_BASE =
  host === 'localhost' || host === '127.0.0.1' ? localBase : '/StoreMenu/backend';