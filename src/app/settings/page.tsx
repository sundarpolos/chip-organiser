
'use client';

import { useState, useEffect, type FC, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Clock, Building, Plus, Pencil, Trash2, LogIn, Users, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { WhatsappConfig, Club, MasterPlayer, MasterVenue, GameHistory } from '@/lib/types';
import { getClubs, createClub, updateClub, deleteClub } from '@/services/club-service';
import { getMasterPlayers, saveMasterPlayer, deleteMasterPlayer } from '@/services/player-service';
import { getMasterVenues } from '@/services/venue-service';
import { getGameHistory } from '@/services/game-service';
import { Switch } from '@/components/ui/switch';
import { sendDeletePlayerOtp } from '@/ai/flows/send-delete-player-otp';
import { verifyWhatsappNumber } from '@/ai/flows/verify-whatsapp-number';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';


const SUPER_ADMIN_WHATSAPP = '919843350000';
const countries = [
    { name: 'Afghanistan', code: '93', flag: '🇦🇫' },
    { name: 'Albania', code: '355', flag: '🇦🇱' },
    { name: 'Algeria', code: '213', flag: '🇩🇿' },
    { name: 'American Samoa', code: '1-684', flag: '🇦🇸' },
    { name: 'Andorra', code: '376', flag: '🇦🇩' },
    { name: 'Angola', code: '244', flag: '🇦🇴' },
    { name: 'Anguilla', code: '1-264', flag: '🇦🇮' },
    { name: 'Antigua and Barbuda', code: '1-268', flag: '🇦🇬' },
    { name: 'Argentina', code: '54', flag: '🇦🇷' },
    { name: 'Armenia', code: '374', flag: '🇦🇲' },
    { name: 'Aruba', code: '297', flag: '🇦🇼' },
    { name: 'Australia', code: '61', flag: '🇦🇺' },
    { name: 'Austria', code: '43', flag: '🇦🇹' },
    { name: 'Azerbaijan', code: '994', flag: '🇦🇿' },
    { name: 'Bahamas', code: '1-242', flag: '🇧🇸' },
    { name: 'Bahrain', code: '973', flag: '🇧🇭' },
    { name: 'Bangladesh', code: '880', flag: '🇧🇩' },
    { name: 'Barbados', code: '1-246', flag: '🇧🇧' },
    { name: 'Belarus', code: '375', flag: '🇧🇾' },
    { name: 'Belgium', code: '32', flag: '🇧🇪' },
    { name: 'Belize', code: '501', flag: '🇧🇿' },
    { name: 'Benin', code: '229', flag: '🇧🇯' },
    { name: 'Bermuda', code: '1-441', flag: '🇧🇲' },
    { name: 'Bhutan', code: '975', flag: '🇧🇹' },
    { name: 'Bolivia', code: '591', flag: '🇧🇴' },
    { name: 'Bosnia and Herzegovina', code: '387', flag: '🇧🇦' },
    { name: 'Botswana', code: '267', flag: '🇧🇼' },
    { name: 'Brazil', code: '55', flag: '🇧🇷' },
    { name: 'British Indian Ocean Territory', code: '246', flag: '🇮🇴' },
    { name: 'British Virgin Islands', code: '1-284', flag: '🇻🇬' },
    { name: 'Brunei', code: '673', flag: '🇧🇳' },
    { name: 'Bulgaria', code: '359', flag: '🇧🇬' },
    { name: 'Burkina Faso', code: '226', flag: '🇧🇫' },
    { name: 'Burundi', code: '257', flag: '🇧🇮' },
    { name: 'Cambodia', code: '855', flag: '🇰🇭' },
    { name: 'Cameroon', code: '237', flag: '🇨🇲' },
    { name: 'Canada', code: '1', flag: '🇨🇦' },
    { name: 'Cape Verde', code: '238', flag: '🇨🇻' },
    { name: 'Cayman Islands', code: '1-345', flag: '🇰🇾' },
    { name: 'Central African Republic', code: '236', flag: '🇨🇫' },
    { name: 'Chad', code: '235', flag: '🇹🇩' },
    { name: 'Chile', code: '56', flag: '🇨🇱' },
    { name: 'China', code: '86', flag: '🇨🇳' },
    { name: 'Christmas Island', code: '61', flag: '🇨🇽' },
    { name: 'Cocos Islands', code: '61', flag: '🇨🇨' },
    { name: 'Colombia', code: '57', flag: '🇨🇴' },
    { name: 'Comoros', code: '269', flag: '🇰🇲' },
    { name: 'Cook Islands', code: '682', flag: '🇨🇰' },
    { name: 'Costa Rica', code: '506', flag: '🇨🇷' },
    { name: 'Croatia', code: '385', flag: '🇭🇷' },
    { name: 'Cuba', code: '53', flag: '🇨🇺' },
    { name: 'Curacao', code: '599', flag: '🇨🇼' },
    { name: 'Cyprus', code: '357', flag: '🇨🇾' },
    { name: 'Czech Republic', code: '420', flag: '🇨🇿' },
    { name: 'Democratic Republic of the Congo', code: '243', flag: '🇨🇩' },
    { name: 'Denmark', code: '45', flag: '🇩🇰' },
    { name: 'Djibouti', code: '253', flag: '🇩🇯' },
    { name: 'Dominica', code: '1-767', flag: '🇩🇲' },
    { name: 'Dominican Republic', code: '1-809', flag: '🇩🇴' },
    { name: 'East Timor', code: '670', flag: '🇹🇱' },
    { name: 'Ecuador', code: '593', flag: '🇪🇨' },
    { name: 'Egypt', code: '20', flag: '🇪🇬' },
    { name: 'El Salvador', code: '503', flag: '🇸🇻' },
    { name: 'Equatorial Guinea', code: '240', flag: '🇬🇶' },
    { name: 'Eritrea', code: '291', flag: '🇪🇷' },
    { name: 'Estonia', code: '372', flag: '🇪🇪' },
    { name: 'Ethiopia', code: '251', flag: '🇪🇹' },
    { name: 'Falkland Islands', code: '500', flag: '🇫🇰' },
    { name: 'Faroe Islands', code: '298', flag: '🇫🇴' },
    { name: 'Fiji', code: '679', flag: '🇫🇯' },
    { name: 'Finland', code: '358', flag: '🇫🇮' },
    { name: 'France', code: '33', flag: '🇫🇷' },
    { name: 'French Polynesia', code: '689', flag: '🇵🇫' },
    { name: 'Gabon', code: '241', flag: '🇬🇦' },
    { name: 'Gambia', code: '220', flag: '🇬🇲' },
    { name: 'Georgia', code: '995', flag: '🇬🇪' },
    { name: 'Germany', code: '49', flag: '🇩🇪' },
    { name: 'Ghana', code: '233', flag: '🇬🇭' },
    { name: 'Gibraltar', code: '350', flag: '🇬🇮' },
    { name: 'Greece', code: '30', flag: '🇬🇷' },
    { name: 'Greenland', code: '299', flag: '🇬🇱' },
    { name: 'Grenada', code: '1-473', flag: '🇬🇩' },
    { name: 'Guam', code: '1-671', flag: '🇬🇺' },
    { name: 'Guatemala', code: '502', flag: '🇬🇹' },
    { name: 'Guernsey', code: '44-1481', flag: '🇬🇬' },
    { name: 'Guinea', code: '224', flag: '🇬🇳' },
    { name: 'Guinea-Bissau', code: '245', flag: '🇬🇼' },
    { name: 'Guyana', code: '592', flag: '🇬🇾' },
    { name: 'Haiti', code: '509', flag: '🇭🇹' },
    { name: 'Honduras', code: '504', flag: '🇭🇳' },
    { name: 'Hong Kong', code: '852', flag: '🇭🇰' },
    { name: 'Hungary', code: '36', flag: '🇭🇺' },
    { name: 'Iceland', code: '354', flag: '🇮🇸' },
    { name: 'India', code: '91', flag: '🇮🇳' },
    { name: 'Indonesia', code: '62', flag: '🇮🇩' },
    { name: 'Iran', code: '98', flag: '🇮🇷' },
    { name: 'Iraq', code: '964', flag: '🇮🇶' },
    { name: 'Ireland', code: '353', flag: '🇮🇪' },
    { name: 'Isle of Man', code: '44-1624', flag: '🇮🇲' },
    { name: 'Israel', code: '972', flag: '🇮🇱' },
    { name: 'Italy', code: '39', flag: '🇮🇹' },
    { name: 'Ivory Coast', code: '225', flag: '🇨🇮' },
    { name: 'Jamaica', code: '1-876', flag: '🇯🇲' },
    { name: 'Japan', code: '81', flag: '🇯🇵' },
    { name: 'Jersey', code: '44-1534', flag: '🇯🇪' },
    { name: 'Jordan', code: '962', flag: '🇯🇴' },
    { name: 'Kazakhstan', code: '7', flag: '🇰🇿' },
    { name: 'Kenya', code: '254', flag: '🇰🇪' },
    { name: 'Kiribati', code: '686', flag: '🇰🇮' },
    { name: 'Kosovo', code: '383', flag: '🇽🇰' },
    { name: 'Kuwait', code: '965', flag: '🇰🇼' },
    { name: 'Kyrgyzstan', code: '996', flag: '🇰🇬' },
    { name: 'Laos', code: '856', flag: '🇱🇦' },
    { name: 'Latvia', code: '371', flag: '🇱🇻' },
    { name: 'Lebanon', code: '961', flag: '🇱🇧' },
    { name: 'Lesotho', code: '266', flag: '🇱🇸' },
    { name: 'Liberia', code: '231', flag: '🇱🇷' },
    { name: 'Libya', code: '218', flag: '🇱🇾' },
    { name: 'Liechtenstein', code: '423', flag: '🇱🇮' },
    { name: 'Lithuania', code: '370', flag: '🇱🇹' },
    { name: 'Luxembourg', code: '352', flag: '🇱🇺' },
    { name: 'Macau', code: '853', flag: '🇲🇴' },
    { name: 'Macedonia', code: '389', flag: '🇲🇰' },
    { name: 'Madagascar', code: '261', flag: '🇲🇬' },
    { name: 'Malawi', code: '265', flag: '🇲🇼' },
    { name: 'Malaysia', code: '60', flag: '🇲🇾' },
    { name: 'Maldives', code: '960', flag: '🇲🇻' },
    { name: 'Mali', code: '223', flag: '🇲🇱' },
    { name: 'Malta', code: '356', flag: '🇲🇹' },
    { name: 'Marshall Islands', code: '692', flag: '🇲🇭' },
    { name: 'Mauritania', code: '222', flag: '🇲🇷' },
    { name: 'Mauritius', code: '230', flag: '🇲🇺' },
    { name: 'Mayotte', code: '262', flag: '🇾🇹' },
    { name: 'Mexico', code: '52', flag: '🇲🇽' },
    { name: 'Micronesia', code: '691', flag: '🇫🇲' },
    { name: 'Moldova', code: '373', flag: '🇲🇩' },
    { name: 'Monaco', code: '377', flag: '🇲🇨' },
    { name: 'Mongolia', code: '976', flag: '🇲🇳' },
    { name: 'Montenegro', code: '382', flag: '🇲🇪' },
    { name: 'Montserrat', code: '1-664', flag: '🇲🇸' },
    { name: 'Morocco', code: '212', flag: '🇲🇦' },
    { name: 'Mozambique', code: '258', flag: '🇲🇿' },
    { name: 'Myanmar', code: '95', flag: '🇲🇲' },
    { name: 'Namibia', code: '264', flag: '🇳🇦' },
    { name: 'Nauru', code: '674', flag: '🇳🇷' },
    { name: 'Nepal', code: '977', flag: '🇳🇵' },
    { name: 'Netherlands', code: '31', flag: '🇳🇱' },
    { name: 'Netherlands Antilles', code: '599', flag: '🇧🇶' },
    { name: 'New Caledonia', code: '687', flag: '🇳🇨' },
    { name: 'New Zealand', code: '64', flag: '🇳🇿' },
    { name: 'Nicaragua', code: '505', flag: '🇳🇮' },
    { name: 'Niger', code: '227', flag: '🇳🇪' },
    { name: 'Nigeria', code: '234', flag: '🇳🇬' },
    { name: 'Niue', code: '683', flag: '🇳🇺' },
    { name: 'Northern Mariana Islands', code: '1-670', flag: '🇲🇵' },
    { name: 'North Korea', code: '850', flag: '🇰🇵' },
    { name: 'Norway', code: '47', flag: '🇳🇴' },
    { name: 'Oman', code: '968', flag: '🇴🇲' },
    { name: 'Pakistan', code: '92', flag: '🇵🇰' },
    { name: 'Palau', code: '680', flag: '🇵🇼' },
    { name: 'Palestine', code: '970', flag: '🇵🇸' },
    { name: 'Panama', code: '507', flag: '🇵🇦' },
    { name: 'Papua New Guinea', code: '675', flag: '🇵🇬' },
    { name: 'Paraguay', code: '595', flag: '🇵🇾' },
    { name: 'Peru', code: '51', flag: '🇵🇪' },
    { name: 'Philippines', code: '63', flag: '🇵🇭' },
    { name: 'Pitcairn', code: '64', flag: '🇵🇳' },
    { name: 'Poland', code: '48', flag: '🇵🇱' },
    { name: 'Portugal', code: '351', flag: '🇵🇹' },
    { name: 'Puerto Rico', code: '1-787', flag: '🇵🇷' },
    { name: 'Qatar', code: '974', flag: '🇶🇦' },
    { name: 'Republic of the Congo', code: '242', flag: '🇨🇬' },
    { name: 'Reunion', code: '262', flag: '🇷🇪' },
    { name: 'Romania', code: '40', flag: '🇷🇴' },
    { name: 'Russia', code: '7', flag: '🇷🇺' },
    { name: 'Rwanda', code: '250', flag: '🇷🇼' },
    { name: 'Saint Barthelemy', code: '590', flag: '🇧🇱' },
    { name: 'Saint Helena', code: '290', flag: '🇸🇭' },
    { name: 'Saint Kitts and Nevis', code: '1-869', flag: '🇰🇳' },
    { name: 'Saint Lucia', code: '1-758', flag: '🇱🇨' },
    { name: 'Saint Martin', code: '590', flag: '🇲🇫' },
    { name: 'Saint Pierre and Miquelon', code: '508', flag: '🇵🇲' },
    { name: 'Saint Vincent and the Grenadines', code: '1-784', flag: '🇻🇨' },
    { name: 'Samoa', code: '685', flag: '🇼🇸' },
    { name: 'San Marino', code: '378', flag: '🇸🇲' },
    { name: 'Sao Tome and Principe', code: '239', flag: '🇸🇹' },
    { name: 'Saudi Arabia', code: '966', flag: '🇸🇦' },
    { name: 'Senegal', code: '221', flag: '🇸🇳' },
    { name: 'Serbia', code: '381', flag: '🇷🇸' },
    { name: 'Seychelles', code: '248', flag: '🇸🇨' },
    { name: 'Sierra Leone', code: '232', flag: '🇸🇱' },
    { name: 'Singapore', code: '65', flag: '🇸🇬' },
    { name: 'Sint Maarten', code: '1-721', flag: '🇸🇽' },
    { name: 'Slovakia', code: '421', flag: '🇸🇰' },
    { name: 'Slovenia', code: '386', flag: '🇸🇮' },
    { name: 'Solomon Islands', code: '677', flag: '🇸🇧' },
    { name: 'Somalia', code: '252', flag: '🇸🇴' },
    { name: 'South Africa', code: '27', flag: '🇿🇦' },
    { name: 'South Korea', code: '82', flag: '🇰🇷' },
    { name: 'South Sudan', code: '211', flag: '🇸🇸' },
    { name: 'Spain', code: '34', flag: '🇪🇸' },
    { name: 'Sri Lanka', code: '94', flag: '🇱🇰' },
    { name: 'Sudan', code: '249', flag: '🇸🇩' },
    { name: 'Suriname', code: '597', flag: '🇸🇷' },
    { name: 'Svalbard and Jan Mayen', code: '47', flag: '🇸🇯' },
    { name: 'Swaziland', code: '268', flag: '🇸🇿' },
    { name: 'Sweden', code: '46', flag: '🇸🇪' },
    { name: 'Switzerland', code: '41', flag: '🇨🇭' },
    { name: 'Syria', code: '963', flag: '🇸🇾' },
    { name: 'Taiwan', code: '886', flag: '🇹🇼' },
    { name: 'Tajikistan', code: '992', flag: '🇹🇯' },
    { name: 'Tanzania', code: '255', flag: '🇹🇿' },
    { name: 'Thailand', code: '66', flag: '🇹🇭' },
    { name: 'Togo', code: '228', flag: '🇹🇬' },
    { name: 'Tokelau', code: '690', flag: '🇹🇰' },
    { name: 'Tonga', code: '676', flag: '🇹🇴' },
    { name: 'Trinidad and Tobago', code: '1-868', flag: '🇹🇹' },
    { name: 'Tunisia', code: '216', flag: '🇹🇳' },
    { name: 'Turkey', code: '90', flag: '🇹🇷' },
    { name: 'Turkmenistan', code: '993', flag: '🇹🇲' },
    { name: 'Turks and Caicos Islands', code: '1-649', flag: '🇹🇨' },
    { name: 'Tuvalu', code: '688', flag: '🇹🇻' },
    { name: 'U.S. Virgin Islands', code: '1-340', flag: '🇻🇮' },
    { name: 'Uganda', code: '256', flag: '🇺🇬' },
    { name: 'Ukraine', code: '380', flag: '🇺🇦' },
    { name: 'United Arab Emirates', code: '971', flag: '🇦🇪' },
    { name: 'United Kingdom', code: '44', flag: '🇬🇧' },
    { name: 'United States', code: '1', flag: '🇺🇸' },
    { name: 'Uruguay', code: '598', flag: '🇺🇾' },
    { name: 'Uzbekistan', code: '998', flag: '🇺🇿' },
    { name: 'Vanuatu', code: '678', flag: '🇻🇺' },
    { name: 'Vatican', code: '379', flag: '🇻🇦' },
    { name: 'Venezuela', code: '58', flag: '🇻🇪' },
    { name: 'Vietnam', code: '84', flag: '🇻🇳' },
    { name: 'Wallis and Futuna', code: '681', flag: '🇼🇫' },
    { name: 'Western Sahara', code: '212', flag: '🇪🇭' },
    { name: 'Yemen', code: '967', flag: '🇾🇪' },
    { name: 'Zambia', code: '260', flag: '🇿🇲' },
    { name: 'Zimbabwe', code: '263', flag: '🇿🇼' },
].map(c => ({...c, code: c.code.replace('-', '')}));


const CountryCodePicker: FC<{
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
}> = ({ value, onValueChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const selectedCountry = countries.find(c => c.code === value) || countries.find(c => c.name === 'India');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-auto justify-start"
                    disabled={disabled}
                >
                    {selectedCountry?.flag} +{selectedCountry?.code}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                            <ScrollArea className="h-48">
                                {countries.map((country) => (
                                <CommandItem
                                    key={country.code}
                                    value={`${country.name} (${country.code})`}
                                    onSelect={() => {
                                        onValueChange(country.code)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === country.code ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {country.flag} {country.name} (+{country.code})
                                </CommandItem>
                                ))}
                            </ScrollArea>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}


const ClubManagement: FC<{
    clubs: Club[];
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
    players: MasterPlayer[];
    venues: MasterVenue[];
    games: GameHistory[];
    toast: ReturnType<typeof useToast>['toast'];
    currentUser: MasterPlayer;
}> = ({ clubs, setClubs, players, venues, games, toast, currentUser }) => {
    const router = useRouter();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState<Club | null>(null);
    const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

    const handleEnterDashboard = (clubId: string) => {
        localStorage.setItem('chip-maestro-clubId', clubId);
        router.push(`/dashboard`);
    };

    const handleDeleteClub = async () => {
        if (!clubToDelete) return;

        try {
            await deleteClub(clubToDelete.id);
            setClubs(prev => prev.filter(c => c.id !== clubToDelete.id));
            toast({ title: 'Club Deleted', description: `"${clubToDelete.name}" has been permanently deleted.` });
        } catch (error) {
            console.error('Failed to delete club', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the club.' });
        } finally {
            setClubToDelete(null);
        }
    };

    const getClubStats = (clubId: string) => {
        const playerCount = players.filter(p => p.clubId === clubId).length;
        const venueCount = venues.filter(v => v.clubId === clubId).length;
        const gameCount = games.filter(g => g.clubId === clubId).length;
        return { playerCount, venueCount, gameCount };
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Club Management</CardTitle>
                        <Button onClick={() => setCreateModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Club</Button>
                    </div>
                    <CardDescription>Create, edit, and manage all clubs in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Club Name</TableHead>
                                <TableHead>Players</TableHead>
                                <TableHead>Venues</TableHead>
                                <TableHead>Games</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clubs.map(club => {
                                const { playerCount, venueCount, gameCount } = getClubStats(club.id);
                                return (
                                <TableRow key={club.id}>
                                    <TableCell className="font-medium">{club.name}</TableCell>
                                    <TableCell>{playerCount}</TableCell>
                                    <TableCell>{venueCount}</TableCell>
                                    <TableCell>{gameCount}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEnterDashboard(club.id)}>
                                            <LogIn className="mr-2 h-4 w-4" /> Enter
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(club)}><Pencil className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the <strong>{club.name}</strong> club and all associated players, games, and venues.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => { setClubToDelete(club); handleDeleteClub(); }}>Continue</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CreateEditClubDialog
                isOpen={isCreateModalOpen}
                onOpenChange={setCreateModalOpen}
                players={players}
                currentUser={currentUser}
                onSave={async (newClub) => {
                    setClubs(prev => [...prev, newClub].sort((a,b) => a.name.localeCompare(b.name)));
                }}
                toast={toast}
            />
            {isEditModalOpen && (
                 <CreateEditClubDialog
                    isOpen={!!isEditModalOpen}
                    onOpenChange={() => setEditModalOpen(null)}
                    players={players}
                    currentUser={currentUser}
                    onSave={async (updatedClub) => {
                        setClubs(prev => prev.map(c => c.id === updatedClub.id ? updatedClub : c));
                    }}
                    toast={toast}
                    clubToEdit={isEditModalOpen}
                />
            )}
        </>
    );
};

const CreateEditClubDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    players: MasterPlayer[];
    currentUser: MasterPlayer;
    onSave: (club: Club) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
    clubToEdit?: Club | null;
}> = ({ isOpen, onOpenChange, players, currentUser, onSave, toast, clubToEdit }) => {
    const [clubName, setClubName] = useState('');
    const [adminId, setAdminId] = useState('');
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsappConfig>({
        apiUrl: '', apiToken: '', senderMobile: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (clubToEdit) {
            setClubName(clubToEdit.name);
            setWhatsappConfig(clubToEdit.whatsappConfig || { apiUrl: '', apiToken: '', senderMobile: '' });
            const clubAdmin = players.find(p => p.clubId === clubToEdit.id && p.isAdmin);
            if (clubAdmin) {
                setAdminId(clubAdmin.id);
            }
        } else {
            setClubName('');
            setAdminId('');
            setWhatsappConfig({ apiUrl: '', apiToken: '', senderMobile: '' });
        }
    }, [clubToEdit, players]);
    
    const nonAdminPlayers = players.filter(p => !p.isAdmin || p.whatsappNumber === SUPER_ADMIN_WHATSAPP);

    const handleSave = async () => {
        if (!clubName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please provide a club name.' });
            return;
        }

        setIsSaving(true);
        try {
            if (clubToEdit) { // Editing existing club
                const updatedClubData: Club = { ...clubToEdit, name: clubName, whatsappConfig };
                const savedClub = await updateClub(updatedClubData);
                toast({ title: 'Club Updated', description: `"${clubName}" has been updated.`});
                onSave(savedClub);
            } else { // Creating new club
                if (!adminId) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Please select an admin for the new club.' });
                    setIsSaving(false);
                    return;
                }
                const newClubPayload: Omit<Club, 'id'> = {
                    name: clubName,
                    ownerId: currentUser.id,
                    whatsappConfig,
                };
                const newClub = await createClub(newClubPayload);
                
                // Promote selected player to admin for that club
                const playerToPromote = players.find(p => p.id === adminId);
                if (playerToPromote) {
                    await saveMasterPlayer({ ...playerToPromote, isAdmin: true, clubId: newClub.id });
                }
                toast({ title: 'Club Created', description: `"${clubName}" has been created successfully.`});
                onSave(newClub);
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save club', error);
            const errorMessage = error instanceof Error ? error.message : 'Could not save the club.';
            toast({ variant: 'destructive', title: 'Error', description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{clubToEdit ? 'Edit Club' : 'Create New Club'}</DialogTitle>
                    <DialogDescription>
                        {clubToEdit ? 'Update the details for this club.' : 'Enter a name for the new club and assign an admin.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="club-name">Club Name</Label>
                        <Input id="club-name" value={clubName} onChange={e => setClubName(e.target.value)} />
                    </div>
                    {!clubToEdit && (
                         <div className="space-y-2">
                            <Label htmlFor="club-admin">Club Admin</Label>
                             <Select value={adminId} onValueChange={setAdminId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a player to be admin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {nonAdminPlayers.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <Accordion type="single" collapsible>
                        <AccordionItem value="whatsapp">
                            <AccordionTrigger>WhatsApp API Settings</AccordionTrigger>
                            <AccordionContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="wa-api-url">API URL</Label>
                                    <Input id="wa-api-url" value={whatsappConfig.apiUrl} onChange={e => setWhatsappConfig(c => ({...c, apiUrl: e.target.value}))} placeholder="e.g., https://api.provider.com/send" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-api-token">API Token</Label>
                                    <Input id="wa-api-token" value={whatsappConfig.apiToken} onChange={e => setWhatsappConfig(c => ({...c, apiToken: e.target.value}))} placeholder="Your API token" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-sender-mobile">Sender Mobile</Label>
                                    <Input id="wa-sender-mobile" value={whatsappConfig.senderMobile} onChange={e => setWhatsappConfig(c => ({...c, senderMobile: e.target.value}))} placeholder="e.g., 14155552671" />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {clubToEdit ? 'Save Changes' : 'Create Club'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


const PlayerManagement: FC<{
    players: MasterPlayer[];
    setPlayers: React.Dispatch<React.SetStateAction<MasterPlayer[]>>;
    clubs: Club[];
    toast: ReturnType<typeof useToast>['toast'];
    isSuperAdmin: boolean;
    currentUser: MasterPlayer;
}> = ({ players, setPlayers, clubs, toast, isSuperAdmin, currentUser }) => {
    const [playerToEdit, setPlayerToEdit] = useState<MasterPlayer | null>(null);
    const [isCreatePlayerOpen, setCreatePlayerOpen] = useState(false);

    const handleSavePlayer = async (player: MasterPlayer) => {
        try {
            const savedPlayer = await saveMasterPlayer(player);
            setPlayers(prev => prev.map(p => p.id === savedPlayer.id ? savedPlayer : p));
            toast({ title: 'Player Saved', description: `Details for ${player.name} have been updated.` });
        } catch (error) {
            console.error('Failed to save player', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save player details.' });
        }
    };
    
    const handleDeletePlayer = async (playerId: string) => {
        try {
            await deleteMasterPlayer(playerId);
            setPlayers(prev => prev.filter(p => p.id !== playerId));
            const deletedPlayer = players.find(p => p.id === playerId);
            toast({ title: 'Player Deleted', description: `Player "${deletedPlayer?.name}" has been removed.`});
        } catch (error) {
            console.error('Failed to delete player', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the player.'});
        }
    }

    const playersByClub = useMemo(() => {
        const grouped = new Map<string, MasterPlayer[]>();
        
        // Group players by club ID
        players.forEach(player => {
            const clubId = player.clubId || 'unassigned';
            if (!grouped.has(clubId)) {
                grouped.set(clubId, []);
            }
            grouped.get(clubId)!.push(player);
        });

        // Sort players within each group alphabetically by name
        grouped.forEach((playerList) => {
            playerList.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Convert map to array and sort clubs by name
        const clubMap = new Map(clubs.map(c => [c.id, c.name]));
        return Array.from(grouped.entries()).sort((a, b) => {
            const clubNameA = clubMap.get(a[0]) || 'zzz';
            const clubNameB = clubMap.get(b[0]) || 'zzz';
            return clubNameA.localeCompare(clubNameB);
        });

    }, [players, clubs]);

    const getClubName = (clubId: string) => {
        return clubs.find(c => c.id === clubId)?.name || 'Unassigned';
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Player Management</CardTitle>
                        {(currentUser.isAdmin) && (
                           <Button onClick={() => setCreatePlayerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Player</Button>
                        )}
                    </div>
                    <CardDescription>Edit player details, including their assigned club and roles. Players are grouped by club.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        {playersByClub.map(([clubId, clubPlayers]) => (
                            <AccordionItem value={clubId} key={clubId}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-lg">{getClubName(clubId)}</span>
                                        <span className="text-sm text-muted-foreground">({clubPlayers.length} players)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Player Name</TableHead>
                                                <TableHead>WhatsApp Number</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clubPlayers.map(player => (
                                                <TableRow key={player.id}>
                                                    <TableCell className="font-medium">{player.name}</TableCell>
                                                    <TableCell>{player.whatsappNumber}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setPlayerToEdit(player)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
            <EditPlayerDialog
                isOpen={!!playerToEdit}
                onOpenChange={() => setPlayerToEdit(null)}
                player={playerToEdit}
                clubs={clubs}
                onSave={handleSavePlayer}
                onDelete={handleDeletePlayer}
                toast={toast}
                isSuperAdmin={isSuperAdmin}
            />
            <CreatePlayerDialog
                isOpen={isCreatePlayerOpen}
                onOpenChange={setCreatePlayerOpen}
                clubs={clubs}
                onSave={(newPlayer) => {
                    setPlayers(prev => [...prev, newPlayer]);
                }}
                toast={toast}
                isSuperAdmin={isSuperAdmin}
                currentUser={currentUser}
            />
        </>
    );
};


const EditPlayerDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    player: MasterPlayer | null;
    clubs: Club[];
    onSave: (player: MasterPlayer) => Promise<void>;
    onDelete: (playerId: string) => Promise<void>;
    toast: ReturnType<typeof useToast>['toast'];
    isSuperAdmin: boolean;
}> = ({ isOpen, onOpenChange, player, clubs, onSave, onDelete, toast, isSuperAdmin }) => {
    const [editablePlayer, setEditablePlayer] = useState<MasterPlayer | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [countryCode, setCountryCode] = useState('91');
    const [mobileNumber, setMobileNumber] = useState('');

    // Delete OTP state
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (player) {
            setEditablePlayer(JSON.parse(JSON.stringify(player)));
            const fullNumber = player.whatsappNumber || '';
            const indiaCode = '91';
            if (fullNumber.startsWith(indiaCode) && fullNumber.length > indiaCode.length) {
                setCountryCode(indiaCode);
                setMobileNumber(fullNumber.substring(indiaCode.length));
            } else {
                setCountryCode(indiaCode);
                setMobileNumber(fullNumber);
            }
        }
        // Reset OTP state when dialog opens or player changes
        setDeleteConfirmOpen(false);
        setIsOtpSent(false);
        setOtp("");
        setSentOtp("");
        setIsSendingOtp(false);
        setIsDeleting(false);
    }, [player, isOpen]);

    const handleSave = async () => {
        if (!editablePlayer?.name || !editablePlayer.clubId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Player name and club are required.' });
            return;
        }
        const fullWhatsappNumber = `${countryCode}${mobileNumber}`;
        const playerToSave = { ...editablePlayer, whatsappNumber: fullWhatsappNumber };
        setIsSaving(true);
        await onSave(playerToSave);
        setIsSaving(false);
        onOpenChange(false);
    };
    
    const handleDeleteRequest = async () => {
        if (!editablePlayer) return;
        setIsSendingOtp(true);
        try {
            const result = await sendDeletePlayerOtp({
                playerToDeleteName: editablePlayer.name,
                whatsappConfig: {} // Use env variables
            });
            if (result.success && result.otp) {
                setSentOtp(result.otp);
                setIsOtpSent(true);
                toast({ title: 'OTP Sent', description: 'An OTP has been sent to the Super Admin.' });
            } else {
                throw new Error(result.error || 'Failed to send OTP.');
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'OTP Error', description: e.message });
            setDeleteConfirmOpen(false); // Close the confirm dialog on error
        } finally {
            setIsSendingOtp(false);
        }
    };
    
    const confirmDelete = async () => {
        if (otp !== sentOtp) {
            toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The OTP is incorrect.' });
            return;
        }
        setIsDeleting(true);
        if (editablePlayer) {
            await onDelete(editablePlayer.id);
        }
        setIsDeleting(false);
        onOpenChange(false);
    };


    if (!editablePlayer) return null;

    if (isDeleteConfirmOpen) {
        return (
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion: {editablePlayer.name}</DialogTitle>
                        <DialogDescription>
                          {isOtpSent 
                            ? "Enter the OTP sent to the Super Admin's WhatsApp to finalize the deletion."
                            : "Are you sure? This action will permanently delete this player. An OTP will be sent to the Super Admin to confirm."
                          }
                        </DialogDescription>
                    </DialogHeader>
                    {isOtpSent ? (
                        <div className="py-4 space-y-2">
                           <Label htmlFor="delete-otp">Admin OTP</Label>
                           <Input id="delete-otp" value={otp} onChange={e => setOtp(e.target.value)} placeholder="4-digit OTP" />
                        </div>
                    ) : null}
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        {isOtpSent ? (
                             <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="animate-spin" /> : 'Confirm & Delete'}
                            </Button>
                        ) : (
                            <Button variant="destructive" onClick={handleDeleteRequest} disabled={isSendingOtp}>
                                {isSendingOtp ? <Loader2 className="animate-spin" /> : 'Send OTP to Delete'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Player: {player?.name}</DialogTitle>
                    <DialogDescription>
                        Update the player's details and permissions below.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-name">Player Name</Label>
                        <Input
                            id="edit-player-name"
                            value={editablePlayer.name}
                            onChange={(e) => setEditablePlayer(p => p ? { ...p, name: e.target.value } : null)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-whatsapp">WhatsApp Number</Label>
                        <div className="flex gap-2">
                            <CountryCodePicker value={countryCode} onValueChange={setCountryCode} />
                            <Input
                                id="edit-player-whatsapp-number"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="10-digit number"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-player-club">Club</Label>
                        <Select
                            value={editablePlayer.clubId}
                            onValueChange={(value) => setEditablePlayer(p => p ? { ...p, clubId: value } : null)}
                            disabled={!isSuperAdmin}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="space-y-3 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is-admin">Is Admin</Label>
                                <Switch
                                    id="is-admin"
                                    checked={editablePlayer.isAdmin}
                                    onCheckedChange={(checked) => setEditablePlayer(p => p ? { ...p, isAdmin: checked } : null)}
                                    disabled={editablePlayer.whatsappNumber === SUPER_ADMIN_WHATSAPP}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is-banker">Is Banker</Label>
                                <Switch
                                    id="is-banker"
                                    checked={!!editablePlayer.isBanker}
                                    onCheckedChange={(checked) => setEditablePlayer(p => p ? { ...p, isBanker: checked } : null)}
                                />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="is-active">Is Active</Label>
                                <Switch
                                    id="is-active"
                                    checked={editablePlayer.isActive ?? true}
                                    onCheckedChange={(checked) => setEditablePlayer(p => p ? { ...p, isActive: checked } : null)}
                                    disabled={editablePlayer.whatsappNumber === SUPER_ADMIN_WHATSAPP}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="justify-between">
                     <div>
                        {isSuperAdmin && player?.whatsappNumber !== SUPER_ADMIN_WHATSAPP && (
                            <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Player
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const CreatePlayerDialog: FC<{
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    clubs: Club[];
    onSave: (player: MasterPlayer) => void;
    toast: ReturnType<typeof useToast>['toast'];
    isSuperAdmin: boolean;
    currentUser: MasterPlayer | null;
}> = ({ isOpen, onOpenChange, clubs, onSave, toast, isSuperAdmin, currentUser }) => {
    const [name, setName] = useState('');
    const [countryCode, setCountryCode] = useState('91');
    const [mobileNumber, setMobileNumber] = useState('');
    const [clubId, setClubId] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isBanker, setIsBanker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'verified' | 'failed'>('idle');
    const [verificationError, setVerificationError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setName('');
            setCountryCode('91');
            setMobileNumber('');
            setIsAdmin(false);
            setIsBanker(false);
            setVerificationStatus('idle');
            setVerificationError(null);
            // Set default club based on role
            if (!isSuperAdmin && currentUser?.clubId) {
                setClubId(currentUser.clubId);
            } else {
                setClubId('');
            }
        }
    }, [isOpen, isSuperAdmin, currentUser]);

    const handleVerifyNumber = async () => {
        const fullNumber = `${countryCode}${mobileNumber}`;
        if (!mobileNumber) {
            setVerificationStatus('idle');
            return;
        }
        setVerificationStatus('loading');
        setVerificationError(null);
        try {
            const result = await verifyWhatsappNumber({ whatsappNumber: fullNumber });
            if (result.success) {
                setVerificationStatus(result.isOnWhatsApp ? 'verified' : 'failed');
                if (!result.isOnWhatsApp) {
                    setVerificationError('This number is not on WhatsApp.');
                }
            } else {
                throw new Error(result.error || 'Verification check failed.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setVerificationStatus('failed');
            setVerificationError(errorMessage);
            toast({ variant: 'destructive', title: 'Verification Failed', description: errorMessage });
        }
    };
    
    // Reset verification status when number changes
    useEffect(() => {
        setVerificationStatus('idle');
        setVerificationError(null);
    }, [countryCode, mobileNumber]);

    const handleSave = async () => {
        if (!name || !clubId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Player name and club are required.' });
            return;
        }

        setIsSaving(true);
        try {
            const fullWhatsappNumber = `${countryCode}${mobileNumber}`;
            const newPlayer: Omit<MasterPlayer, 'id'> = {
                name,
                whatsappNumber: fullWhatsappNumber,
                isAdmin,
                isBanker,
                isActive: true,
                clubId,
            };
            const savedPlayer = await saveMasterPlayer(newPlayer);
            onSave(savedPlayer);
            toast({ title: 'Player Created', description: `Successfully created ${name}.` });
            onOpenChange(false);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Could not create the player.';
            toast({ variant: 'destructive', title: 'Creation Failed', description: errorMessage });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Player</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new player and assign them to a club.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="create-player-name">Player Name</Label>
                        <Input id="create-player-name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-player-whatsapp">WhatsApp Number</Label>
                        <div className="flex items-center gap-2">
                             <CountryCodePicker value={countryCode} onValueChange={setCountryCode} />
                             <div className="flex-1 relative">
                                <Input 
                                    id="create-player-whatsapp-number" 
                                    value={mobileNumber} 
                                    onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))} 
                                    onBlur={handleVerifyNumber}
                                    placeholder="10-digit number"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help">
                                                    {verificationStatus === 'verified' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                                    {verificationStatus === 'failed' && <AlertCircle className="h-5 w-5 text-red-600" />}
                                                    {verificationStatus === 'idle' && <HelpCircle className="h-5 w-5 text-muted-foreground" />}
                                                    {verificationStatus === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {verificationStatus === 'idle' && <p>Verification status will appear here.</p>}
                                                {verificationStatus === 'loading' && <p>Checking...</p>}
                                                {verificationStatus === 'verified' && <p>This number is active on WhatsApp.</p>}
                                                {verificationStatus === 'failed' && <p>{verificationError || 'This number is not on WhatsApp or could not be verified.'}</p>}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                             </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-player-club">Club</Label>
                        <Select value={clubId} onValueChange={setClubId} disabled={!isSuperAdmin}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         {!isSuperAdmin && <p className="text-xs text-muted-foreground">Admins can only add players to their own club.</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="space-y-3 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="create-is-admin">Is Admin</Label>
                                <Switch id="create-is-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="create-is-banker">Is Banker</Label>
                                <Switch id="create-is-banker" checked={isBanker} onCheckedChange={setIsBanker} />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Create Player</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<MasterPlayer | null>(null);
  const [currentClubId, setCurrentClubId] = useState<string | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<MasterPlayer[]>([]);
  const [venues, setVenues] = useState<MasterVenue[]>([]);
  const [games, setGames] = useState<GameHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isSuperAdmin = useMemo(() => currentUser?.whatsappNumber === SUPER_ADMIN_WHATSAPP, [currentUser]);

  useEffect(() => {
    const userStr = localStorage.getItem('chip-maestro-user');
    const clubIdStr = localStorage.getItem('chip-maestro-clubId');
    
    if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        if (clubIdStr) {
          setCurrentClubId(clubIdStr);
        }
    } else {
      router.replace('/login');
    }
  }, [router]);
  
  useEffect(() => {
      async function loadData() {
          if (!currentUser) return;
          try {
              const [allClubs, allPlayers, allVenues, allGames] = await Promise.all([
                getClubs(), 
                getMasterPlayers(),
                getMasterVenues(),
                getGameHistory(),
              ]);
              setClubs(allClubs.sort((a,b) => a.name.localeCompare(b.name)));
              setPlayers(allPlayers);
              setVenues(allVenues);
              setGames(allGames);
          } catch(e) {
              const errorMessage = e instanceof Error ? e.message : 'Could not load required data.'
              toast({variant: 'destructive', title: 'Error', description: errorMessage});
          } finally {
              setIsLoading(false);
          }
      }
      loadData();
  }, [currentUser, toast]);
  
  const filteredPlayers = useMemo(() => {
      if (isSuperAdmin) return players;
      if (currentClubId) return players.filter(p => p.clubId === currentClubId);
      return [];
  }, [players, isSuperAdmin, currentClubId]);

  const filteredClubs = useMemo(() => {
      if (isSuperAdmin) return clubs;
      if (currentClubId) return clubs.filter(c => c.id === currentClubId);
      return [];
  }, [clubs, isSuperAdmin, currentClubId]);

  if (isLoading || !currentUser) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
            {isSuperAdmin
              ? 'Manage all clubs, players, and system-wide configurations.'
              : 'Manage players in your club.'}
        </p>
      </div>
       {isSuperAdmin && currentUser && (
        <ClubManagement 
            clubs={clubs} 
            setClubs={setClubs} 
            players={players}
            venues={venues}
            games={games}
            toast={toast} 
            currentUser={currentUser} 
        />
       )}
       {(currentUser.isAdmin || isSuperAdmin) && filteredPlayers.length > 0 && (
         <PlayerManagement 
            players={filteredPlayers} 
            setPlayers={setPlayers} 
            clubs={filteredClubs} 
            toast={toast}
            isSuperAdmin={isSuperAdmin}
            currentUser={currentUser}
         />
       )}
    </div>
  );
}
