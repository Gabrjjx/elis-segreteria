import { useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  Tag, 
  Beer, 
  Drill, 
  Receipt, 
  FileBarChart, 
  Settings, 
  Menu, 
  Bell,
  PackageOpen,
  ChevronDown,
  Hammer,
  AlertCircle,
  Cloud,
  KeySquare,
  Search,
  Globe
} from "lucide-react";
import AiSearchDialog from "@/components/search/AiSearchDialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/contexts/language-context";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  // Function to handle navigation with search params
  const handleNavigation = (path: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    // Use more reliable navigation with location API
    window.location.href = path;
    
    // Log navigation for debugging
    console.log("Navigating to:", path);
  };

  const routes = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Servizi",
      path: "/services",
      icon: <PackageOpen className="h-5 w-5" />,
      dropdown: true,
      children: [
        {
          name: "Siglatura",
          path: "/services?type=siglatura",
          icon: <Tag className="h-5 w-5" />,
        },
        {
          name: "Happy Hour",
          path: "/services?type=happy_hour",
          icon: <Beer className="h-5 w-5" />,
        },
        {
          name: "Riparazioni",
          path: "/services?type=riparazione",
          icon: <Drill className="h-5 w-5" />,
        },
      ]
    },
    {
      name: "Pagamenti",
      path: "/payments",
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      name: "Manutenzione",
      path: "/maintenance",
      icon: <Hammer className="h-5 w-5" />,
    },
    {
      name: "Studenti",
      path: "/students",
      icon: <KeySquare className="h-5 w-5" />,
    },
    {
      name: "Report",
      path: "/reports",
      icon: <FileBarChart className="h-5 w-5" />,
    },
    {
      name: "Impostazioni",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />,
      dropdown: true,
      children: [
        {
          name: "Generali",
          path: "/settings",
          icon: <Settings className="h-5 w-5" />,
        },
        {
          name: "Google Auth",
          path: "/google-auth",
          icon: <Cloud className="h-5 w-5" />,
        },
      ]
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) - Modern Style */}
      <aside className="w-[256px] bg-background border-r border-border flex-shrink-0 hidden md:flex flex-col dark:bg-sidebar-bg">
        <div className="p-4 flex items-center">
          <LayoutDashboard className="mr-2 h-6 w-6 text-primary" />
          <h1 className="text-xl font-medium text-foreground">Segreteria Elis College</h1>
        </div>
        <nav className="flex-1 py-4">
          <div className="space-y-0.5">
            {routes.map((route) => (
              <div key={route.path}>
                {route.dropdown ? (
                  <div className="mb-1">
                    <div 
                      className={cn(
                        "flex items-center mx-2 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer",
                        (location.startsWith(route.path) && !route.path.includes('?')) && "bg-blue-50 text-primary"
                      )}
                      onClick={() => {
                        // Toggling a local state to control dropdown without the package
                        const el = document.getElementById(`dropdown-${route.path.replace(/\//g, '-')}`);
                        if (el) {
                          el.classList.toggle('hidden');
                        }
                      }}
                    >
                      {route.icon}
                      <span className="ml-3 font-medium">{route.name}</span>
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </div>
                    <div 
                      id={`dropdown-${route.path.replace(/\//g, '-')}`}
                      className={cn(
                        "pl-2 mt-0.5 space-y-1",
                        !location.startsWith(route.path) && "hidden"
                      )}
                    >
                      {route.children?.map((child) => (
                        <a
                          key={child.path}
                          href={child.path}
                          className={cn(
                            "flex items-center mx-2 pl-7 py-2 rounded-md text-gray-600 hover:bg-gray-100",
                            location === child.path && "bg-blue-50 text-primary"
                          )}
                          onClick={(e) => handleNavigation(child.path, e)}
                        >
                          {child.icon}
                          <span className="ml-3">{child.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : route.disabled ? (
                  <div className={cn(
                    "flex items-center mx-2 px-3 py-2 mb-1 text-gray-400 rounded-md cursor-not-allowed",
                  )}>
                    {route.icon}
                    <span className="ml-3 font-medium">{route.name}</span>
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Sospeso</span>
                  </div>
                ) : (
                  <a
                    href={route.path}
                    className={cn(
                      "flex items-center mx-2 px-3 py-2 mb-1 text-gray-700 rounded-md hover:bg-gray-100",
                      (location === route.path || 
                       (route.path.includes('?') && location === route.path.split('?')[0])) && 
                      "bg-blue-50 text-primary font-medium"
                    )}
                    onClick={(e) => handleNavigation(route.path, e)}
                  >
                    {route.icon}
                    <span className="ml-3">{route.name}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <header className="bg-background dark:bg-nav-bg shadow-sm z-10 border-b border-border">
          <div className="px-4 py-2 flex items-center justify-between">
            {/* Mobile menu trigger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-white text-gray-800 border-r">
                <div className="p-4 flex items-center border-b border-gray-100">
                  <LayoutDashboard className="mr-2 h-6 w-6 text-primary" />
                  <h1 className="text-xl font-medium">Segreteria Elis College</h1>
                </div>
                <div className="p-3 border-b border-gray-100">
                  <AiSearchDialog />
                </div>
                <nav className="flex-1 py-4">
                  <div className="space-y-1">
                    {routes.map((route) => (
                      <div key={route.path} className="py-0.5">
                        {route.dropdown ? (
                          <div className="mb-1">
                            <div 
                              className={cn(
                                "flex items-center mx-2 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer",
                                (location.startsWith(route.path) && !route.path.includes('?')) && "bg-blue-50 text-primary"
                              )}
                              onClick={() => {
                                // Toggle
                                const el = document.getElementById(`mobile-dropdown-${route.path.replace(/\//g, '-')}`);
                                if (el) {
                                  el.classList.toggle('hidden');
                                }
                              }}
                            >
                              {route.icon}
                              <span className="ml-3 font-medium">{route.name}</span>
                              <ChevronDown className="ml-auto h-4 w-4" />
                            </div>
                            <div 
                              id={`mobile-dropdown-${route.path.replace(/\//g, '-')}`}
                              className={cn(
                                "pl-2 mt-0.5 space-y-1",
                                !location.startsWith(route.path) && "hidden"
                              )}
                            >
                              {route.children?.map((child) => (
                                <a
                                  key={child.path}
                                  href={child.path}
                                  className={cn(
                                    "flex items-center mx-2 pl-7 py-2 rounded-md text-gray-600 hover:bg-gray-100",
                                    location === child.path && "bg-blue-50 text-primary"
                                  )}
                                  onClick={(e) => {
                                    handleNavigation(child.path, e);
                                    setOpen(false);
                                  }}
                                >
                                  {child.icon}
                                  <span className="ml-3">{child.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : route.disabled ? (
                          <div className={cn(
                            "flex items-center mx-2 px-3 py-2 mb-1 text-gray-400 rounded-md cursor-not-allowed",
                          )}>
                            {route.icon}
                            <span className="ml-3 font-medium">{route.name}</span>
                            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Sospeso</span>
                          </div>
                        ) : (
                          <a
                            href={route.path}
                            className={cn(
                              "flex items-center mx-2 px-3 py-2 mb-1 text-gray-700 rounded-md hover:bg-gray-100",
                              (location === route.path || 
                               (route.path.includes('?') && location === route.path.split('?')[0])) && 
                              "bg-blue-50 text-primary font-medium"
                            )}
                            onClick={(e) => {
                              handleNavigation(route.path, e);
                              setOpen(false);
                            }}
                          >
                            {route.icon}
                            <span className="ml-3">{route.name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex items-center flex-1 md:ml-4">
              <h2 className="text-xl font-medium mr-4">
                {routes.find((route) => route.path === location || (route.path === "/dashboard" && location === "/"))?.name || "Dashboard"}
              </h2>
              <div className="hidden md:block flex-1 max-w-xl">
                <AiSearchDialog />
              </div>
            </div>

            <div className="flex items-center">
              <div className="relative mx-2">
                <LanguageToggle />
              </div>
              <div className="relative mx-2">
                <ThemeToggle />
              </div>
              <div className="relative mx-2">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </Button>
              </div>
              <div className="relative mx-2">
                <Button className="rounded-full bg-primary h-8 w-8 p-0">
                  <span>EL</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation - Redesigned for better UX */}
          <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 shadow-lg">
            {/* Main tab navigation with larger buttons */}
            <div className="flex items-center h-16">
              <a 
                href="/dashboard"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center h-full",
                  location === "/" || location === "/dashboard"
                    ? "text-primary border-t-2 border-primary bg-blue-50" 
                    : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/dashboard", e)}
              >
                <LayoutDashboard className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Dashboard</span>
              </a>
              
              <a 
                href="/services"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center h-full",
                  location.includes("/services") && !location.includes("status=unpaid")
                    ? "text-primary border-t-2 border-primary bg-blue-50" 
                    : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/services", e)}
              >
                <PackageOpen className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Servizi</span>
              </a>
              
              <a
                href="/scanner"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center h-full relative",
                  location === "/scanner"
                    ? "text-primary border-t-2 border-primary bg-blue-50" 
                    : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/scanner", e)}
              >
                <div className="absolute -top-5 bg-primary text-white p-3 rounded-full shadow-lg">
                  <Search className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium mt-6">Scanner</span>
              </a>
              
              <a 
                href="/students"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center h-full",
                  location === "/students"
                    ? "text-primary border-t-2 border-primary bg-blue-50" 
                    : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/students", e)}
              >
                <KeySquare className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Studenti</span>
              </a>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center h-full cursor-pointer",
                      (location.includes("/payments") || location === "/reports" || location === "/settings" || location === "/google-auth")
                        ? "text-primary border-t-2 border-primary bg-blue-50" 
                        : "text-gray-600"
                    )}
                  >
                    <Receipt className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">Menu</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" sideOffset={16} className="w-56 rounded-xl mb-2 shadow-lg bg-white border border-gray-200">
                  {/* Payments Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pagamenti
                  </div>
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/payments", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <Receipt className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Tutti i pagamenti</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/services?status=unpaid", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <AlertCircle className="h-5 w-5 mr-3 text-red-500" />
                    <span className="font-medium">Servizi da pagare</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  {/* Service types */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipi di servizio
                  </div>
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/services?type=siglatura", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <Tag className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Siglatura</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/services?type=happy_hour", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <Beer className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Happy Hour</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/services?type=riparazione", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <Drill className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Riparazioni</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  {/* Administration */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amministrazione
                  </div>
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/reports", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <FileBarChart className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Report</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/settings", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <Settings className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Impostazioni</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/google-auth", e)}
                    className="flex items-center p-3 cursor-pointer"
                  >
                    <Cloud className="h-5 w-5 mr-3 text-primary" />
                    <span className="font-medium">Google Auth</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  {/* Preferenze */}
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Preferenze
                  </div>
                  <div className="p-3 flex justify-center gap-3">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </header>

        {/* Page Content */}
        <div className="p-4 pb-24 md:p-6 md:pb-6 flex-1 bg-gray-50">{children}</div>
        
        {/* Footer */}
        <footer className="border-t py-2 mt-auto">
          <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              &copy;GabHub - Segreteria Elis College
            </p>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
