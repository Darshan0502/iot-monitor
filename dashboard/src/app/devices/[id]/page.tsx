import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { BackendUnavailable } from '@/components/backend-unavailable';
import { DeviceDetail } from '@/components/device-detail';
import { ApiError, type DeviceData, loadDevice } from '@/lib/api';

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  let data: DeviceData;
  try {
    data = await loadDevice(id);
  } catch (error) {
    // 400 is an id that is not a UUID, 404 a device that does not exist (or was deleted).
    if (error instanceof ApiError && (error.status === 400 || error.status === 404)) notFound();
    return <BackendUnavailable message={error instanceof Error ? error.message : String(error)} />;
  }
  return <DeviceDetail initial={data} />;
}
