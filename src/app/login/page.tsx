'use client';

import { useState, Suspense, type FC } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendLoginOtp } from '@/ai/flows/send-login-otp';
import { findUserByWhatsapp } from '@/services/player-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Check } from 'lucide-react';
import type { MasterPlayer } from '@/lib/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getClub } from '@/services/club-service';
import { verifyWhatsappNumber } from '@/ai/flows/verify-whatsapp-number';


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

function LoginPageContent() {
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const handleSendOtp = async () => {
    const fullWhatsappNumber = `${countryCode}${mobileNumber}`;
    const whatsappRegex = /^\d{1,5}\d{10}$/; // Country code (1-5 digits) + 10-digit number

    if (!fullWhatsappNumber || !whatsappRegex.test(fullWhatsappNumber)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Number Format',
            description: 'Please select a country code and enter a valid 10-digit WhatsApp number.',
        });
        return;
    }

    setIsSending(true);
    try {
        // 1. Check if the user is registered
        const user = await findUserByWhatsapp(fullWhatsappNumber);
        if (!user || !user.clubId) {
            throw new Error("This WhatsApp number is not registered with any club. Please contact your admin.");
        }

        // 2. Check if the number is on WhatsApp
        const verificationResult = await verifyWhatsappNumber({ whatsappNumber: fullWhatsappNumber });
        if (!verificationResult.success || !verificationResult.isOnWhatsApp) {
            throw new Error(verificationResult.error || "This number is not active on WhatsApp.");
        }
        
        // 3. Get club-specific WhatsApp config
        const club = await getClub(user.clubId);
        if (!club) {
            throw new Error("Could not find the club associated with your account.");
        }


      const result = await sendLoginOtp({ whatsappNumber: fullWhatsappNumber, whatsappConfig: club.whatsappConfig || {} });
      if (result.success && result.otp) {
        setSentOtp(result.otp);
        setIsOtpSent(true);
        toast({
          title: 'OTP Sent!',
          description: `An OTP has been sent to ${fullWhatsappNumber}.`,
        });
      } else {
        throw new Error(result.error || 'An unknown error occurred while sending OTP.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleLogin = async () => {
    if (otp !== sentOtp) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: 'The OTP you entered is incorrect. Please try again.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const fullWhatsappNumber = `${countryCode}${mobileNumber}`;
      const user = await findUserByWhatsapp(fullWhatsappNumber);

      if (user && user.clubId) {
        localStorage.setItem('chip-maestro-user', JSON.stringify(user));
        localStorage.setItem('chip-maestro-clubId', user.clubId);
        router.replace('/dashboard');
      } else {
        // This case should ideally not be hit if sendLoginOtp is working correctly, but it's a good fallback.
        throw new Error("This WhatsApp number isn't registered with any club. Please contact your admin.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isOtpSent) {
        handleLogin();
      } else {
        handleSendOtp();
      }
    }
  }
  
  const videoUrl = "https://ak03-video-cdn.slidely.com/media/videos/8f/dd/8fddd811b3c3c8238e4f7459bc25f9c6-720p-preview.mp4";

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-20"
        src="https://ak03-video-cdn.slidely.com/media/videos/8f/dd/8fddd811b3c3c8238e4f7459bc25f9c6-720p-preview.mp4"
      >
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full h-full bg-background/50 backdrop-blur-sm -z-10" />
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary rounded-full p-3 w-fit mb-4">
            <KeyRound className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle>Chip Maestro Login</CardTitle>
          <CardDescription>
            {isOtpSent ? `Enter the OTP sent to +${countryCode}${mobileNumber}.` : 'Enter your WhatsApp number to log in.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOtpSent ? (
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number" className="sr-only">WhatsApp Number</Label>
              <div className="flex gap-2">
                <CountryCodePicker value={countryCode} onValueChange={setCountryCode} />
                <Input
                  id="whatsapp-number"
                  type="tel"
                  placeholder="10-digit number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKeyPress}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="otp" className="sr-only">One-Time Password (OTP)</Label>
              <Input
                id="otp"
                type="text"
                placeholder="4-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!isOtpSent ? (
            <Button onClick={handleSendOtp} disabled={isSending || !mobileNumber} className="w-full">
              {isSending ? <Loader2 className="animate-spin" /> : 'Send OTP'}
            </Button>
          ) : (
            <>
              <Button onClick={handleLogin} disabled={isVerifying || !otp} className="w-full">
                {isVerifying ? <Loader2 className="animate-spin" /> : 'Login'}
              </Button>
              <Button variant="link" onClick={() => setIsOtpSent(false)}>
                Use a different number
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
