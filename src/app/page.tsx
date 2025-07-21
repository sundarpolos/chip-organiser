'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client side
    const user = localStorage.getItem('chip-maestro-user');
    if (user) {
      // If user is logged in, redirect to the dashboard
      router.replace('/dashboard');
    } else {
      // If user is not logged in, redirect to the login page
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Your Experience...</p>
      </div>
    </div>
  );
}
