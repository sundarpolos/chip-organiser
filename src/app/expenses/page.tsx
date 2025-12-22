
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getGameHistory, deleteGameHistory } from '@/services/game-service';
import { getClubs } from '@/services/club-service';
import type { GameHistory, Club, MasterPlayer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Plus, Edit, Trash2, Banknote, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const DailyExpensesListPage = () => {
  const { toast } = useToast();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string>('');
  const [allGames, setAllGames] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateForNewEntry, setDateForNewEntry] = useState<Date | undefined>(new Date());

  const isSuperAdmin = useMemo(() => currentUser?.whatsappNumber === '919843350000', [currentUser]);

  // Initial data loading
  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    const clubId = localStorage.getItem('chip-maestro-clubId');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (!user.isAdmin) {
        toast({ variant: 'destructive', title: 'Access Denied' });
        router.push('/dashboard');
        return;
      }
      setActiveClubId(clubId || '');
    } else {
      router.push('/login');
    }
  }, [router, toast]);
  
  useEffect(() => {
    async function loadData() {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const [clubs, games] = await Promise.all([getClubs(), getGameHistory()]);
            setAllClubs(clubs);
            setAllGames(games);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load initial data.' });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [currentUser, toast]);
  
  const accountingRecords = useMemo(() => {
      return allGames
        .filter(g => g.clubId === activeClubId && g.venue === 'Daily Accounting')
        .map(g => {
            const paidCount = g.paidPlayerIds?.length || g.players.length;
            const totalCollections = paidCount * (g.playerEntryFee || 0);
            const totalExpenses = (g.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
            return {
                id: g.id,
                date: new Date(g.timestamp),
                totalCollections,
                totalExpenses,
                cashInHand: totalCollections - totalExpenses,
            };
        })
        .sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [allGames, activeClubId]);

  const handleDelete = async (gameId: string) => {
    try {
      await deleteGameHistory(gameId);
      setAllGames(prev => prev.filter(g => g.id !== gameId));
      toast({ title: 'Record Deleted', description: 'The daily accounting record has been removed.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the record.' });
    }
  };

  const handleDateSelectForNewEntry = (date: Date | undefined) => {
    if (date) {
      setDateForNewEntry(date);
      router.push(`/expenses/${format(date, 'yyyy-MM-dd')}`);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><Banknote /> Daily Accounting Log</CardTitle>
                  <CardDescription>View and manage historical daily financial records for your club.</CardDescription>
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                       <Button>
                         <Plus className="mr-2 h-4 w-4" /> New Daily Entry
                       </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dateForNewEntry}
                            onSelect={handleDateSelectForNewEntry}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
            {isSuperAdmin && (
                <div className="mb-4 max-w-sm">
                    <Select value={activeClubId} onValueChange={setActiveClubId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allClubs.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Total Collections</TableHead>
                        <TableHead>Total Expenses</TableHead>
                        <TableHead>Cash in Hand</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accountingRecords.map(record => (
                        <TableRow key={record.id}>
                            <TableCell className="font-medium">{format(record.date, 'PPP')}</TableCell>
                            <TableCell className="text-green-600 font-mono">+ ₹{record.totalCollections.toFixed(2)}</TableCell>
                            <TableCell className="text-red-600 font-mono">- ₹{record.totalExpenses.toFixed(2)}</TableCell>
                            <TableCell className="font-bold font-mono">₹{record.cashInHand.toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button asChild size="sm" variant="outline">
                                    <Link href={`/expenses/${format(record.date, 'yyyy-MM-dd')}`}>
                                        <Edit className="mr-2 h-4 w-4"/> Edit
                                    </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">
                                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the financial record for {format(record.date, 'PPP')}. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(record.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                     {accountingRecords.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">No accounting records found for this club.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyExpensesListPage;
