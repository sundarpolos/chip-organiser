
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Users, BarChart, FileDown, Upload, Crown } from 'lucide-react';

const features = [
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Dynamic Player Management',
    description: 'Easily add, remove, and manage roles for players within your club in real-time.',
  },
  {
    icon: <ShieldAlert className="h-8 w-8 text-primary" />,
    title: 'Secure Buy-in Workflow',
    description: 'Admins and Bankers get instant notifications to approve player buy-in requests securely.',
  },
  {
    icon: <BarChart className="h-8 w-8 text-primary" />,
    title: 'Real-Time Calculations',
    description: 'All buy-ins, chip counts, and profit/loss values are calculated and updated live for all participants.',
  },
  {
    icon: <FileDown className="h-8 w-8 text-primary" />,
    title: 'Automated Settlement & Reporting',
    description: 'Automatically calculate the most efficient money transfers and generate detailed PDF reports.',
  },
  {
    icon: <Crown className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Anomaly Detection',
    description: "Analyze a player's buy-in patterns against their history to detect unusual activity.",
  },
  {
    icon: <Upload className="h-8 w-8 text-primary" />,
    title: 'Effortless Game Import',
    description: 'Got a game log from another app? Our AI will parse it to create a complete game history.',
  },
];

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('chip-maestro-user');
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Crown className="h-6 w-6" />
            <span className="font-bold">Chip Maestro</span>
          </Link>
          <div className="flex flex-1 items-center justify-end">
            <nav className="flex items-center space-x-2">
              {isLoggedIn ? (
                <Button asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/login">Login</Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container flex flex-col items-center justify-center text-center py-20 md:py-32">
          <div className="space-y-6 max-w-4xl">
            <div className="text-5xl md:text-6xl font-bold">
              <h1 className="inline">
                <span className="inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
                  Manage
                </span>{" "}
                Your Poker Club
              </h1>{" "}
              Like a Pro
            </div>

            <p className="text-xl text-muted-foreground md:w-10/12 mx-auto">
              The ultimate all-in-one SaaS solution for managing poker clubs of any size. Say goodbye to messy spreadsheets and complicated payout calculations.
            </p>

            <div className="space-y-4 md:space-y-0 md:space-x-4">
              <Button className="w-full md:w-1/3" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-24 sm:py-32 space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold md:text-center">
            Many{" "}
            <span className="inline bg-gradient-to-r from-[#61DAFB] to-[#1d6fa5] text-transparent bg-clip-text">
              Features
            </span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon, title, description }) => (
              <Card key={title}>
                <CardHeader className="flex items-center">
                  {icon}
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>{description}</CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-8 border-t">
        <div className="container text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} Chip Maestro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
