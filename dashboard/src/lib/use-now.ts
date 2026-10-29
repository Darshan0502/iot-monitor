'use client';

import { useEffect, useState } from 'react';

// The current time, updated every second. It is null on the server and in the first render in the browser,
// because the two clocks never agree exactly and React would warn that the HTML does not match.
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
