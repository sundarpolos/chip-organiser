
'use client';

import { useState, useEffect, useMemo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getGameHistory, deleteGameHistory } from '@/services/game-service';
import { getClubs } from '@/services/club-service';
import { getMasterPlayers } from '@/services/player-service';
import type { GameHistory, Club, MasterPlayer, GameExpense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Plus, Edit, Trash2, Banknote, CalendarIcon, FileDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfToday, subMonths, startOfToday, endOfYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import jsPDF from "jspdf";
import "jspdf-autotable";

const DateRangePicker: FC<{
    date: DateRange | undefined,
    onDateChange: (date: DateRange | undefined) => void,
    className?: string,
}> = ({ date, onDateChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className,
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                        date.to ? (
                            <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex flex-col sm:flex-row" align="start">
                <div className="flex flex-col gap-2 border-b sm:border-r sm:border-b-0 p-2">
                    <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => { onDateChange({ from: startOfToday(), to: endOfToday() }); setIsOpen(false); }}
                    >Today</Button>
                    <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => { onDateChange({ from: startOfYesterday(), to: endOfYesterday() }); setIsOpen(false); }}
                    >Yesterday</Button>
                     <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => { onDateChange({ from: subDays(new Date(), 6), to: new Date() }); setIsOpen(false); }}
                    >Last 7 days</Button>
                     <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => { onDateChange({ from: subDays(new Date(), 29), to: new Date() }); setIsOpen(false); }}
                    >Last 30 days</Button>
                     <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => { onDateChange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); setIsOpen(false); }}
                    >This Month</Button>
                     <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => { onDateChange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }); setIsOpen(false); }}
                    >Last Month</Button>
                </div>
                <div className="flex flex-col">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onDateChange}
                        numberOfMonths={2}
                        className="hidden sm:block"
                    />
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onDateChange}
                        numberOfMonths={1}
                        className="block sm:hidden"
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}

