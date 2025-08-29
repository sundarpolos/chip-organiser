
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Users, BarChart, FileDown, Upload, Crown, Server, Bot, Feather, CheckCircle2, Club, FileText } from 'lucide-react';
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

const stats = [
    {
        icon: <Club className="h-8 w-8 text-primary" />,
        value: "100+",
        label: "Clubs Managed",
        description: "Trusted clubs are actively using our platform.",
    },
    {
        icon: <Users className="h-8 w-8 text-primary" />,
        value: "10,000+",
        label: "Players Onboarded",
        description: "A growing community of poker enthusiasts.",
    },
    {
        icon: <FileText className="h-8 w-8 text-primary" />,
        value: "1M+",
        label: "Reports Generated",
        description: "In-depth analytics over the last five years.",
    },
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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center px-4 md:px-6 lg:px-8">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Crown className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-wider">Chip Maestro</span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="hidden md:flex items-center space-x-2 text-sm">
                <Button variant="ghost" asChild>
                    <Link href="#features">Features</Link>
                </Button>
                <Button variant="ghost" asChild>
                    <Link href="#pricing">Pricing</Link>
                </Button>
                <Button variant="ghost" asChild>
                    <Link href="/contact">Contact</Link>
                </Button>
            </nav>
            <div className="flex items-center gap-2">
                 {isLoggedIn ? (
                    <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                        <Link href="/dashboard">Dashboard</Link>
                    </Button>
                ) : (
                    <Button asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                )}
                <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden">
             <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/80 to-transparent" />
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-4xl text-center space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                        The Future of Poker Club Management
                    </h1>
                    <p className="text-lg text-muted-foreground md:text-xl">
                        From buy-ins to payouts, Chip Maestro handles it all, so you can focus on the game, not the paperwork. Our premier, all-in-one SaaS solution brings your poker club into the modern age with real-time tracking of every chip, secure WhatsApp-based OTP verification for transactions, and powerful AI-driven insights to ensure fair play. Streamline your operations, enhance security, and provide an unparalleled experience for your members.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href="/contact">
                                Contact Now
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-8 md:grid-cols-3">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="border-white/10 bg-white/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                                {stat.icon}
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">{stat.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>


        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24 overflow-hidden">
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
              {features.map((feature) => (
                <Card key={feature.title} className="bg-white/5 border-white/10 h-full">
                    <CardHeader className="flex flex-col items-center text-center">
                      <div className="mb-4 rounded-full bg-primary/10 p-3">{feature.icon}</div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground">
                      {feature.description}
                    </CardContent>
                  </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-16 sm:py-24 overflow-hidden">
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

        {/* Pricing Section */}
        <section id="pricing" className="py-16 sm:py-24 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl space-y-4 text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Simple, Transparent Pricing
                </h2>
                <p className="text-muted-foreground md:text-lg">
                  One plan. All features. No hidden fees.
                </p>
              </div>

            <div className="mt-12 flex justify-center">
              <Card className="w-full max-w-md border-2 border-primary shadow-xl bg-white/5">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Club Pro</CardTitle>
                  <CardDescription>All features included for one simple price.</CardDescription>
                  <div className="my-4">
                    <span className="text-5xl font-bold">₹1999</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">Single Club Management</span>
                    </li>
                    {features.map((feature) => (
                      <li key={feature.title} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature.title}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                   <Button asChild size="lg" className="w-full">
                        <Link href="/contact">
                            Contact Now
                        </Link>
                    </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-white/10 py-6 md:py-8">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Chip Maestro. All rights reserved.</p>
          <div className="flex gap-4">
             <Link href="#features" className="hover:text-primary">Features</Link>
             <Link href="#pricing" className="hover:text-primary">Pricing</Link>
             <Link href="/contact" className="hover:text-primary">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
