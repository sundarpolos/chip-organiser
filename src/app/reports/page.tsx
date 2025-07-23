
'use client';

import { useState, useEffect, useMemo, useRef, type FC } from 'react';
import { getGameHistory } from '@/services/game-service';
import { getMasterPlayers } from '@/services/player-service';
import { getMasterVenues } from '@/services/venue-service';
import type { GameHistory, MasterPlayer, MasterVenue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarIcon, Filter, FileDown, AreaChart, BarChart2, PieChartIcon, ScatterChartIcon, GanttChart } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { DateRange } from 'react-day-picker';


type GameHistoryRow = {
  id: string;
  date: string;
  venue: string;
  totalBuyIn: number;
  totalChipReturn: number;
  profitLoss: number;
};

type ChartVisibilityState = {
    venueBar: boolean;
    buyInLine: boolean;
    venuePie: boolean;
    profitScatter: boolean;
    venueStackedBar: boolean;
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];

export default function GameHistoryPage() {
  const { toast } = useToast();

  // Data state
  const [allGames, setAllGames] = useState<GameHistory[]>([]);
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  
  // Chart visibility state
  const [chartVisibility, setChartVisibility] = useState<ChartVisibilityState>({
    venueBar: true,
    buyInLine: true,
    venuePie: true,
    profitScatter: true,
    venueStackedBar: true,
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
  const filteredGames = useMemo<GameHistoryRow[]>(() => {
    const selectedPlayerNames = masterPlayers
      .filter(p => selectedPlayerIds.includes(p.id))
      .map(p => p.name);

    const selectedVenueNames = masterVenues
      .filter(v => selectedVenueIds.includes(v.id))
      .map(v => v.name);

    return allGames
      .filter(game => {
        const gameDate = new Date(game.timestamp);
        const startOfDayFromDate = dateRange?.from ? new Date(dateRange.from.setHours(0, 0, 0, 0)) : null;
        const endOfDayToDate = dateRange?.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : null;

        const isDateInRange = 
            (!startOfDayFromDate || gameDate >= startOfDayFromDate) && 
            (!endOfDayToDate || gameDate <= endOfDayToDate);
        
        const isVenueSelected = selectedVenueNames.includes(game.venue);
        
        const hasSelectedPlayer = game.players.some(p => selectedPlayerNames.includes(p.name));

        return isDateInRange && isVenueSelected && hasSelectedPlayer;
      })
      .map(game => {
         const totalBuyIn = game.players.reduce((sum, p) => {
            return sum + (p.buyIns || []).reduce((playerSum, bi) => playerSum + (bi.status === 'verified' ? bi.amount : 0), 0);
         }, 0);
         const totalChipReturn = game.players.reduce((sum, p) => sum + p.finalChips, 0);

         return {
            id: game.id,
            date: format(new Date(game.timestamp), 'dd MMMM yyyy'),
            venue: game.venue,
            totalBuyIn,
            totalChipReturn,
            profitLoss: totalChipReturn - totalBuyIn,
         }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [allGames, masterPlayers, masterVenues, selectedPlayerIds, selectedVenueIds, dateRange]);
  
  const handleChartVisibilityChange = (chartName: keyof ChartVisibilityState, isVisible: boolean) => {
    setChartVisibility(prev => ({ ...prev, [chartName]: isVisible }));
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Game History Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Filters applied: ${filteredGames.length} games`, 14, 22);

    (doc as any).autoTable({
      head: [['Date', 'Venue', 'Total Buy-in', 'Total Chip Return', 'P/L']],
      body: filteredGames.map(g => [
        g.date,
        g.venue,
        `Rs. ${g.totalBuyIn.toFixed(0)}`,
        `Rs. ${g.totalChipReturn.toFixed(0)}`,
        `Rs. ${g.profitLoss.toFixed(0)}`,
      ]),
      startY: 30,
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    doc.save(`chip-maestro-game-history-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Report Exported', description: 'Your game history has been downloaded as a PDF.' });
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
        <h1 className="text-3xl font-bold">Game History</h1>
        <div className="flex gap-2">
            <Button onClick={handleExportPdf} disabled={filteredGames.length === 0}><FileDown className="mr-2"/>Export PDF</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filters & Display Options</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-b pb-4 mb-4">
                <MultiSelectPopover title="Players" options={masterPlayers} selected={selectedPlayerIds} onSelectedChange={setSelectedPlayerIds}/>
                <MultiSelectPopover title="Venues" options={masterVenues} selected={selectedVenueIds} onSelectedChange={setSelectedVenueIds}/>
                <div className="space-y-2">
                    <Label>Date Range</Label>
                    <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                </div>
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="cb-venueBar" checked={chartVisibility.venueBar} onCheckedChange={(c) => handleChartVisibilityChange('venueBar', !!c)} />
                    <Label htmlFor="cb-venueBar" className="flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Bar Chart</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="cb-buyInLine" checked={chartVisibility.buyInLine} onCheckedChange={(c) => handleChartVisibilityChange('buyInLine', !!c)} />
                    <Label htmlFor="cb-buyInLine" className="flex items-center gap-2"><AreaChart className="h-4 w-4" /> Line Chart</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="cb-venuePie" checked={chartVisibility.venuePie} onCheckedChange={(c) => handleChartVisibilityChange('venuePie', !!c)} />
                    <Label htmlFor="cb-venuePie" className="flex items-center gap-2"><PieChartIcon className="h-4 w-4" /> Pie Chart</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="cb-profitScatter" checked={chartVisibility.profitScatter} onCheckedChange={(c) => handleChartVisibilityChange('profitScatter', !!c)} />
                    <Label htmlFor="cb-profitScatter" className="flex items-center gap-2"><ScatterChartIcon className="h-4 w-4" /> Scatter Plot</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="cb-venueStackedBar" checked={chartVisibility.venueStackedBar} onCheckedChange={(c) => handleChartVisibilityChange('venueStackedBar', !!c)} />
                    <Label htmlFor="cb-venueStackedBar" className="flex items-center gap-2"><GanttChart className="h-4 w-4" /> Stacked Bar</Label>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Results</CardTitle>
                <Badge variant="secondary">{filteredGames.length} games</Badge>
              </div>
          </CardHeader>
          <CardContent className="space-y-8">
              <DataTable
                columns={['Date', 'Venue', 'Total Buy-in', 'Total Chip Return', 'P/L']}
                data={filteredGames.map(g => [
                  g.date,
                  g.venue,
                  g.totalBuyIn.toFixed(0),
                  g.totalChipReturn.toFixed(0),
                  g.profitLoss.toFixed(0),
                ])}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {chartVisibility.venueBar && <VenueBarChart data={filteredGames} />}
                {chartVisibility.buyInLine && <BuyInLineChart data={filteredGames} />}
                {chartVisibility.venuePie && <VenuePieChart data={filteredGames} />}
                {chartVisibility.profitScatter && <ProfitScatterPlot data={filteredGames} />}
                {chartVisibility.venueStackedBar && <VenueStackedBarChart data={filteredGames} />}
              </div>

          </CardContent>
      </Card>

    </div>
  );
}

const DateRangePicker: FC<{
    date: DateRange | undefined,
    onDateChange: (date: DateRange | undefined) => void,
}> = ({ date, onDateChange }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
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
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                    <div className="p-2 space-y-1">
                        <Button variant="ghost" className="w-full justify-start" onClick={() => onDateChange({ from: new Date(), to: new Date() })}>Today</Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => onDateChange({ from: subDays(new Date(), 6), to: new Date() })}>Last 7 days</Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => onDateChange({ from: subDays(new Date(), 29), to: new Date() })}>Last 30 days</Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => onDateChange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                        <Button variant="ghost" className="w-full justify-start" onClick={() => onDateChange({ from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) })}>Last Month</Button>
                    </div>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onDateChange}
                        numberOfMonths={1}
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
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
       <ScrollArea className="h-96">
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
                                    <TableCell key={cellIndex} className={cn(cellIndex > 1 ? 'font-mono' : 'font-medium', cellIndex === 4 && (Number(cell) >= 0 ? 'text-green-600' : 'text-red-600'))}>
                                        {cellIndex > 1 ? `₹${cell}` : cell}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results found for the selected filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}

const ChartContainer: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="h-96">
    <CardHeader>
        <CardTitle className="text-center text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
        <ResponsiveContainer width="100%" height={300}>
            {children}
        </ResponsiveContainer>
    </CardContent>
  </Card>
);

