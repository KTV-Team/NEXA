import { useEffect, useState } from 'react';

export function useDelayedLoading(loading: boolean, delayMs = 150): boolean {
  const [previousLoading, setPreviousLoading] = useState(loading);
  const [visible, setVisible] = useState(false);

  if (loading !== previousLoading) {
    setPreviousLoading(loading);
    setVisible(false);
  }

  useEffect(() => {
    if (!loading) return;

    const timeout = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, loading]);

  return loading && visible;
}