const DailyExpensesListPage = () => {
  const { toast } = useToast();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string>('');
  const [allGames, setAllGames] = useState<GameHistory[]>([]);
  const [allPlayers, setAllPlayers] = useState<MasterPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

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
            const [clubs, games, players] = await Promise.all([getClubs(), getGameHistory(), getMasterPlayers()]);
            setAllClubs(clubs);
            setAllGames(games);
            setAllPlayers(players);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load initial data.' });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [currentUser, toast]);
  
  const accountingRecords = useMemo(() => {
      const playerMap = new Map(allPlayers.map(p => [p.id, p.name]));
      return allGames
        .filter(g => {
            if (g.clubId !== activeClubId || g.venue !== 'Daily Accounting') return false;
            const gameDate = new Date(g.timestamp);
            const from = dateRange?.from ? new Date(dateRange.from.setHours(0, 0, 0, 0)) : null;
            const to = dateRange?.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : null;
            if (from && gameDate < from) return false;
            if (to && gameDate > to) return false;
            return true;
        })
        .map(g => {
            const paidCount = g.paidPlayerIds?.length || g.players.length;
            const paidPlayerNames = (g.paidPlayerIds || g.players.map(p => p.id))
                .map(id => playerMap.get(id) || 'Unknown Player')
                .sort();
            const totalCollections = paidCount * (g.playerEntryFee || 0);
            const totalExpenses = (g.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
            return {
                id: g.id,
                date: new Date(g.timestamp),
                totalCollections,
                totalExpenses,
                cashInHand: totalCollections - totalExpenses,
                playerCount: paidCount,
                paidPlayerNames,
                expenses: g.expenses || [],
            };
        })
        .sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [allGames, allPlayers, activeClubId, dateRange]);

  const summary = useMemo(() => {
    return accountingRecords.reduce((acc, record) => {
        acc.totalCollections += record.totalCollections;
        acc.totalExpenses += record.totalExpenses;
        return acc;
    }, { totalCollections: 0, totalExpenses: 0, netProfitLoss: 0 });
  }, [accountingRecords]);

  const handleDelete = async (gameId: string) => {
    try {
      await deleteGameHistory(gameId);
      setAllGames(prev => prev.filter(g => g.id !== gameId));
      toast({ title: 'Record Deleted', description: 'The daily accounting record has been removed.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the record.' });
    }
  };

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
        const doc = new jsPDF();
        let yPos = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const clubName = allClubs.find(c => c.id === activeClubId)?.name || 'Your Club';
        const dateRangeStr = dateRange?.from
            ? `${format(dateRange.from, 'PPP')} to ${dateRange.to ? format(dateRange.to, 'PPP') : 'present'}`
            : 'All Time';

        doc.setFontSize(18);
        doc.text("Daily Accounting Log", pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
        doc.setFontSize(12);
        doc.text(`${clubName} - ${dateRangeStr}`, pageWidth / 2, yPos, { align: "center" });
        yPos += 15;
        
        const netProfit = summary.totalCollections - summary.totalExpenses;
        (doc as any).autoTable({
            startY: yPos,
            head: [['Summary for Period']],
            body: [
                [`Total Collections: + ₹${summary.totalCollections.toFixed(2)}`],
                [`Total Expenses: - ₹${summary.totalExpenses.toFixed(2)}`],
                [`Net Profit/Loss: ₹${netProfit.toFixed(2)}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], halign: 'center' },
            bodyStyles: { fontStyle: 'bold' },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
        
        accountingRecords.forEach((record) => {
            if (yPos + 80 > doc.internal.pageSize.getHeight()) { // Check for space
                 doc.addPage();
                 yPos = 15;
            }
            doc.setFontSize(14);
            doc.text(`Details for ${format(record.date, 'PPP')}`, pageWidth / 2, yPos, { align: 'center'});
            yPos += 10;

            let detailsBody: any[][] = [];
            
            // Collections from players
            detailsBody.push([{ content: 'Collections', styles: { fontStyle: 'bold' } }, `+ ₹${record.totalCollections.toFixed(2)}`]);
            if(record.paidPlayerNames && record.paidPlayerNames.length > 0) {
              detailsBody.push([`Paid Players (${record.playerCount}): ${record.paidPlayerNames.join(', ')}`, '']);
            }
            
            // Expenses
            if (record.expenses.length > 0) {
              detailsBody.push([{ content: 'Expenses', styles: { fontStyle: 'bold' } }, `- ₹${record.totalExpenses.toFixed(2)}`]);
              record.expenses.forEach(exp => {
                if (exp.name && exp.amount > 0) detailsBody.push([`  - ${exp.name}`, `- ₹${exp.amount.toFixed(2)}`])
              });
            }
            
            (doc as any).autoTable({
                startY: yPos,
                body: detailsBody,
                theme: 'grid',
                tableWidth: 'auto',
                columnStyles: { 0: { cellWidth: 'auto'}, 1: { halign: 'right' } },
                didParseCell: function (data: any) {
                    if (data.cell.section === 'body') {
                        if (data.cell.text[0].includes('+')) data.cell.styles.textColor = [0, 128, 0]; // Green
                        if (data.cell.text[0].includes('-')) data.cell.styles.textColor = [255, 0, 0]; // Red
                        // Make player list cell smaller font
                        if (data.cell.text[0].startsWith('Paid Players')) {
                            data.cell.styles.fontSize = 8;
                            data.cell.styles.textColor = [100, 100, 100];
                        }
                    }
                },
                foot: [[
                    { content: 'Cash in Hand', styles: { fontStyle: 'bold' } },
                    { content: `₹${record.cashInHand.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
                ]]
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        });

        doc.save(`daily_log_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast({ title: 'PDF Exported', description: 'Your accounting log has been successfully exported.' });

    } catch (error) {
        console.error("PDF export failed:", error);
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not generate the PDF.' });
    } finally {
        setIsExporting(false);
    }
  };

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
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href={`/expenses/${format(new Date(), 'yyyy-MM-dd')}`}>
                            <Plus className="mr-2 h-4 w-4" /> New Daily Entry
                        </Link>
                    </Button>
                     <Button variant="outline" onClick={handleExportPdf} disabled={isExporting || accountingRecords.length === 0}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Export PDF
                    </Button>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {isSuperAdmin && (
                    <div className="max-w-sm">
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
                 <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            </div>
        </CardHeader>
        <CardContent>
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
                            <TableCell colSpan={5} className="h-24 text-center">No accounting records found for this club in the selected date range.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                {accountingRecords.length > 0 && (
                    <TableFooter>
                        <TableRow className="font-bold text-base bg-muted hover:bg-muted">
                            <TableCell>Summary for Period</TableCell>
                            <TableCell className="text-green-600 font-mono">+ ₹{summary.totalCollections.toFixed(2)}</TableCell>
                            <TableCell className="text-red-600 font-mono">- ₹{summary.totalExpenses.toFixed(2)}</TableCell>
                            <TableCell 
                                colSpan={2}
                                className={cn("font-mono", (summary.totalCollections - summary.totalExpenses) >= 0 ? 'text-green-700' : 'text-red-700')}
                            >
                                ₹{(summary.totalCollections - summary.totalExpenses).toFixed(2)} (Net)
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyExpensesListPage;
