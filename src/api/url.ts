export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || '/api';
}

export function buildApiUrl(path: string, baseUrl = getApiBaseUrl()): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (baseUrl.startsWith('http')) {
    return `${baseUrl.replace(/\/$/, '')}${normalizedPath}`;
  }
  return `${baseUrl.replace(/\/$/, '')}${normalizedPath}`;
}
