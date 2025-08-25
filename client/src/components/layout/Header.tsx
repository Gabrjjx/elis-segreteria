import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  Shirt, 
  Users, 
  Wrench, 
  Settings, 
  FileText, 
  Menu,
  CreditCard,
  Search,
  History
} from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Servizi", href: "/services", icon: Shirt },
    { name: "Studenti", href: "/students", icon: Users },
    { name: "Manutenzioni", href: "/maintenance", icon: Wrench },
    { name: "Pagamenti", href: "/payments", icon: CreditCard },
    { name: "Dati Storici", href: "/historical-data", icon: History },
    { name: "Report", href: "/reports", icon: FileText },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location?.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="premium-nav sticky top-0 z-50 w-full">
      <div className="container flex h-20 items-center justify-between px-6">
        {/* Enhanced Logo */}
        <div className="flex items-center space-x-3">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 
                            flex items-center justify-center shadow-lg group-hover:shadow-xl 
                            transform group-hover:scale-105 transition-all duration-300
                            border-2 border-white/20">
                <Shirt className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent">
                  ELIS
                </span>
                <span className="text-sm font-medium text-gray-500 -mt-1">
                  Administration
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <Link href="/search">
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </Link>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href} className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/search" className="flex items-center space-x-2">
                    <Search className="h-4 w-4" />
                    <span>Ricerca AI</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}