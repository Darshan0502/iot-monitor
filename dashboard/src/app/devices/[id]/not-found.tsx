import Link from 'next/link';

export default function DeviceNotFound() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <h1 className="font-semibold">Device not found</h1>
      <p className="mt-1 text-sm text-zinc-500">It may have been deleted.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline dark:text-sky-400">
        ← All devices
      </Link>
    </div>
  );
}
