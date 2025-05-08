import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  CreditCard,
  File,
  FileText,
  Loader2,
  Moon,
  MoreVertical,
  Pizza,
  Plus,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
  type LucideIcon 
} from "lucide-react";

export type Icon = LucideIcon;

export const Icons = {
  logo: Command,
  spinner: Loader2,
  arrowRight: ArrowRight,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  help: CircleHelp,
  settings: Settings,
  user: User,
  trash: Trash,
  sun: SunMedium,
  moon: Moon,
  warning: AlertTriangle,
  close: X,
  check: Check,
  file: File,
  fileText: FileText,
  more: MoreVertical,
  add: Plus,
  pizza: Pizza,
  card: CreditCard,
  paypal: ({ ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.067 8.478c.492.981.589 2.114.291 3.293-.437 1.713-1.43 3.044-2.794 3.937-1.202.788-2.596 1.163-4.067 1.105h-.261a.774.774 0 0 0-.705.47l-.53 1.587a7.868 7.868 0 0 1-.259.657c-.232.436-.699.615-1.132.615h-2.416c-.291 0-.523-.232-.494-.494l1.482-9.624c.116-.669.67-1.163 1.367-1.163h4.702c.291 0 .61.029.9.087.9.203 1.744.64 2.44 1.308.494.494.872 1.105 1.105 1.804l.261.407.11.105z" />
      <path d="M9.439 9.99l-.668 4.299c-.29.174.87.32.261.32h.64c1.25 0 2.374-.203 3.366-.64a4.38 4.38 0 0 0 2.24-1.977c.756-1.453.349-2.965-1.017-3.605a4.417 4.417 0 0 0-1.891-.378H9.99a.581.581 0 0 0-.552.582v1.25l.001.149z" />
      <path d="M12.926 4.973c2.211 0 4.251.726 5.73 2.034 1.105.988 1.88 2.265 2.211 3.66.407 1.717.174 3.376-.697 4.714-.9 1.366-2.295 2.354-3.954 2.763-.639.174-1.308.231-1.977.232H9.581c-.261 0-.465-.204-.436-.465l1.947-12.675c.087-.64.639-1.105 1.279-1.105h3.487l1.068-.158z" />
    </svg>
  ),
  twitter: Twitter,
};