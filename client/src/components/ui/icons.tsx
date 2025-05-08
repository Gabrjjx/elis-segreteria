import {
  AlertTriangle,
  ArrowRight,
  ArrowBigRight,
  ArrowBigLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  FileText,
  Hammer,
  Info,
  Loader2,
  LogOut,
  PieChart,
  MoreHorizontal,
  Package,
  PlayCircle,
  Plus,
  Shirt,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Trash,
  User,
  X,
  Wrench,
  DollarSign,
  Coffee,
  Home,
  Sparkles,
  type LucideIcon
} from "lucide-react";

export type Icon = LucideIcon;

export const Icons = {
  user: User,
  arrowRight: ArrowRight,
  prevBtn: ArrowBigLeft,
  nextBtn: ArrowBigRight,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  copy: Copy,
  clipboardList: ClipboardList,
  creditCard: CreditCard,
  dollar: DollarSign,
  download: Download,
  fileText: FileText,
  info: Info,
  logout: LogOut,
  moreHorizontal: MoreHorizontal,
  close: X,
  package: Package,
  play: PlayCircle,
  plus: Plus,
  search: Search,
  settings: Settings,
  sliders: SlidersHorizontal,
  spinner: Loader2,
  tag: Tag,
  trash: Trash,
  warning: AlertTriangle,
  wrench: Wrench,
  hammer: Hammer,
  shirt: Shirt,
  chart: PieChart,
  coffee: Coffee,
  home: Home,
  sparkles: Sparkles,
  
  logo: ({ ...props }) => (
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
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  elisLogo: ({ ...props }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none"
      {...props}
    >
      <path
        d="M20 20h60v15H20z M20 42.5h40v15H20z M20 65h60v15H20z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
};