'use client';

export function BackendUnavailable({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
      <h1 className="font-semibold text-red-800 dark:text-red-300">The dashboard cannot load its data</h1>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">{message}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Start it with <code className="font-mono">cd backend && npm run start:dev</code>, then try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
      >
        Try again
      </button>
    </div>
  );
}
