import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle } from "lucide-react";

interface RutInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  showValidation?: boolean;
}

// Remove all non-alphanumeric characters
function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

// Format RUT: 12.345.678-9
function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let formatted = "";
  let count = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    formatted = body[i] + formatted;
    count++;
    if (count % 3 === 0 && i > 0) {
      formatted = "." + formatted;
    }
  }

  return `${formatted}-${dv}`;
}

// Validate RUT with módulo 11
function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  // Body must be numeric
  if (!/^\d+$/.test(body)) return false;

  // Calculate check digit with módulo 11
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDv: string;

  if (remainder === 11) expectedDv = "0";
  else if (remainder === 10) expectedDv = "K";
  else expectedDv = String(remainder);

  return dv === expectedDv;
}

export function RutInput({
  value,
  onChange,
  id,
  placeholder = "12.345.678-9",
  className,
  showValidation = true,
}: RutInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    return value ? formatRut(value) : "";
  });
  const [touched, setTouched] = useState(false);

  const clean = cleanRut(displayValue);
  const isValid = clean.length >= 2 && validateRut(clean);
  const showError = touched && clean.length >= 2 && !isValid;
  const showSuccess = touched && isValid;

  // Sync from external value changes
  useEffect(() => {
    const externalClean = cleanRut(value || "");
    const internalClean = cleanRut(displayValue);
    if (externalClean !== internalClean) {
      setDisplayValue(value ? formatRut(value) : "");
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const clean = cleanRut(raw);

      // Limit length (max RUT: 9 digits + 1 DV = 10 chars)
      if (clean.length > 10) return;

      const formatted = clean.length > 0 ? formatRut(clean) : "";
      setDisplayValue(formatted);
      onChange(formatted);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <Input
        id={id}
        value={displayValue}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={cn(
          showValidation && showError && "border-destructive focus-visible:ring-destructive",
          showValidation && showSuccess && "border-green-500 focus-visible:ring-green-500",
          "pr-8",
          className
        )}
        maxLength={14} // 12.345.678-K
      />
      {showValidation && showSuccess && (
        <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
      )}
      {showValidation && showError && (
        <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
      )}
      {showValidation && showError && (
        <p className="text-xs text-destructive mt-1">RUT inválido</p>
      )}
    </div>
  );
}

export { validateRut, formatRut, cleanRut };