const VenueBarChart: FC<{ data: GameHistoryRow[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        const venueData = new Map<string, number>();
        data.forEach(game => {
            venueData.set(game.venue, (venueData.get(game.venue) || 0) + game.totalBuyIn);
        });
        return Array.from(venueData.entries()).map(([name, totalBuyIn]) => ({ name, totalBuyIn }));
    }, [data]);

    if (chartData.length === 0) return <ChartContainer title="Total Buy-ins per Venue"><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Total Buy-ins per Venue">
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Bar dataKey="totalBuyIn" fill="#4f46e5" name="Total Buy-in" />
            </BarChart>
        </ChartContainer>
    );
};

const BuyInLineChart: FC<{ data: GameHistoryRow[] }> = ({ data }) => {
    const chartData = [...data].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (data.length === 0) return <ChartContainer title="Total Buy-ins Over Time"><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Total Buy-ins Over Time">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Line type="monotone" dataKey="totalBuyIn" stroke="#10b981" name="Total Buy-in" />
            </LineChart>
        </ChartContainer>
    );
};

const VenuePieChart: FC<{ data: GameHistoryRow[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        const venueData = new Map<string, number>();
        data.forEach(game => {
            venueData.set(game.venue, (venueData.get(game.venue) || 0) + 1);
        });
        return Array.from(venueData.entries()).map(([name, value]) => ({ name, value }));
    }, [data]);
    
    if (chartData.length === 0) return <ChartContainer title="Games per Venue"><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Games per Venue">
            <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ChartContainer>
    );
};

