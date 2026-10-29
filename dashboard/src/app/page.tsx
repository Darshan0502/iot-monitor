import { connection } from 'next/server';
import { BackendUnavailable } from '@/components/backend-unavailable';
import { Overview } from '@/components/overview';
import { loadOverview, type OverviewData } from '@/lib/api';

export default async function OverviewPage() {
  // The readings change all the time, so the page is rendered for every request, never once at build time.
  await connection();

  let data: OverviewData;
  try {
    data = await loadOverview();
  } catch (error) {
    return <BackendUnavailable message={error instanceof Error ? error.message : String(error)} />;
  }
  return <Overview initial={data} />;
}
