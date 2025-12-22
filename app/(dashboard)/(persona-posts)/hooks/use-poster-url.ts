/**
 * Hook to get pre-signed poster URL from path
 */

import { useState, useEffect } from "react";

/**
 * 根据 posterPath 获取预签名 URL
 */
export function usePosterUrl(posterPath: string | null | undefined): {
  url: string | null;
  loading: boolean;
  error: Error | null;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!posterPath) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchSignedUrl() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/persona-post-poster?path=${encodeURIComponent(posterPath)}`
        );

        if (cancelled) return;

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "获取预签名 URL 失败");
        }

        const data = await response.json();
        if (data.ok && data.url) {
          setUrl(data.url);
        } else {
          throw new Error(data.message || "获取预签名 URL 失败");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("未知错误"));
          console.error("[usePosterUrl] failed to fetch signed URL:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [posterPath]);

  return { url, loading, error };
}

