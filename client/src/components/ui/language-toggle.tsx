import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/language-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Bandiere emoji come caratteri Unicode
const flags = {
  it: "🇮🇹",
  en: "🇬🇧"
};

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
              >
                <Globe className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">{t('change_language')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('it')}>
                <div className="flex items-center">
                  <span className="mr-2 text-lg">{flags.it}</span>
                  <span className={language === 'it' ? 'font-bold' : ''}>Italiano</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                <div className="flex items-center">
                  <span className="mr-2 text-lg">{flags.en}</span>
                  <span className={language === 'en' ? 'font-bold' : ''}>English</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('change_language')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}