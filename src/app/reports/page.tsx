
'use client';

import { useState, useEffect, useMemo, useRef, type FC } from 'react';
import { getGameHistory } from '@/services/game-service';
import { getMasterPlayers } from '@/services/player-service';
import { getMasterVenues } from '@/services/venue-service';
import type { GameHistory, MasterPlayer, MasterVenue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarIcon, Filter, FileDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';


type GameHistoryRow = {
  id: string;
  date: string;
  venue: string;
  totalBuyIn: number;
  totalChipReturn: number;
};

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
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

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
        const startOfDayFromDate = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)) : null;
        const endOfDayToDate = toDate ? new Date(toDate.setHours(23, 59, 59, 999)) : null;

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
         }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [allGames, masterPlayers, masterVenues, selectedPlayerIds, selectedVenueIds, fromDate, toDate]);

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text("Game History Report", 14, 16);
    doc.setFontSize(10);
    doc.text(`Filters applied: ${filteredGames.length} games`, 14, 22);

    (doc as any).autoTable({
      head: [['Date', 'Venue', 'Total Buy-in', 'Total Chip Return']],
      body: filteredGames.map(g => [
        g.date,
        g.venue,
        `Rs. ${g.totalBuyIn.toFixed(0)}`,
        `Rs. ${g.totalChipReturn.toFixed(0)}`,
      ]),
      startY: 30,
      headStyles: { fillColor: [22, 163, 74] },
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
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MultiSelectPopover title="Players" options={masterPlayers} selected={selectedPlayerIds} onSelectedChange={setSelectedPlayerIds}/>
            <MultiSelectPopover title="Venues" options={masterVenues} selected={selectedVenueIds} onSelectedChange={setSelectedVenueIds}/>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="from-date">From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="from-date"
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                disabled={(date) => toDate ? date > toDate : false}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="to-date">To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="to-date"
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {toDate ? format(toDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={setToDate}
                                disabled={(date) => fromDate ? date < fromDate : false}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Games List</CardTitle>
                <Badge variant="secondary">{filteredGames.length}</Badge>
              </div>
          </CardHeader>
          <CardContent>
              <DataTable
              columns={['Date', 'Venue', 'Total Buy-in', 'Total Chip Return']}
              data={filteredGames.map(g => [
                g.date,
                g.venue,
                g.totalBuyIn.toFixed(0),
                g.totalChipReturn.toFixed(0),
              ])}
            />
          </CardContent>
      </Card>

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
                                <TableCell key={cellIndex} className={cn(cellIndex > 1 ? 'font-mono' : 'font-medium')}>
                                    {cell}
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
    )
}
