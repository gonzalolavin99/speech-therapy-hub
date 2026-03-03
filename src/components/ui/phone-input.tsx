import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
  format: string; // placeholder format
  maxDigits: number;
}

const countries: Country[] = [
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱", format: "9 1234 5678", maxDigits: 9 },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷", format: "11 1234 5678", maxDigits: 10 },
  { code: "PE", name: "Perú", dial: "+51", flag: "🇵🇪", format: "912 345 678", maxDigits: 9 },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴", format: "312 345 6789", maxDigits: 10 },
  { code: "MX", name: "México", dial: "+52", flag: "🇲🇽", format: "55 1234 5678", maxDigits: 10 },
  { code: "EC", name: "Ecuador", dial: "+593", flag: "🇪🇨", format: "99 123 4567", maxDigits: 9 },
  { code: "BO", name: "Bolivia", dial: "+591", flag: "🇧🇴", format: "7123 4567", maxDigits: 8 },
  { code: "UY", name: "Uruguay", dial: "+598", flag: "🇺🇾", format: "94 123 456", maxDigits: 8 },
  { code: "PY", name: "Paraguay", dial: "+595", flag: "🇵🇾", format: "981 123 456", maxDigits: 9 },
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷", format: "11 91234 5678", maxDigits: 11 },
  { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪", format: "412 123 4567", maxDigits: 10 },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸", format: "202 555 0123", maxDigits: 10 },
  { code: "ES", name: "España", dial: "+34", flag: "🇪🇸", format: "612 34 56 78", maxDigits: 9 },
];

// Format phone number with spaces for readability
function formatPhone(digits: string, maxDigits: number): string {
  const clean = digits.replace(/\D/g, "").slice(0, maxDigits);
  if (clean.length === 0) return "";

  // Generic grouping: groups of 2-4 digits
  if (clean.length <= 4) return clean;
  if (clean.length <= 7) return `${clean.slice(0, clean.length - 4)} ${clean.slice(-4)}`;
  if (clean.length <= 10) {
    const mid = clean.length - 4;
    const first = mid > 4 ? 2 : mid;
    return `${clean.slice(0, first)} ${clean.slice(first, mid)} ${clean.slice(mid)}`;
  }
  return `${clean.slice(0, 2)} ${clean.slice(2, 7)} ${clean.slice(7)}`;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

export function PhoneInput({ value, onChange, id, className }: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Chile default
  const [phoneDigits, setPhoneDigits] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Parse initial value to extract country code and number
  useEffect(() => {
    if (!value) return;
    const clean = value.replace(/\s/g, "");
    for (const c of countries) {
      if (clean.startsWith(c.dial)) {
        setSelectedCountry(c);
        setPhoneDigits(clean.slice(c.dial.length).replace(/\D/g, ""));
        return;
      }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [dropdownOpen]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, selectedCountry.maxDigits);
      setPhoneDigits(raw);
      onChange(raw ? `${selectedCountry.dial} ${formatPhone(raw, selectedCountry.maxDigits)}` : "");
    },
    [selectedCountry, onChange]
  );

  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      setDropdownOpen(false);
      setSearch("");
      // Reformat with new country
      if (phoneDigits) {
        const trimmed = phoneDigits.slice(0, country.maxDigits);
        setPhoneDigits(trimmed);
        onChange(`${country.dial} ${formatPhone(trimmed, country.maxDigits)}`);
      }
    },
    [phoneDigits, onChange]
  );

  const filteredCountries = search
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  return (
    <div className={cn("flex gap-0", className)}>
      {/* Country selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "flex items-center gap-1 h-10 px-2.5 border border-r-0 rounded-l-md bg-muted/50 hover:bg-muted transition-colors text-sm whitespace-nowrap",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-muted-foreground text-xs">{selectedCountry.dial}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b">
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar país..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-transparent border rounded outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {/* List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left",
                    c.code === selectedCountry.code && "bg-accent"
                  )}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground text-xs">{c.dial}</span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">No encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone number input */}
      <Input
        id={id}
        value={formatPhone(phoneDigits, selectedCountry.maxDigits)}
        onChange={handlePhoneChange}
        placeholder={selectedCountry.format}
        className="rounded-l-none flex-1"
        type="tel"
      />
    </div>
  );
}
