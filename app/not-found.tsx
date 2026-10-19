import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm max-w-md w-full space-y-4">
        <h1 className="text-2xl font-black text-stone-900">404 - Page non trouvée</h1>
        <p className="text-xs text-stone-600">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-orange-800 text-white font-bold text-xs rounded-xl shadow-xs"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
