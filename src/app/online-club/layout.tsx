
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Landmark } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useState, useEffect } from 'react';
import type { MasterPlayer } from '@/lib/types';

export default function OnlineClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            {currentUser?.isAdmin && (
                <Button asChild variant="outline" size="icon">
                    <Link href="/online-club/admin">
                        <Landmark className="h-4 w-4" />
                        <span className="sr-only">Admin Dashboard</span>
                    </Link>
                </Button>
            )}
            <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
