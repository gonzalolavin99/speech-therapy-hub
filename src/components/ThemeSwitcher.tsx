import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, themeColors, ColorTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {(Object.keys(themeColors) as ColorTheme[]).map((theme) => (
          <DropdownMenuItem
            key={theme}
            onClick={() => setColorTheme(theme)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              colorTheme === theme && "bg-accent"
            )}
          >
            <div
              className="h-5 w-5 rounded-full border-2 border-border"
              style={{ backgroundColor: themeColors[theme].preview }}
            />
            <span>{themeColors[theme].name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
