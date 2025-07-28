
'use client';

import { useState, useEffect, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Clock } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { WhatsappConfig } from '@/lib/types';


const WhatsappSettings: FC<{
  config: WhatsappConfig;
  onSave: (config: WhatsappConfig) => void;
  toast: ReturnType<typeof useToast>['toast'];
}> = ({ config, onSave, toast }) => {
  const [currentConfig, setCurrentConfig] = useState(config);

  useEffect(() => {
    setCurrentConfig(config);
  }, [config]);

  const handleChange = (field: keyof WhatsappConfig, value: string) => {
    setCurrentConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('whatsappConfig', JSON.stringify(currentConfig));
    onSave(currentConfig);
    toast({ title: 'Settings Saved', description: 'WhatsApp credentials have been updated for this session.' });
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>WhatsApp API Settings</CardTitle>
            <CardDescription>
                Enter your WhatsApp provider credentials here. These are stored locally in your browser.
                You can also set these as ENV variables on the server.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                id="apiUrl"
                placeholder="https://api.provider.com/send"
                value={currentConfig.apiUrl}
                onChange={(e) => handleChange('apiUrl', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="apiToken">API Token</Label>
                <Input
                id="apiToken"
                type="password"
                placeholder="Your secret API token"
                value={currentConfig.apiToken}
                onChange={(e) => handleChange('apiToken', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="senderMobile">Sender Mobile</Label>
                <Input
                id="senderMobile"
                placeholder="e.g., 14155552671"
                value={currentConfig.senderMobile}
                onChange={(e) => handleChange('senderMobile', e.target.value)}
                />
            </div>
            <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save WhatsApp Settings
            </Button>
        </CardContent>
    </Card>
  );
};


const DeckChangeTimerSettings: FC<{
    deckInterval: number;
    onIntervalChange: (interval: number) => void;
    toast: ReturnType<typeof useToast>['toast'];
}> = ({ deckInterval, onIntervalChange, toast }) => {
    const [currentInterval, setCurrentInterval] = useState(deckInterval);
    
    useEffect(() => {
        setCurrentInterval(deckInterval);
    }, [deckInterval]);

    const handleSave = () => {
        localStorage.setItem('deckChangeInterval', String(currentInterval));
        onIntervalChange(currentInterval);
        toast({ title: 'Timer Saved', description: `Deck change reminder set to every ${currentInterval} hour(s).` });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Deck Change Timer</CardTitle>
                <CardDescription>
                    Set a timer to remind you to change the card deck. A popup will appear 5 minutes before the time is up. The timer starts with the game.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <RadioGroup value={String(currentInterval)} onValueChange={(val) => setCurrentInterval(Number(val))}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="h1" />
                        <Label htmlFor="h1">1 Hour</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="h2" />
                        <Label htmlFor="h2">2 Hours</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3" id="h3" />
                        <Label htmlFor="h3">3 Hours</Label>
                    </div>
                </RadioGroup>
                <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Timer Setting
                </Button>
            </CardContent>
        </Card>
    );
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({ apiUrl: '', apiToken: '', senderMobile: '' });
  const [deckChangeInterval, setDeckChangeInterval] = useState(2); // default 2 hours

  useEffect(() => {
    const savedWhatsappConfig = localStorage.getItem("whatsappConfig");
    if (savedWhatsappConfig) {
      setWhatsappConfig(JSON.parse(savedWhatsappConfig));
    }
    const savedDeckInterval = localStorage.getItem("deckChangeInterval");
    if (savedDeckInterval) {
        setDeckChangeInterval(Number(savedDeckInterval));
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences.</p>
      </div>
      <DeckChangeTimerSettings
        deckInterval={deckChangeInterval}
        onIntervalChange={setDeckChangeInterval}
        toast={toast}
      />
      <WhatsappSettings
        config={whatsappConfig}
        onSave={setWhatsappConfig}
        toast={toast}
      />
    </div>
  );
}