const ProfitScatterPlot: FC<{ data: GameHistoryRow[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        return data.filter(d => 
            typeof d.totalBuyIn === 'number' && !isNaN(d.totalBuyIn) &&
            typeof d.profitLoss === 'number' && !isNaN(d.profitLoss)
        );
    }, [data]);

    if (chartData.length === 0) return <ChartContainer title="Buy-in vs. Profit/Loss per Game"><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Buy-in vs. Profit/Loss per Game">
            <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="totalBuyIn" name="Total Buy-in" unit="₹" tickFormatter={(value) => `${value / 1000}k`} />
                <YAxis type="number" dataKey="profitLoss" name="Profit/Loss" unit="₹" tickFormatter={(value) => `${value / 1000}k`} />
                <ZAxis dataKey="venue" name="Venue" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => (name === "Venue" ? value : `₹${value}`)} />
                <Legend />
                <Scatter name="Games" data={chartData} fill="#ef4444" />
            </ScatterChart>
        </ChartContainer>
    );
};


const VenueStackedBarChart: FC<{ data: GameHistoryRow[] }> = ({ data }) => {
    const chartData = useMemo(() => {
        const venueData = new Map<string, { totalBuyIn: number; totalChipReturn: number }>();
        data.forEach(game => {
            const current = venueData.get(game.venue) || { totalBuyIn: 0, totalChipReturn: 0 };
            current.totalBuyIn += game.totalBuyIn;
            current.totalChipReturn += game.totalChipReturn;
            venueData.set(game.venue, current);
        });
        return Array.from(venueData.entries()).map(([name, values]) => ({ name, ...values }));
    }, [data]);

    if (chartData.length === 0) return <ChartContainer title="Buy-ins vs. Returns per Venue"><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Buy-ins vs. Returns per Venue">
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `₹${value / 1000}k`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `₹${value}`}/>
                <Legend />
                <Bar dataKey="totalBuyIn" stackId="a" fill="#8b5cf6" name="Total Buy-in" />
                <Bar dataKey="totalChipReturn" stackId="a" fill="#3b82f6" name="Total Chip Return" />
            </BarChart>
        </ChartContainer>
    );
};
