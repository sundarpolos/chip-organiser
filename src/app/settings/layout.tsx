
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Club Selection
          </Link>
        </Button>
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </div>
  );
}
