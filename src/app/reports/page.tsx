
'use client';

import React, { useState, useEffect, useMemo, useRef, type FC } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, CalendarIcon, Filter, FileDown, AreaChart, BarChart2, PieChartIcon, ScatterChartIcon, GanttChart, User, ChevronDown, ChevronRight, BarChart, Rows, Columns } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfToday, subMonths, startOfToday, endOfYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Badge } from '@/components/ui/badge';
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { DateRange } from 'react-day-picker';


type PlayerReportRow = {
  id: string;
  name: string;
  gamesPlayed: number;
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
    playerProfitBar: boolean;
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];
const customTicks = [5000, 10000, 25000, 50000, 100000];
const tickFormatter = (value: number) => `₹${value / 1000}k`;


export default function GameHistoryPage() {
  const { toast } = useToast();
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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
    venueBar: false,
    buyInLine: false,
    venuePie: false,
    profitScatter: false,
    venueStackedBar: false,
    playerProfitBar: false,
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
    const filteredGames = useMemo(() => {
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
            
            const hasSelectedPlayer = (game.players || []).some(p => selectedPlayerNames.includes(p.name));

            return isDateInRange && isVenueSelected && hasSelectedPlayer;
        })
        .map(game => {
            const gamePlayers = (game.players || [])
                .filter(p => selectedPlayerNames.includes(p.name))
                .map(p => {
                    const buyIn = (p.buyIns || []).reduce((sum, bi) => sum + (bi.status === 'verified' ? (bi.amount || 0) : 0), 0);
                    const finalChips = p.finalChips || 0;
                    return {
                        name: p.name,
                        buyIn: buyIn,
                        finalChips: finalChips,
                        profitLoss: finalChips - buyIn
                    }
                });
                
            const totalBuyIn = gamePlayers.reduce((sum, p) => sum + p.buyIn, 0);
            const totalChipReturn = gamePlayers.reduce((sum, p) => sum + p.finalChips, 0);

            return {
                id: game.id,
                date: format(new Date(game.timestamp), 'dd MMMM yyyy'),
                venue: game.venue,
                timestamp: game.timestamp,
                totalBuyIn,
                totalChipReturn,
                profitLoss: totalChipReturn - totalBuyIn,
                players: gamePlayers,
            }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allGames, masterPlayers, masterVenues, selectedPlayerIds, selectedVenueIds, dateRange]);
  
  const playerReportData = useMemo<PlayerReportRow[]>(() => {
    const playerStats = new Map<string, { id: string, name: string; gamesPlayed: number; totalBuyIn: number; totalChipReturn: number; profitLoss: number }>();
    const selectedPlayerNames = masterPlayers.filter(p => selectedPlayerIds.includes(p.id)).map(p => p.name);

    filteredGames.forEach(game => {
        (game.players || []).forEach(player => {
            if (selectedPlayerNames.includes(player.name)) {
                const masterPlayer = masterPlayers.find(mp => mp.name === player.name);
                if (!masterPlayer) return;

                const stats = playerStats.get(player.name) || {
                    id: masterPlayer.id,
                    name: player.name,
                    gamesPlayed: 0,
                    totalBuyIn: 0,
                    totalChipReturn: 0,
                    profitLoss: 0,
                };

                stats.gamesPlayed += 1;
                stats.totalBuyIn += player.buyIn || 0;
                stats.totalChipReturn += player.finalChips || 0;
                stats.profitLoss += player.profitLoss || 0;

                playerStats.set(player.name, stats);
            }
        });
    });

    return Array.from(playerStats.values()).map(p => ({
        id: p.id,
        name: p.name,
        gamesPlayed: p.gamesPlayed,
        totalBuyIn: p.totalBuyIn || 0,
        totalChipReturn: p.totalChipReturn || 0,
        profitLoss: p.profitLoss || 0,
    })).sort((a,b) => b.profitLoss - a.profitLoss);
  }, [filteredGames, masterPlayers, selectedPlayerIds]);

  const handleChartVisibilityChange = (chartName: keyof ChartVisibilityState, isVisible: boolean) => {
    setChartVisibility(prev => ({ ...prev, [chartName]: isVisible }));
  };

  const handleExportPdf = async () => {
    if (!reportContainerRef.current) {
        toast({ variant: "destructive", title: "Export Error", description: "Report content not found." });
        return;
    }
    
    setIsExporting(true);
    try {
        const canvas = await html2canvas(reportContainerRef.current, {
            scale: 2, // Higher scale for better quality before compression
            useCORS: true,
            backgroundColor: null, // Use transparent background for dark mode compatibility
        });
        
        // Compress the image by using JPEG format with a quality setting
        const imgData = canvas.toDataURL('image/jpeg', 0.7); // Quality 0.7 for good compression
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        
        const filename = `chip-maestro-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        
        pdf.save(filename);
        toast({ title: 'Report Exported', description: 'Your report has been downloaded as a PDF.' });

    } catch (error) {
        console.error("Failed to export PDF:", error);
        toast({ variant: "destructive", title: "Export Failed", description: "Could not generate the PDF report." });
    } finally {
        setIsExporting(false);
    }
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
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filters & Display Options</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 border-b pb-4 mb-4">
                <MultiSelectPopover title="Players" options={masterPlayers} selected={selectedPlayerIds} onSelectedChange={setSelectedPlayerIds}/>
                <MultiSelectPopover title="Venues" options={masterVenues} selected={selectedVenueIds} onSelectedChange={setSelectedVenueIds}/>
                <div className="space-y-2">
                    <Label>Date Range</Label>
                    <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                </div>
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                 <div className="flex items-center space-x-2">
                    <Checkbox id="cb-playerProfitBar" checked={chartVisibility.playerProfitBar} onCheckedChange={(c) => handleChartVisibilityChange('playerProfitBar', !!c)} />
                    <Label htmlFor="cb-playerProfitBar" className="flex items-center gap-2"><User className="h-4 w-4" /> Player P/L</Label>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">Game History & Reports</h1>
          </div>
          <div className="flex gap-2">
              <Button onClick={handleExportPdf} disabled={playerReportData.length === 0 || isExporting}>
                  {isExporting ? <Loader2 className="mr-2 animate-spin"/> : <FileDown className="mr-2"/>}
                  Export PDF
              </Button>
          </div>
        </div>
        
        <div ref={reportContainerRef} className='space-y-6'>
            {dateRange?.from && (
                <p className="text-muted-foreground mt-1">
                    {format(dateRange.from, "LLL dd, yyyy")} - {dateRange.to ? format(dateRange.to, "LLL dd, yyyy") : 'Present'}
                </p>
            )}
            
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle>Player Report</CardTitle>
                        <Badge variant="secondary">{playerReportData.length} players</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <PlayerReportTable
                        playerReportData={playerReportData}
                        filteredGames={filteredGames}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart className="h-5 w-5"/> Charts</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-8">
                        {chartVisibility.venueBar && <VenueBarChart data={filteredGames} dateRange={dateRange} />}
                        {chartVisibility.buyInLine && <BuyInLineChart data={filteredGames} dateRange={dateRange} />}
                        {chartVisibility.venuePie && <VenuePieChart data={filteredGames} dateRange={dateRange} />}
                        {chartVisibility.profitScatter && <ProfitScatterPlot data={filteredGames} dateRange={dateRange} />}
                        {chartVisibility.venueStackedBar && <VenueStackedBarChart data={filteredGames} dateRange={dateRange} />}
                    </div>
                </CardContent>
            </Card>
          
            {chartVisibility.playerProfitBar && (
                <Card>
                    <CardHeader>
                        <CardTitle>Total Player Profit/Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PlayerProfitBarChart data={playerReportData} dateRange={dateRange} />
                    </CardContent>
                </Card>
            )}
        </div>
      </div>

    </div>
  );
}

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
                            <Checkbox id={`all-${title}`} onCheckedChange={handleSelectAll} checked={options.length > 0 && selected.length === options.length} disabled={options.length === 0} />
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

const PlayerReportTable: FC<{
    playerReportData: PlayerReportRow[],
    filteredGames: any[],
}> = ({ playerReportData, filteredGames }) => {
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    
    useEffect(() => {
        // When filtered data changes, expand all rows by default
        if (playerReportData.length > 0) {
            setExpandedRows(playerReportData.map(p => p.id));
        } else {
            setExpandedRows([]);
        }
    }, [playerReportData]);

    const toggleRow = (playerId: string) => {
        setExpandedRows(prev => 
            prev.includes(playerId) 
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    };

    const expandAll = () => setExpandedRows(playerReportData.map(p => p.id));
    const collapseAll = () => setExpandedRows([]);
    
    const getPlayerGameDetails = (playerName: string) => {
        return filteredGames
            .map(game => {
                const playerInGame = (game.players || []).find((p: any) => p.name === playerName);
                if (playerInGame) {
                    return {
                        date: game.date,
                        venue: game.venue,
                        buyIn: playerInGame.buyIn || 0,
                        chipReturn: playerInGame.finalChips || 0,
                        profitLoss: playerInGame.profitLoss || 0,
                    };
                }
                return null;
            })
            .filter((details): details is NonNullable<typeof details> => details !== null);
    };

    const totals = useMemo(() => {
        const result = playerReportData.reduce((acc, player) => {
            acc.gamesPlayed += player.gamesPlayed;
            acc.totalBuyIn += player.totalBuyIn || 0;
            acc.totalChipReturn += player.totalChipReturn || 0;
            return acc;
        }, { gamesPlayed: 0, totalBuyIn: 0, totalChipReturn: 0 });
        
        return {
            ...result,
            totalProfitLoss: result.totalChipReturn - result.totalBuyIn,
        }
    }, [playerReportData]);

    return (
       <div className="w-full overflow-x-auto">
            <div className="flex justify-end gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={expandAll}><Rows className="mr-2 h-4 w-4" />Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll}><Columns className="mr-2 h-4 w-4" />Collapse All</Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Games Played</TableHead>
                        <TableHead>Total Buy-in</TableHead>
                        <TableHead>Total Chip Return</TableHead>
                        <TableHead>Total P/L</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {playerReportData.length > 0 ? (
                        playerReportData.map(player => {
                            const isExpanded = expandedRows.includes(player.id);
                            const playerGames = isExpanded ? getPlayerGameDetails(player.name) : [];
                            return (
                                <React.Fragment key={player.id}>
                                    <TableRow>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => toggleRow(player.id)} className="h-6 w-6">
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell className='font-medium'>{player.name}</TableCell>
                                        <TableCell>{player.gamesPlayed}</TableCell>
                                        <TableCell className="font-mono">₹{(player.totalBuyIn || 0).toFixed(0)}</TableCell>
                                        <TableCell className="font-mono">₹{(player.totalChipReturn || 0).toFixed(0)}</TableCell>
                                        <TableCell className={cn('font-mono font-bold', (player.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>₹{(player.profitLoss || 0).toFixed(0)}</TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="p-0 bg-muted/50">
                                                <div className="p-4 overflow-x-auto">
                                                    <h4 className="font-semibold mb-2">Game Details for {player.name}</h4>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Date</TableHead>
                                                                <TableHead>Venue</TableHead>
                                                                <TableHead>Buy-in</TableHead>
                                                                <TableHead>Chip Return</TableHead>
                                                                <TableHead>P/L</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {playerGames.map((game, index: number) => (
                                                                <TableRow key={index}>
                                                                    <TableCell>{game.date}</TableCell>
                                                                    <TableCell>{game.venue}</TableCell>
                                                                    <TableCell className="font-mono">₹{game.buyIn.toFixed(0)}</TableCell>
                                                                    <TableCell className="font-mono">₹{game.chipReturn.toFixed(0)}</TableCell>
                                                                    <TableCell className={cn('font-mono font-semibold', game.profitLoss >= 0 ? 'text-green-600' : 'text-red-600')}>₹{game.profitLoss.toFixed(0)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No results found for the selected filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                 <TableFooter>
                    <TableRow className="font-bold bg-muted hover:bg-muted">
                        <TableCell colSpan={2}>Grand Total</TableCell>
                        <TableCell>{totals.gamesPlayed}</TableCell>
                        <TableCell className="font-mono">₹{totals.totalBuyIn.toFixed(0)}</TableCell>
                        <TableCell className="font-mono">₹{totals.totalChipReturn.toFixed(0)}</TableCell>
                        <TableCell className={cn('font-mono font-bold', totals.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600')}>
                            ₹{totals.totalProfitLoss.toFixed(0)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )
}

const ChartContainer: FC<{ title: string; children: React.ReactNode; dateRange: DateRange | undefined; }> = ({ title, children, dateRange }) => (
  <div className="h-96 w-full">
    <h3 className="text-center text-lg font-semibold">{title}</h3>
    {dateRange?.from && (
        <p className="text-center text-xs text-muted-foreground mb-2">
            {format(dateRange.from, "LLL dd, yyyy")} - {dateRange.to ? format(dateRange.to, "LLL dd, yyyy") : 'Present'}
        </p>
    )}
    <ResponsiveContainer width="100%" height={300}>
        {children}
    </ResponsiveContainer>
  </div>
);

const VenueBarChart: FC<{ data: any[]; dateRange: DateRange | undefined }> = ({ data, dateRange }) => {
    const chartData = useMemo(() => {
        const venueData = new Map<string, number>();
        data.forEach(game => {
            venueData.set(game.venue, (venueData.get(game.venue) || 0) + (game.totalBuyIn || 0));
        });
        return Array.from(venueData.entries()).map(([name, totalBuyIn]) => ({ name, totalBuyIn }));
    }, [data]);

    if (chartData.length === 0) return <ChartContainer title="Total Buy-ins per Venue" dateRange={dateRange}><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>
    
    const maxVal = Math.max(...chartData.map(d => d.totalBuyIn), ...customTicks);

    return (
        <ChartContainer title="Total Buy-ins per Venue" dateRange={dateRange}>
            <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, maxVal]} ticks={customTicks} tickFormatter={tickFormatter} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <RechartsBar dataKey="totalBuyIn" fill="#4f46e5" name="Total Buy-in" />
            </RechartsBarChart>
        </ChartContainer>
    );
};

const BuyInLineChart: FC<{ data: any[]; dateRange: DateRange | undefined }> = ({ data, dateRange }) => {
    const chartData = [...data].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(g => ({...g, date: format(new Date(g.timestamp), 'dd/MM')}));
    if (data.length === 0) return <ChartContainer title="Total Buy-ins Over Time" dateRange={dateRange}><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    const maxVal = Math.max(...chartData.map(d => d.totalBuyIn), ...customTicks);
    
    return (
        <ChartContainer title="Total Buy-ins Over Time" dateRange={dateRange}>
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                <YAxis domain={[0, maxVal]} ticks={customTicks} tickFormatter={tickFormatter} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Line type="monotone" dataKey="totalBuyIn" stroke="#10b981" name="Total Buy-in" />
            </LineChart>
        </ChartContainer>
    );
};

const VenuePieChart: FC<{ data: any[]; dateRange: DateRange | undefined }> = ({ data, dateRange }) => {
    const chartData = useMemo(() => {
        const venueData = new Map<string, number>();
        data.forEach(game => {
            venueData.set(game.venue, (venueData.get(game.venue) || 0) + 1);
        });
        return Array.from(venueData.entries()).map(([name, value]) => ({ name, value }));
    }, [data]);
    
    if (chartData.length === 0) return <ChartContainer title="Games per Venue" dateRange={dateRange}><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Games per Venue" dateRange={dateRange}>
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

const ProfitScatterPlot: FC<{ data: any[]; dateRange: DateRange | undefined }> = ({ data, dateRange }) => {
    const chartData = useMemo(() => {
        return data.filter(d => 
            typeof d.totalBuyIn === 'number' && !isNaN(d.totalBuyIn) &&
            typeof d.profitLoss === 'number' && !isNaN(d.profitLoss)
        );
    }, [data]);

    if (chartData.length === 0) return <ChartContainer title="Buy-in vs. Profit/Loss per Game" dateRange={dateRange}><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>

    return (
        <ChartContainer title="Buy-in vs. Profit/Loss per Game" dateRange={dateRange}>
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


const VenueStackedBarChart: FC<{ data: any[], dateRange: DateRange | undefined }> = ({ data, dateRange }) => {
    const chartData = useMemo(() => {
        const venueData = new Map<string, { totalBuyIn: number; totalChipReturn: number }>();
        data.forEach(game => {
            const current = venueData.get(game.venue) || { totalBuyIn: 0, totalChipReturn: 0 };
            current.totalBuyIn += game.totalBuyIn || 0;
            current.totalChipReturn += game.totalChipReturn || 0;
            venueData.set(game.venue, current);
        });
        return Array.from(venueData.entries()).map(([name, values]) => ({ name, ...values }));
    }, [data]);

    if (chartData.length === 0) return <ChartContainer title="Buy-ins vs. Returns per Venue" dateRange={dateRange}><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>
    
    const maxVal = Math.max(...chartData.map(d => Math.max(d.totalBuyIn, d.totalChipReturn)), ...customTicks);

    return (
        <ChartContainer title="Buy-ins vs. Returns per Venue" dateRange={dateRange}>
            <RechartsBarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, maxVal]} ticks={customTicks} tickFormatter={tickFormatter} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `₹${value}`}/>
                <Legend />
                <RechartsBar dataKey="totalBuyIn" stackId="a" fill="#8b5cf6" name="Total Buy-in" />
                <RechartsBar dataKey="totalChipReturn" stackId="a" fill="#3b82f6" name="Total Chip Return" />
            </RechartsBarChart>
        </ChartContainer>
    );
};

const PlayerProfitBarChart: FC<{ data: PlayerReportRow[], dateRange: DateRange | undefined }> = ({ data, dateRange }) => {
    if (data.length === 0) return <ChartContainer title="" dateRange={dateRange}><p className="text-center text-muted-foreground pt-20">No data available.</p></ChartContainer>
    
    const maxAbsProfitLoss = Math.max(...data.map(d => Math.abs(d.profitLoss)));
    const maxVal = Math.max(maxAbsProfitLoss, ...customTicks);

    return (
        <div className="h-96 w-full">
            {dateRange?.from && (
                <p className="text-center text-xs text-muted-foreground mb-2">
                    {format(dateRange.from, "LLL dd, yyyy")} - {dateRange.to ? format(dateRange.to, "LLL dd, yyyy") : 'Present'}
                </p>
            )}
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 75 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, angle: -90, textAnchor: 'end' }} interval={0} />
                    <YAxis domain={[-maxVal, maxVal]} ticks={customTicks} tickFormatter={tickFormatter} />
                    <Tooltip formatter={(value:any) => `₹${value.toFixed(0)}`} />
                    <Legend verticalAlign="top" />
                    <RechartsBar dataKey="profitLoss" name="Total P/L">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profitLoss >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                    </RechartsBar>
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
};
