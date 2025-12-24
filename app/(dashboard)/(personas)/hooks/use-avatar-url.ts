/**
 * Hook to get pre-signed avatar URL from path
 */

import { useState, useEffect } from "react";

/**
 * 根据 avatarPath (objectKey) 获取预签名 URL
 */
export function useAvatarUrl(avatarPath: string | null | undefined): {
  url: string | null;
  loading: boolean;
  error: Error | null;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!avatarPath) {
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
        // avatarPath 已经通过上面的检查，不会是 null 或 undefined
        // 但 TypeScript 需要明确的类型断言
        if (!avatarPath) {
          return;
        }
        const response = await fetch(
          `/api/avatars/url?path=${encodeURIComponent(avatarPath)}`
        );

        if (cancelled) return;

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(data.message || "获取预签名 URL 失败");
        }

        const data = (await response.json()) as {
          ok?: boolean;
          url?: string;
          message?: string;
        };
        if (data.ok && data.url && typeof data.url === "string") {
          setUrl(data.url);
        } else {
          throw new Error(data.message || "获取预签名 URL 失败");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("未知错误"));
          console.error("[useAvatarUrl] failed to fetch signed URL:", err);
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
  }, [avatarPath]);

  return { url, loading, error };
}

