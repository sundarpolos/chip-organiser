
'use client';

import { useState, useEffect, useMemo, useRef, type FC } from 'react';
import { getGameHistory } from '@/services/game-service';
import { getMasterPlayers } from '@/services/player-service';
import { getMasterVenues } from '@/services/venue-service';
import type { GameHistory, MasterPlayer, MasterVenue, CalculatedPlayer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, CalendarIcon, Filter, FileDown, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type AggregatedPlayerData = {
  name: string;
  gamesPlayed: number;
  totalBuyIn: number;
  totalChipReturn: number;
  totalProfitLoss: number;
  avgProfitLoss: number;
};

type AggregatedVenueData = {
  name: string;
  gamesPlayed: number;
  totalBuyIn: number;
};

type DailySummaryData = {
    date: string;
    totalBuyIn: number;
    totalChipReturn: number;
    totalProfitLoss: number;
    gamesCount: number;
}

export default function BulkReportsPage() {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  // Data state
  const [allGames, setAllGames] = useState<GameHistory[]>([]);
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Load all data on component mount
  useEffect(() => {
    async function loadAllData() {
      try {
        const [games, players, venues] = await Promise.all([
          getGameHistory(),
          getMasterPlayers(),
          getMasterVenues(),
        ]);
        setAllGames(games);
        setMasterPlayers(players);
        setMasterVenues(venues);
        // Initially, select all players and venues
        setSelectedPlayerIds(players.map(p => p.id));
        setSelectedVenueIds(venues.map(v => v.id));
      } catch (error) {
        console.error('Failed to load data for reports:', error);
        toast({
          variant: 'destructive',
          title: 'Error Loading Data',
          description: 'Could not fetch historical data. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadAllData();
  }, [toast]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    const selectedPlayerNames = masterPlayers
      .filter(p => selectedPlayerIds.includes(p.id))
      .map(p => p.name);

    const selectedVenueNames = masterVenues
      .filter(v => selectedVenueIds.includes(v.id))
      .map(v => v.name);

    const filteredGames = allGames.filter(game => {
      const gameDate = new Date(game.timestamp);
      const isDateInRange =
        dateRange?.from && dateRange?.to
          ? gameDate >= dateRange.from && gameDate <= dateRange.to
          : true;
      
      const isVenueSelected = selectedVenueNames.includes(game.venue);
      
      const hasSelectedPlayer = game.players.some(p => selectedPlayerNames.includes(p.name));

      return isDateInRange && isVenueSelected && hasSelectedPlayer;
    });

    // Aggregate player data
    const playerStats: Record<string, AggregatedPlayerData> = {};
    selectedPlayerNames.forEach(name => {
      playerStats[name] = {
        name: name,
        gamesPlayed: 0,
        totalBuyIn: 0,
        totalChipReturn: 0,
        totalProfitLoss: 0,
        avgProfitLoss: 0,
      };
    });

    filteredGames.forEach(game => {
        game.players.forEach(p => {
            if(playerStats[p.name]) {
                const totalBuyIns = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
                const profitLoss = p.finalChips - totalBuyIns;
                playerStats[p.name].gamesPlayed += 1;
                playerStats[p.name].totalBuyIn += totalBuyIns;
                playerStats[p.name].totalChipReturn += p.finalChips;
                playerStats[p.name].totalProfitLoss += profitLoss;
            }
        })
    });
    
    Object.values(playerStats).forEach(stat => {
        if(stat.gamesPlayed > 0) {
            stat.avgProfitLoss = stat.totalProfitLoss / stat.gamesPlayed;
        }
    })

    // Aggregate venue data
    const venueStats: Record<string, AggregatedVenueData> = {};
    selectedVenueNames.forEach(name => {
        venueStats[name] = {
            name,
            gamesPlayed: 0,
            totalBuyIn: 0,
        };
    });

    // Aggregate daily data
    const dailyStats: Record<string, DailySummaryData> = {};
    
    filteredGames.forEach(game => {
        if(venueStats[game.venue]) {
            venueStats[game.venue].gamesPlayed += 1;
            const gameBuyIn = game.players.reduce((sum, p) => {
                 const playerBuyIn = (p.buyIns || []).reduce((playerSum, bi) => playerSum + (bi.status === 'verified' ? bi.amount : 0), 0);
                 return sum + playerBuyIn;
            }, 0);
            venueStats[game.venue].totalBuyIn += gameBuyIn;
        }

        const gameDateKey = format(new Date(game.timestamp), 'yyyy-MM-dd');
        if (!dailyStats[gameDateKey]) {
            dailyStats[gameDateKey] = {
                date: game.timestamp,
                totalBuyIn: 0,
                totalChipReturn: 0,
                totalProfitLoss: 0,
                gamesCount: 0,
            };
        }
        
        dailyStats[gameDateKey].gamesCount += 1;
        game.players.forEach(p => {
            const playerBuyIn = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? bi.amount : 0), 0);
            const playerPL = p.finalChips - playerBuyIn;
            dailyStats[gameDateKey].totalBuyIn += playerBuyIn;
            dailyStats[gameDateKey].totalChipReturn += p.finalChips;
            dailyStats[gameDateKey].totalProfitLoss += playerPL;
        });

    });
    
    return {
      players: Object.values(playerStats).sort((a, b) => b.totalProfitLoss - a.totalProfitLoss),
      venues: Object.values(venueStats).sort((a, b) => b.gamesPlayed - a.gamesPlayed),
      daily: Object.values(dailyStats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totalGames: filteredGames.length,
    };
  }, [allGames, masterPlayers, masterVenues, selectedPlayerIds, selectedVenueIds, dateRange]);

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Bulk Game Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Filters applied: ${filteredData.totalGames} games`, 14, 22);

    // Player Performance Table
    (doc as any).autoTable({
      head: [['Player', 'Games', 'Total Buy-in', 'Total Chip Return', 'Total P/L', 'Avg P/L']],
      body: filteredData.players.map(p => [
        p.name,
        p.gamesPlayed,
        p.totalBuyIn.toFixed(0),
        p.totalChipReturn.toFixed(0),
        p.totalProfitLoss.toFixed(0),
        p.avgProfitLoss.toFixed(0),
      ]),
      startY: 30,
      headStyles: { fillColor: [22, 163, 74] },
    });
    
    // Venue Performance Table
    (doc as any).autoTable({
      head: [['Venue', 'Games Played', 'Total Pot']],
      body: filteredData.venues.map(v => [
          v.name,
          v.gamesPlayed,
          v.totalBuyIn.toFixed(0)
      ]),
      startY: (doc as any).autoTable.previous.finalY + 10,
      headStyles: { fillColor: [37, 99, 235] },
    });
    
    doc.save(`chip-maestro-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Report Exported', description: 'Your report has been downloaded as a PDF.' });
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Bulk Reports</h1>
        <div className="flex gap-2">
            <Button onClick={handleExportPdf} disabled={filteredData.totalGames === 0}><FileDown className="mr-2"/>Export PDF</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MultiSelectPopover title="Players" options={masterPlayers} selected={selectedPlayerIds} onSelectedChange={setSelectedPlayerIds}/>
            <MultiSelectPopover title="Venues" options={masterVenues} selected={selectedVenueIds} onSelectedChange={setSelectedVenueIds}/>
             <div>
                <Label>Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                        "w-full justify-start text-left font-normal mt-2",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Aggregated Player Performance</CardTitle>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredData.players} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} />
                    <YAxis />
                    <RechartsTooltip
                        content={({ payload }) => {
                            if (!payload || !payload.length) return null;
                            const data = payload[0].payload;
                            return (
                                <div className="bg-background border p-2 rounded-md shadow-lg text-sm">
                                    <p className="font-bold">{data.name}</p>
                                    <p className={data.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        Total P/L: {data.totalProfitLoss.toFixed(0)}
                                    </p>
                                    <p className="text-muted-foreground">Games: {data.gamesPlayed}</p>
                                </div>
                            );
                        }}
                    />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="totalProfitLoss" name="Total Profit/Loss">
                        {filteredData.players.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.totalProfitLoss >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <DataTable
              columns={['Player', 'Games Played', 'Total Buy-in', 'Total Chip Return', 'Total P/L', 'Avg P/L']}
              data={filteredData.players.map(p => [
                p.name,
                p.gamesPlayed,
                p.totalBuyIn.toFixed(0),
                p.totalChipReturn.toFixed(0),
                p.totalProfitLoss.toFixed(0),
                p.avgProfitLoss.toFixed(0),
              ])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aggregated Venue Performance</CardTitle>
          </CardHeader>
          <CardContent>
             <DataTable
              columns={['Venue', 'Games Played', 'Total Pot Size']}
              data={filteredData.venues.map(v => [
                v.name,
                v.gamesPlayed,
                `₹${v.totalBuyIn.toFixed(0)}`,
              ])}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={['Date', 'Games Played', 'Total Buy-in', 'Total Chip Return', 'Total P/L']}
              data={filteredData.daily.map(d => [
                format(new Date(d.date), 'dd MMMM yyyy'),
                d.gamesCount,
                (d.totalBuyIn ?? 0).toFixed(0),
                (d.totalChipReturn ?? 0).toFixed(0),
                (d.totalProfitLoss ?? 0).toFixed(0),
              ])}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


const MultiSelectPopover: FC<{
    title: string,
    options: {id: string, name: string}[],
    selected: string[],
    onSelectedChange: (selected: string[]) => void
}> = ({ title, options, selected, onSelectedChange }) => {
    
    const handleSelect = (id: string, isChecked: boolean) => {
        if(isChecked) {
            onSelectedChange([...selected, id]);
        } else {
            onSelectedChange(selected.filter(sId => sId !== id));
        }
    }
    
    const handleSelectAll = (isChecked: boolean) => {
        if(isChecked) {
            onSelectedChange(options.map(o => o.id));
        } else {
            onSelectedChange([]);
        }
    }

    return (
        <div className="space-y-2">
            <Label>{title}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                        <span className="truncate">{selected.length} of {options.length} selected</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                    <div className="p-2 border-b">
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`all-${title}`} onCheckedChange={handleSelectAll} checked={selected.length === options.length} />
                            <Label htmlFor={`all-${title}`} className="font-medium">Select All</Label>
                        </div>
                    </div>
                    <ScrollArea className="h-48">
                        <div className="p-2 space-y-1">
                        {options.map(option => (
                            <div key={option.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`${title}-${option.id}`}
                                    onCheckedChange={(checked) => handleSelect(option.id, !!checked)}
                                    checked={selected.includes(option.id)}
                                />
                                <Label htmlFor={`${title}-${option.id}`} className="truncate font-normal">{option.name}</Label>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    )
}

const DataTable: FC<{
    columns: string[],
    data: (string | number)[][],
}> = ({ columns, data }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length > 0 ? (
                    data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex} className={cn(typeof cell === 'number' || (typeof cell === 'string' && !isNaN(Number(cell))) ? 'font-medium' : '')}>
                                    {cell}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                            No results found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

    