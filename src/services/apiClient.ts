export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export async function parseJsonResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  if (res.status === 401) {
    if (window.location.pathname !== '/login') {
      localStorage.removeItem('astrologerAccessToken');
      localStorage.removeItem('astrologerRefreshToken');
      localStorage.removeItem('astrologer');
      window.location.href = '/login';
    }
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Unauthorized: Session expired');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed with status ${res.status}`);
  }
  return data as ApiEnvelope<T>;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
