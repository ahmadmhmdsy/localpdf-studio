import { useEffect, useState, useCallback } from 'react';

/**
 * Creates an object URL for a blob and automatically revokes it when the
 * component unmounts or the blob changes. This prevents memory leaks from
 * unrevoked object URLs.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [blob]);

  return url;
}

/**
 * Manages an object URL with manual revoke control. Useful when you need
 * to revoke the URL at a specific time (e.g., when the user clicks "start over").
 */
export function useManagedObjectUrl() {
  const [url, setUrl] = useState<string | null>(null);

  const create = useCallback((blob: Blob) => {
    // Revoke previous URL if exists
    if (url) {
      URL.revokeObjectURL(url);
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return objectUrl;
  }, [url]);

  const revoke = useCallback(() => {
    if (url) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
  }, [url]);

  // Automatically revoke on unmount
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return { url, create, revoke };
}
