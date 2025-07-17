"use client"

import { useState, useEffect, useMemo, useCallback, type FC } from "react"
import { detectAnomalousBuyins } from "@/ai/flows/detect-anomalies"
import type { Player, MasterPlayer, MasterVenue, GameHistory, CalculatedPlayer, BuyIn } from "@/lib/types"
import { calculateInterPlayerTransfers } from "@/lib/game-logic"
import { ChipDistributionChart } from "@/components/ChipDistributionChart"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Trash2,
  Users,
  Save,
  FileDown,
  History,
  BookUser,
  Loader2,
  ShieldAlert,
  Crown,
  Share2,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"

const MAX_PLAYERS = 7;

export default function ChipMaestroPage() {
  const { toast } = useToast()

  // Core State
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [currentVenue, setCurrentVenue] = useState<string>("Untitled Game")
  const [isDataReady, setIsDataReady] = useState(false)

  // Master Data State
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([])
  const [masterVenues, setMasterVenues] = useState<MasterVenue[]>([])
  
  // Game History & Results State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [activeGame, setActiveGame] = useState<GameHistory | null>(null)

  // Modal & Dialog State
  const [isVenueModalOpen, setVenueModalOpen] = useState(false)
  const [isManagePlayersModalOpen, setManagePlayersModalOpen] = useState(false)
  const [isLoadGameModalOpen, setLoadGameModalOpen] = useState(false)
  const [isReportsModalOpen, setReportsModalOpen] = useState(false)
  const [isAnomalyModalOpen, setAnomalyModalOpen] = useState(false)
  
  // Specific Modal Content State
  const [editingPlayer, setEditingPlayer] = useState<MasterPlayer | null>(null)
  const [anomalyPlayer, setAnomalyPlayer] = useState<Player | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<{ score: number; explanation: string } | null>(null);
  const [isAnomalyLoading, setAnomalyLoading] = useState(false);

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedMasterPlayers = localStorage.getItem("masterPlayers")
      const savedMasterVenues = localStorage.getItem("masterVenues")
      const savedGameHistory = localStorage.getItem("gameHistory")

      if (savedMasterPlayers) setMasterPlayers(JSON.parse(savedMasterPlayers))
      if (savedMasterVenues) setMasterVenues(JSON.parse(savedMasterVenues))
      if (savedGameHistory) {
        const history = JSON.parse(savedGameHistory)
        setGameHistory(history)
        if (history.length > 0) {
          setActiveGame(history[0])
        }
      }
      
      if (!savedGameHistory || JSON.parse(savedGameHistory).length === 0) {
        setVenueModalOpen(true)
        addNewPlayer();
      } else {
        const history = JSON.parse(savedGameHistory);
        if (history.length > 0) {
            const lastGame = history[0];
            setCurrentVenue(lastGame.venue);
            const playersFromHistory = lastGame.players.map(p => ({
                id: p.id,
                name: p.name,
                whatsappNumber: p.whatsappNumber,
                buyIns: p.buyIns,
                finalChips: p.finalChips,
            }));
            setPlayers(playersFromHistory);
            if (playersFromHistory.length > 0) {
                setActiveTab(playersFromHistory[0].id)
            }
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error)
      toast({ variant: "destructive", title: "Error", description: "Could not load saved data." })
      setVenueModalOpen(true)
      addNewPlayer();
    }
    setIsDataReady(true)
  }, [])

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    if(!isDataReady) return;
    localStorage.setItem("masterPlayers", JSON.stringify(masterPlayers))
    localStorage.setItem("masterVenues", JSON.stringify(masterVenues))
    localStorage.setItem("gameHistory", JSON.stringify(gameHistory))
  }, [masterPlayers, masterVenues, gameHistory, isDataReady])

  const addNewPlayer = () => {
    if (players.some(p => p.name === "")) {
      toast({ variant: "destructive", title: "Unnamed Player Exists", description: "Please name the existing new player before adding another." });
      return;
    }
    if (players.length >= MAX_PLAYERS) {
      toast({ variant: "destructive", title: "Max players reached", description: `You can only have up to ${MAX_PLAYERS} players.` })
      return
    }
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: "",
      whatsappNumber: "",
      buyIns: [{ amount: 0, timestamp: new Date().toISOString() }],
      finalChips: 0,
    }
    setPlayers([...players, newPlayer])
    setActiveTab(newPlayer.id)
  }
  
  const removePlayer = (idToRemove: string) => {
    const updatedPlayers = players.filter(p => p.id !== idToRemove)
    setPlayers(updatedPlayers)
    if (activeTab === idToRemove) {
      setActiveTab(updatedPlayers.length > 0 ? updatedPlayers[0].id : "")
    }
  }
  
  const updatePlayer = (id: string, newValues: Partial<Player>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...newValues } : p));
  };
  
  const handlePlayerNameChange = (id: string, newName: string) => {
    const masterPlayer = masterPlayers.find(mp => mp.name === newName);
    const updatedDetails: Partial<Player> = { name: newName };
    if (masterPlayer) {
      updatedDetails.whatsappNumber = masterPlayer.whatsappNumber;
    }
    updatePlayer(id, updatedDetails);
  };
  
  const handleSaveGame = () => {
    if (players.some(p => !p.name)) {
        toast({ variant: "destructive", title: "Cannot Save Game", description: "Please ensure all players have a name." });
        return;
    }

    const calculatedPlayers: CalculatedPlayer[] = players.map(p => {
        const totalBuyIns = p.buyIns.reduce((sum, bi) => sum + bi.amount, 0);
        return {
            ...p,
            totalBuyIns,
            profitLoss: p.finalChips - totalBuyIns,
        }
    });

    const newGame: GameHistory = {
        id: `game-${Date.now()}`,
        venue: currentVenue,
        timestamp: new Date().toISOString(),
        players: calculatedPlayers,
    }

    const updatedHistory = [newGame, ...gameHistory];
    setGameHistory(updatedHistory);
    setActiveGame(newGame);
    toast({ title: "Game Saved!", description: `${currentVenue} has been saved to your history.` });
  };
  
  const handleLoadGame = (gameId: string) => {
    const gameToLoad = gameHistory.find(g => g.id === gameId);
    if (gameToLoad) {
      setActiveGame(gameToLoad);
      setCurrentVenue(gameToLoad.venue);
      setPlayers(gameToLoad.players.map(p => ({
        id: p.id,
        name: p.name,
        whatsappNumber: p.whatsappNumber,
        buyIns: p.buyIns,
        finalChips: p.finalChips,
      })));
      if (gameToLoad.players.length > 0) {
        setActiveTab(gameToLoad.players[0].id)
      }
      setLoadGameModalOpen(false);
      toast({ title: "Game Loaded", description: `Loaded game from ${format(new Date(gameToLoad.timestamp), "PPP p")}.` });
    }
  };
  
  const handleNewGame = () => {
    setPlayers([]);
    setActiveGame(null);
    addNewPlayer();
    setVenueModalOpen(true);
  }
  
  const handleStartGameFromVenue = (venue: string) => {
    setCurrentVenue(venue);
    setVenueModalOpen(false);
  }

  const handleRunAnomalyDetection = async (player: Player) => {
    setAnomalyPlayer(player);
    setAnomalyModalOpen(true);
    setAnomalyLoading(true);
    setAnomalyResult(null);

    const playerBuyIns = player.buyIns.map(b => ({
      playerName: player.name,
      amount: b.amount,
      timestamp: b.timestamp,
    }));
    
    const historicalBuyIns = gameHistory
      .flatMap(g => g.players)
      .filter(p => p.name === player.name)
      .flatMap(p => p.buyIns)
      .map(b => ({
        playerName: player.name,
        amount: b.amount,
        timestamp: b.timestamp,
      }));

    try {
      const result = await detectAnomalousBuyins({ playerBuyIns, historicalBuyIns });
      setAnomalyResult({ score: result.anomalyScore, explanation: result.explanation });
    } catch (error) {
      console.error("Anomaly detection failed", error);
      toast({ variant: "destructive", title: "Analysis Failed", description: "Could not run anomaly detection." });
      setAnomalyResult({ score: -1, explanation: "An error occurred during analysis." });
    } finally {
      setAnomalyLoading(false);
    }
  };

  const transfers = useMemo(() => {
    if (!activeGame) return [];
    return calculateInterPlayerTransfers(activeGame.players);
  }, [activeGame]);

  const totalBuyInLog = useMemo(() => {
    const log = players.flatMap(p => p.buyIns.map(b => ({
      playerName: p.name || "Unnamed",
      amount: b.amount,
      timestamp: b.timestamp,
    }))).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return log;
  }, [players]);

  const grandTotalBuyIn = useMemo(() => totalBuyInLog.reduce((sum, item) => sum + item.amount, 0), [totalBuyInLog]);

  if (!isDataReady) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="flex justify-center items-center mb-6 gap-4">
        <h1 className="text-xl font-bold text-gray-800 truncate">{currentVenue}</h1>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-3 md:gap-8">
        <section className="md:col-span-2 mb-8 md:mb-0">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button onClick={() => setManagePlayersModalOpen(true)} variant="outline" size="sm" className="sm:size-auto"><BookUser className="mr-2 h-4 w-4" />Manage Players</Button>
                  <Button onClick={handleNewGame} variant="destructive" size="sm" className="sm:size-auto"><Plus className="mr-2 h-4 w-4" />New Game</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {players.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
                    {players.map(p => (
                      <TabsTrigger key={p.id} value={p.id}>{p.name || "New Player"}</TabsTrigger>
                    ))}
                  </TabsList>
                  {players.map(player => (
                    <TabsContent key={player.id} value={player.id}>
                      <PlayerCard 
                        player={player} 
                        masterPlayers={masterPlayers} 
                        onUpdate={updatePlayer}
                        onNameChange={handlePlayerNameChange}
                        onRemove={removePlayer}
                        onRunAnomalyCheck={handleRunAnomalyDetection}
                        isOnlyPlayer={players.length === 1}
                        allPlayers={players}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                 <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">No players in the game.</p>
                    <Button onClick={addNewPlayer}><Plus className="mr-2 h-4 w-4"/>Add First Player</Button>
                 </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <Button onClick={addNewPlayer} disabled={players.length >= MAX_PLAYERS} size="sm" className="sm:size-auto"><Plus className="mr-2 h-4 w-4" />Add Player</Button>
                  <Button onClick={handleSaveGame} variant="secondary" size="sm" className="sm:size-auto"><Save className="mr-2 h-4 w-4" />Save Game</Button>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setLoadGameModalOpen(true)} variant="outline" size="sm" className="sm:size-auto"><History className="mr-2 h-4 w-4" />Load Game</Button>
                    <Button onClick={() => setReportsModalOpen(true)} variant="outline" disabled={!activeGame} size="sm" className="sm:size-auto"><FileDown className="mr-2 h-4 w-4" />Reports</Button>
                </div>
            </CardFooter>
          </Card>
        </section>
        
        <aside className="md:col-span-1">
          <SummaryCard 
            activeGame={activeGame}
            transfers={transfers}
            buyInLog={totalBuyInLog}
            grandTotal={grandTotalBuyIn}
          />
        </aside>
      </main>

      <VenueDialog 
        isOpen={isVenueModalOpen}
        onOpenChange={setVenueModalOpen}
        masterVenues={masterVenues}
        onStartGame={handleStartGameFromVenue}
        setMasterVenues={setMasterVenues}
      />
      <ManagePlayersDialog 
        isOpen={isManagePlayersModalOpen}
        onOpenChange={setManagePlayersModalOpen}
        masterPlayers={masterPlayers}
        setMasterPlayers={setMasterPlayers}
        toast={toast}
      />
      <LoadGameDialog 
        isOpen={isLoadGameModalOpen}
        onOpenChange={setLoadGameModalOpen}
        gameHistory={gameHistory}
        onLoadGame={handleLoadGame}
      />
      <ReportsDialog 
        isOpen={isReportsModalOpen}
        onOpenChange={setReportsModalOpen}
        activeGame={activeGame}
        transfers={transfers}
      />
      <AnomalyReportDialog
        isOpen={isAnomalyModalOpen}
        onOpenChange={setAnomalyModalOpen}
        player={anomalyPlayer}
        isLoading={isAnomalyLoading}
        result={anomalyResult}
      />
    </div>
  )
}

const PlayerCard: FC<{
  player: Player,
  masterPlayers: MasterPlayer[],
  allPlayers: Player[],
  onUpdate: (id: string, newValues: Partial<Player>) => void,
  onNameChange: (id: string, newName: string) => void,
  onRemove: (id: string) => void,
  onRunAnomalyCheck: (player: Player) => void,
  isOnlyPlayer: boolean
}> = ({ player, masterPlayers, allPlayers, onUpdate, onNameChange, onRemove, onRunAnomalyCheck, isOnlyPlayer }) => {
  
  const handleBuyInChange = (index: number, newAmount: number) => {
    const newBuyIns = [...player.buyIns]
    newBuyIns[index].amount = newAmount
    onUpdate(player.id, { buyIns: newBuyIns })
  }

  const addBuyIn = () => {
    const newBuyIns = [...player.buyIns, { amount: 0, timestamp: new Date().toISOString() }]
    onUpdate(player.id, { buyIns: newBuyIns })
  }
  
  const removeBuyIn = (index: number) => {
    if (player.buyIns.length > 1) {
      const newBuyIns = player.buyIns.filter((_, i) => i !== index)
      onUpdate(player.id, { buyIns: newBuyIns })
    }
  }

  const totalBuyIns = player.buyIns.reduce((sum, bi) => sum + bi.amount, 0);

  const availableMasterPlayers = useMemo(() => {
    const currentInGamePlayerNames = allPlayers
      .filter(p => p.id !== player.id)
      .map(p => p.name)
      .filter(Boolean);
    return masterPlayers.filter(mp => !currentInGamePlayerNames.includes(mp.name));
  }, [masterPlayers, allPlayers, player.id]);


  return (
    <Card className="bg-slate-50 border-0 shadow-none">
      <CardHeader className="flex-row items-center justify-between">
        <div className="w-2/3">
          <Select
            value={player.name}
            onValueChange={(newName) => onNameChange(player.id, newName)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Player" />
            </SelectTrigger>
            <SelectContent>
              {player.name && !availableMasterPlayers.some(p => p.name === player.name) && (
                <SelectItem value={player.name}>{player.name}</SelectItem>
              )}
              {availableMasterPlayers.map(mp => (
                <SelectItem key={mp.id} value={mp.name}>{mp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => onRunAnomalyCheck(player)} variant="ghost" size="sm" disabled={!player.name}><ShieldAlert className="h-4 w-4 mr-2" />Analyze</Button>
            {!isOnlyPlayer && <Button variant="destructive" size="icon" onClick={() => onRemove(player.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-lg">Buy-ins</Label>
          <div className="space-y-2 mt-2">
            {player.buyIns.map((buyIn, index) => (
              <div key={index} className="p-2 rounded-md border bg-white">
                <div className="flex items-center gap-2">
                  <Input type="number" value={buyIn.amount} onChange={e => handleBuyInChange(index, parseInt(e.target.value) || 0)} placeholder="Amount" />
                  {index === player.buyIns.length - 1 ? (
                    <Button size="icon" variant="outline" onClick={addBuyIn}><Plus className="h-4 w-4" /></Button>
                  ) : (
                    <Button size="icon" variant="destructive" onClick={() => removeBuyIn(index)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xl font-bold mt-4 text-right">Total: {totalBuyIns}</p>
        </div>
        <div>
          <Label className="text-lg">Final Chips</Label>
          <Input 
            type="number" 
            className="mt-2 text-xl h-12" 
            value={player.finalChips} 
            onChange={e => onUpdate(player.id, { finalChips: parseInt(e.target.value) || 0 })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

const SummaryCard: FC<{activeGame: GameHistory | null, transfers: string[], buyInLog: any[], grandTotal: number}> = ({ activeGame, transfers, buyInLog, grandTotal }) => (
    <Card>
        <CardHeader>
            <CardTitle>Game Summary</CardTitle>
            {activeGame && <CardDescription>{format(new Date(activeGame.timestamp), "PPP p")}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
             {!activeGame ? (
                <div className="text-center py-10 text-muted-foreground">
                    <p>Save a game to see the summary.</p>
                </div>
            ) : (
            <>
                <div>
                    <h3 className="font-semibold mb-2">Player Performance</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>P/L</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeGame.players.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell className={`font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {p.profitLoss >= 0 ? '+' : ''}{p.profitLoss.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Money Transfers</h3>
                    <div className="space-y-1 text-sm">
                        {transfers.length > 0 ? transfers.map((t, i) => (
                            <div key={i} className="p-2 bg-slate-100 rounded-md" dangerouslySetInnerHTML={{ __html: t }} />
                        )) : <p className="text-muted-foreground">No transfers needed.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Buy-in Log</h3>
                    <ScrollArea className="h-40">
                    <Table>
                        <TableBody>
                           {buyInLog.map((log, i) => (
                            <TableRow key={i}>
                                <TableCell>{log.playerName}</TableCell>
                                <TableCell>{log.amount}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{format(new Date(log.timestamp), "p")}</TableCell>
                            </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                    </ScrollArea>
                    <Table>
                        <TableFoot>
                            <TableRow>
                                <TableCell colSpan={2} className="font-bold">Grand Total</TableCell>
                                <TableCell className="text-right font-bold">{grandTotal}</TableCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </div>
            </>
            )}
        </CardContent>
    </Card>
)

const VenueDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    masterVenues: MasterVenue[],
    onStartGame: (venue: string) => void,
    setMasterVenues: (venues: MasterVenue[]) => void,
}> = ({ isOpen, onOpenChange, masterVenues, onStartGame, setMasterVenues }) => {
    const [newVenue, setNewVenue] = useState("");
    const [selectedVenue, setSelectedVenue] = useState("");

    const handleSaveNewVenue = () => {
        if (!newVenue.trim()) return;
        const newMasterVenues = [...masterVenues, { id: `venue-${Date.now()}`, name: newVenue.trim() }];
        setMasterVenues(newMasterVenues);
        setSelectedVenue(newVenue.trim());
        setNewVenue("");
    }
    
    const handleDeleteVenue = () => {
        if(!selectedVenue) return;
        const newMasterVenues = masterVenues.filter(v => v.name !== selectedVenue);
        setMasterVenues(newMasterVenues);
        setSelectedVenue("");
    }

    const handleConfirm = () => {
        const venueToStart = selectedVenue || newVenue.trim();
        if (!venueToStart) return;
        if (!masterVenues.some(v => v.name === venueToStart)) {
            const newMasterVenues = [...masterVenues, { id: `venue-${Date.now()}`, name: venueToStart }];
            setMasterVenues(newMasterVenues);
        }
        onStartGame(venueToStart);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Set Game Venue</DialogTitle><DialogDescription>Select or create a venue to start a new game.</DialogDescription></DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Existing Venues</Label>
                        <div className="flex gap-2">
                        <Select onValueChange={setSelectedVenue} value={selectedVenue}>
                            <SelectTrigger><SelectValue placeholder="-- Select Venue --" /></SelectTrigger>
                            <SelectContent>
                                {masterVenues.map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="destructive" onClick={handleDeleteVenue} disabled={!selectedVenue}>Delete</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                         <Label>Or Enter New Venue</Label>
                        <div className="flex gap-2">
                            <Input value={newVenue} onChange={e => setNewVenue(e.target.value)} placeholder="e.g., John's House"/>
                            <Button onClick={handleSaveNewVenue} disabled={!newVenue.trim()}>Save New</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={!selectedVenue && !newVenue.trim()}>Start New Game</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const ManagePlayersDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    masterPlayers: MasterPlayer[],
    setMasterPlayers: (players: MasterPlayer[]) => void,
    toast: (options: { variant?: "default" | "destructive" | null, title: string, description: string }) => void,
}> = ({ isOpen, onOpenChange, masterPlayers, setMasterPlayers, toast }) => {
    const [editingPlayer, setEditingPlayer] = useState<MasterPlayer | null>(null);
    const [name, setName] = useState("");
    const [whatsapp, setWhatsapp] = useState("");

    useEffect(() => {
        if(editingPlayer) {
            setName(editingPlayer.name);
            setWhatsapp(editingPlayer.whatsappNumber);
        } else {
            setName("");
            setWhatsapp("");
        }
    }, [editingPlayer]);
    
    const handleSave = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Player name cannot be empty." });
            return;
        }

        const isDuplicate = masterPlayers.some(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== editingPlayer?.id);
        if (isDuplicate) {
            toast({ variant: "destructive", title: "Duplicate Player", description: "A player with this name already exists." });
            return;
        }

        if (editingPlayer) {
            setMasterPlayers(masterPlayers.map(p => p.id === editingPlayer.id ? {...p, name: trimmedName, whatsappNumber: whatsapp} : p));
        } else {
            setMasterPlayers([...masterPlayers, {id: `mp-${Date.now()}`, name: trimmedName, whatsappNumber: whatsapp}]);
        }
        setEditingPlayer(null);
    }

    const handleRemove = (id: string) => {
        setMasterPlayers(masterPlayers.filter(p => p.id !== id));
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="h-[90vh] max-h-[500px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Players</DialogTitle>
                    <DialogDescription>Add, edit, or remove players from your master list.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 border-b pb-4">
                    <Input placeholder="Player Name" value={name} onChange={e => setName(e.target.value)} />
                    <Input placeholder="WhatsApp Number" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                    <Button onClick={handleSave} className="w-full">{editingPlayer ? 'Save Changes' : 'Add to List'}</Button>
                    {editingPlayer && <Button variant="ghost" className="w-full" onClick={() => setEditingPlayer(null)}>Cancel Edit</Button>}
                </div>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className="space-y-2 py-4 pr-6">
                            {masterPlayers.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 bg-slate-100 rounded-md">
                                    <div><p>{p.name}</p><p className="text-xs text-muted-foreground">{p.whatsappNumber}</p></div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setEditingPlayer(p)}>Edit</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleRemove(p.id)}>Remove</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const LoadGameDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    gameHistory: GameHistory[],
    onLoadGame: (id: string) => void,
}> = ({isOpen, onOpenChange, gameHistory, onLoadGame}) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader><DialogTitle>Load Previous Game</DialogTitle></DialogHeader>
            <ScrollArea className="flex-grow">
                {gameHistory.length > 0 ? gameHistory.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-2 mb-2 bg-slate-100 rounded-md">
                        <div><p>{g.venue}</p><p className="text-xs text-muted-foreground">{format(new Date(g.timestamp), "PPP p")}</p></div>
                        <Button onClick={() => onLoadGame(g.id)}>Load</Button>
                    </div>
                )) : <p className="text-center text-muted-foreground py-10">No games in history.</p>}
            </ScrollArea>
             <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
    </Dialog>
)

const ReportsDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    activeGame: GameHistory | null,
    transfers: string[],
}> = ({ isOpen, onOpenChange, activeGame, transfers }) => {
    
    const handleExportPdf = () => {
        if (!activeGame) return;
        const pdf = new jsPDF();
        pdf.setFontSize(18);
        pdf.text(activeGame.venue, 14, 22);
        pdf.setFontSize(11);
        pdf.text(format(new Date(activeGame.timestamp), "PPP p"), 14, 30);

        autoTable(pdf, {
            startY: 40,
            head: [['Player', 'Buy-ins', 'Final Chips', 'Profit/Loss']],
            body: activeGame.players.map(p => [p.name, p.totalBuyIns, p.finalChips, p.profitLoss]),
        });
        
        const finalY = (pdf as any).lastAutoTable.finalY;
        pdf.setFontSize(14);
        pdf.text("Money Transfers", 14, finalY + 15);
        autoTable(pdf, {
            startY: finalY + 20,
            body: transfers.map(t => [t.replace(/<[^>]*>/g, '')]),
        })

        pdf.save(`${activeGame.venue.replace(/\s/g, '_')}_report.pdf`);
    };

    if (!activeGame) return null;
    
    const pieChartData = activeGame.players
        .filter(p => p.finalChips > 0)
        .map(p => ({ name: p.name, value: p.finalChips, fill: "" }));

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
            <ScrollArea className="max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>Game Report: {activeGame.venue}</DialogTitle>
                    <DialogDescription>{format(new Date(activeGame.timestamp), "PPP p")}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                    <Card><CardHeader><CardTitle>Player Performance</CardTitle></CardHeader><CardContent>
                        {activeGame.players.map(p => (
                            <div key={p.id} className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{p.name}</span>
                                    <span className={`font-bold ${p.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {p.profitLoss > 0 ? '+' : ''}{p.profitLoss.toFixed(0)} ({p.totalBuyIns > 0 ? ((p.profitLoss / p.totalBuyIns) * 100).toFixed(0) : 'inf'}%)
                                    </span>
                                </div>
                                <Progress value={p.totalBuyIns > 0 ? Math.min(100, Math.abs(p.profitLoss/p.totalBuyIns * 100)) : 100} 
                                className={p.profitLoss >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}/>
                            </div>
                        ))}
                    </CardContent></Card>
                    <Card><CardHeader><CardTitle>Final Chip Distribution</CardTitle></CardHeader><CardContent>
                        <ChipDistributionChart data={pieChartData} />
                    </CardContent></Card>
                     <Card><CardHeader><CardTitle>Money Transfers</CardTitle></CardHeader><CardContent className="space-y-2">
                        {transfers.map((t, i) => (
                            <div key={i} className="p-2 bg-slate-100 rounded-md text-sm" dangerouslySetInnerHTML={{ __html: t }} />
                        ))}
                    </CardContent></Card>
                     <Card><CardHeader><CardTitle>Game Log</CardTitle></CardHeader><CardContent>
                         <Table><TableHeader><TableRow><TableHead>Player</TableHead><TableHead>Amount</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                         <TableBody>
                             {activeGame.players.flatMap(p => p.buyIns.map(b => ({...b, playerName: p.name}))).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((b, i) => (
                                 <TableRow key={i}>
                                     <TableCell>{b.playerName}</TableCell>
                                     <TableCell>{b.amount}</TableCell>
                                     <TableCell>{format(new Date(b.timestamp), 'p')}</TableCell>
                                 </TableRow>
                             ))}
                         </TableBody>
                         </Table>
                     </CardContent></Card>
                </div>
                 <DialogFooter className="pr-4 pb-2">
                    <Button onClick={handleExportPdf}><FileDown className="h-4 w-4 mr-2" />Export PDF</Button>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

const AnomalyReportDialog: FC<{
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    player: Player | null,
    isLoading: boolean,
    result: { score: number; explanation: string } | null
}> = ({ isOpen, onOpenChange, player, isLoading, result }) => {
    
    const getScoreColor = (score: number) => {
        if (score < 0.3) return "text-green-600";
        if (score < 0.7) return "text-yellow-600";
        return "text-red-600";
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Anomaly Report for {player?.name}</DialogTitle>
                    <DialogDescription>AI-powered analysis of buy-in patterns.</DialogDescription>
                </DialogHeader>
                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Analyzing buy-ins...</p>
                    </div>
                )}
                {result && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Anomaly Score</p>
                            <p className={`text-6xl font-bold ${getScoreColor(result.score)}`}>{(result.score * 100).toFixed(0)}/100</p>
                        </div>
                        <Alert>
                            <ShieldAlert className="h-4 w-4"/>
                            <AlertTitle>AI Explanation</AlertTitle>
                            <AlertDescription>{result.explanation}</AlertDescription>
                        </Alert>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
