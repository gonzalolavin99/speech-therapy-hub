import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, Save, Loader2 } from "lucide-react";
import { useBankInfo, BankInfoFormData } from "@/hooks/useBankInfo";
import { RutInput } from "@/components/ui/rut-input";

const CHILEAN_BANKS = [
  "Banco de Chile",
  "Banco Estado",
  "Banco Santander",
  "Banco BCI",
  "Banco Scotiabank",
  "Banco Itaú",
  "Banco Security",
  "Banco BICE",
  "Banco Falabella",
  "Banco Ripley",
  "Banco Consorcio",
  "Banco Internacional",
  "HSBC Bank",
  "Banco BTG Pactual",
  "Otro",
];

const ACCOUNT_TYPES = [
  "Cuenta Corriente",
  "Cuenta Vista",
  "Cuenta de Ahorro",
  "Cuenta RUT",
];

export function BankInfoForm() {
  const { bankInfo, isLoading, saveBankInfo } = useBankInfo();
  const [formData, setFormData] = useState<BankInfoFormData>({
    bank_name: "",
    account_type: "",
    account_number: "",
    holder_rut: "",
    holder_name: "",
    email: "",
  });

  useEffect(() => {
    if (bankInfo) {
      setFormData({
        bank_name: bankInfo.bank_name,
        account_type: bankInfo.account_type,
        account_number: bankInfo.account_number,
        holder_rut: bankInfo.holder_rut,
        holder_name: bankInfo.holder_name,
        email: bankInfo.email,
      });
    }
  }, [bankInfo]);

  const handleChange = (field: keyof BankInfoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.bank_name || !formData.account_type || !formData.account_number || !formData.holder_rut || !formData.holder_name || !formData.email) return;
    saveBankInfo.mutate(formData);
  };

  const isValid = formData.bank_name && formData.account_type && formData.account_number && formData.holder_rut && formData.holder_name && formData.email;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-8 mb-8">
      <h3 className="text-lg font-semibold text-card-foreground mb-2 flex items-center gap-2">
        <Banknote className="h-5 w-5" />
        Datos Bancarios para Cobros
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Estos datos se mostrarán en el portal del paciente para facilitar transferencias
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select value={formData.bank_name} onValueChange={(v) => handleChange("bank_name", v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecciona tu banco" />
              </SelectTrigger>
              <SelectContent>
                {CHILEAN_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de cuenta</Label>
            <Select value={formData.account_type} onValueChange={(v) => handleChange("account_type", v)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Tipo de cuenta" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>N° de cuenta</Label>
            <Input
              value={formData.account_number}
              onChange={(e) => handleChange("account_number", e.target.value)}
              placeholder="1234567890"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>RUT del titular</Label>
            <RutInput
              value={formData.holder_rut}
              onChange={(v) => handleChange("holder_rut", v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Nombre del titular</Label>
            <Input
              value={formData.holder_name}
              onChange={(e) => handleChange("holder_name", e.target.value)}
              placeholder="Juan Pérez González"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>Email de notificación</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="juan@email.com"
              className="bg-background"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!isValid || saveBankInfo.isPending}>
            {saveBankInfo.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Datos Bancarios
          </Button>
        </div>
      </div>
    </div>
  );
}
