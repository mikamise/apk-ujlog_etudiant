'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/super-admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

