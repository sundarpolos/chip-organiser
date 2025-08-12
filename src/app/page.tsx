
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Users, BarChart, FileDown, Upload, Crown, Server, Bot, Feather } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

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
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Anomaly Detection',
    description: "Analyze a player's buy-in patterns against their history to detect unusual activity.",
  },
  {
    icon: <Upload className="h-8 w-8 text-primary" />,
    title: 'Effortless Game Import',
    description: 'Got a game log from another app? Our AI will parse it to create a complete game history.',
  },
];

const techStack = [
    { icon: <Feather className="h-8 w-8 text-primary" />, name: 'Next.js & React', description: 'For a fast, modern, and server-rendered user experience.' },
    { icon: <Server className="h-8 w-8 text-primary" />, name: 'Firebase', description: 'Powers our real-time database, ensuring all data is synced instantly.' },
    { icon: <Bot className="h-8 w-8 text-primary" />, name: 'Genkit', description: 'Drives all our cutting-edge AI features, from game import to anomaly detection.'},
    { icon: <Feather className="h-8 w-8 text-primary" />, name: 'ShadCN & Tailwind', description: 'Create a beautiful, responsive, and consistent design system.' },
]

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('chip-maestro-user');
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4 md:px-6 lg:px-8">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Crown className="h-6 w-6 text-primary" />
            <span className="font-bold">Chip Maestro</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                    <Link href="/contact">Contact</Link>
                </Button>
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
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-24 md:py-32 lg:py-40">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-4xl text-center space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                        The Ultimate Platform for
                        <span className="mt-2 block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                            Poker Club Management
                        </span>
                    </h1>
                    <p className="text-lg text-muted-foreground md:text-xl">
                        From buy-ins to payouts, Chip Maestro handles it all. Focus on the game, not the paperwork.
                        Our all-in-one SaaS solution brings real-time tracking, secure transactions, and AI-powered insights to your poker club.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href={isLoggedIn ? "/dashboard" : "/login"}>
                                {isLoggedIn ? "Go to Dashboard" : "Get Started Now"}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need, Nothing You Don't
              </h2>
              <p className="text-muted-foreground md:text-lg">
                Chip Maestro is packed with features designed to make running your poker club effortless and secure.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon, title, description }) => (
                <Card key={title} className="bg-background/80 backdrop-blur">
                  <CardHeader className="flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-primary/10 p-3">{icon}</div>
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-muted-foreground">
                    {description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* In-Depth Features Section */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 md:px-6 space-y-16">
                 <div className="mx-auto max-w-4xl space-y-4 text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Features In-Depth</h2>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Real-Time Sync & Calculations</h3>
                        <p className="text-muted-foreground">
                            Powered by Firebase Firestore, every buy-in, chip update, and player action is synced across all devices in real-time. The dashboard instantly recalculates profit and loss, so everyone at the table has a live view of the standings without any manual effort.
                        </p>
                    </div>
                    <div>
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <BarChart className="h-24 w-24 text-primary/50" />
                        </div>
                    </div>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-12 items-center">
                     <div className="order-2 md:order-1">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <Bot className="h-24 w-24 text-primary/50" />
                        </div>
                    </div>
                    <div className="order-1 md:order-2">
                        <h3 className="text-2xl font-bold mb-2">Advanced AI Tools</h3>
                        <p className="text-muted-foreground">
                           Leveraging Google's Genkit, Chip Maestro brings cutting-edge AI to your poker game. Automatically import game data from raw text logs, or use our Anomaly Detection to analyze player buy-in patterns against their history, helping to flag suspicious activity and ensure game integrity.
                        </p>
                    </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Secure & Automated Settlements</h3>
                        <p className="text-muted-foreground">
                            End-of-game payouts are calculated automatically. Our system determines the most efficient set of transactions required to settle all debts, minimizing the number of cash exchanges. Admins can send these settlement details to all players via WhatsApp with a single click.
                        </p>
                    </div>
                    <div>
                         <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <ShieldAlert className="h-24 w-24 text-primary/50" />
                        </div>
                    </div>
                 </div>
            </div>
        </section>
        
        {/* Tech Stack Section */}
        <section className="py-16 sm:py-24 bg-secondary/50">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-4xl space-y-4 text-center">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Built With Modern Technology
                  </h2>
                  <p className="text-muted-foreground md:text-lg">
                    Chip Maestro is built on a robust, scalable, and modern tech stack to deliver a seamless experience.
                  </p>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-2">
                    {techStack.map(tech => (
                        <div key={tech.name} className="flex items-start gap-4">
                            <div className="rounded-full bg-primary/10 p-3">{tech.icon}</div>
                            <div>
                                <h3 className="text-lg font-bold">{tech.name}</h3>
                                <p className="text-muted-foreground">{tech.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Chip Maestro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
