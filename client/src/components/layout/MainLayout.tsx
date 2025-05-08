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
  Search
} from "lucide-react";
import AiSearchDialog from "@/components/search/AiSearchDialog";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

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
      path: "/",
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
      disabled: true, // Funzionalità temporaneamente sospesa
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
      <aside className="w-[256px] bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 flex items-center">
          <LayoutDashboard className="mr-2 h-6 w-6 text-primary" />
          <h1 className="text-xl font-medium text-gray-800">ELIS Segreteria</h1>
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
        <header className="bg-white shadow-sm z-10">
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
                  <h1 className="text-xl font-medium">ELIS Segreteria</h1>
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
                {routes.find((route) => route.path === location)?.name || "Dashboard"}
              </h2>
              <div className="hidden md:block flex-1 max-w-xl">
                <AiSearchDialog />
              </div>
            </div>

            <div className="flex items-center">
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

          {/* Mobile Navigation */}
          <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 shadow-lg">
            <div className="flex">
              <a 
                href="/"
                className={cn(
                  "flex-1 flex flex-col items-center py-3",
                  location === "/" ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/", e)}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-xs mt-1">Dashboard</span>
              </a>
              
              <a 
                href="/students"
                className={cn(
                  "flex-1 flex flex-col items-center py-3",
                  location === "/students" ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/students", e)}
              >
                <KeySquare className="h-5 w-5" />
                <span className="text-xs mt-1">Studenti</span>
              </a>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      "flex-1 flex flex-col items-center py-3 cursor-pointer",
                      location.includes("/services") && !location.includes("status=unpaid") ? "text-primary" : "text-gray-600"
                    )}
                  >
                    <PackageOpen className="h-5 w-5" />
                    <span className="text-xs mt-1">Servizi</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-48 rounded-xl mb-2 shadow-lg bg-white border border-gray-200">
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/services", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <PackageOpen className="h-4 w-4 mr-2 text-primary" />
                    <span>Tutti i servizi</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/services?type=siglatura", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <Tag className="h-4 w-4 mr-2 text-primary" />
                    <span>Siglatura</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/services?type=happy_hour", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <Beer className="h-4 w-4 mr-2 text-primary" />
                    <span>Happy Hour</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/services?type=riparazione", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <Drill className="h-4 w-4 mr-2 text-primary" />
                    <span>Riparazioni</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <a
                href="/payments"
                className={cn(
                  "flex-1 flex flex-col items-center py-3",
                  location.includes("/payments") ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/payments", e)}
              >
                <Receipt className="h-5 w-5" />
                <span className="text-xs mt-1">Pagamenti</span>
              </a>
              
              <div
                className="flex-1 flex flex-col items-center py-3 text-gray-400 cursor-not-allowed"
              >
                <Hammer className="h-5 w-5" />
                <span className="text-xs mt-1">Manutenzione</span>
                <span className="text-[10px] mt-0.5 bg-gray-200 px-1 py-0.5 rounded-sm">Sospeso</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      "flex-1 flex flex-col items-center py-3 cursor-pointer",
                      (location === "/reports" || location === "/settings" || location === "/google-auth") ? "text-primary" : "text-gray-600"
                    )}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="text-xs mt-1">Altro</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-48 rounded-xl mb-2 shadow-lg bg-white border border-gray-200">
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/reports", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <FileBarChart className="h-4 w-4 mr-2 text-primary" />
                    <span>Report</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/settings", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <Settings className="h-4 w-4 mr-2 text-primary" />
                    <span>Impostazioni</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/google-auth", e)}
                    className="flex items-center p-2.5 cursor-pointer"
                  >
                    <Cloud className="h-4 w-4 mr-2 text-primary" />
                    <span>Google Auth</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </header>

        {/* Page Content */}
        <div className="p-4 pb-24 md:p-6 md:pb-6 flex-1 bg-gray-50">{children}</div>
      </main>
    </div>
  );
}
