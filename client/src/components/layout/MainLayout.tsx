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
  CloudSync,
  KeySquare
} from "lucide-react";

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
      path: "/services?status=unpaid",
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      name: "Manutenzione",
      path: "/maintenance",
      icon: <Hammer className="h-5 w-5" />,
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
          icon: <CloudSync className="h-5 w-5" />,
        },
      ]
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="w-64 bg-gray-800 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 flex items-center border-b border-gray-700">
          <LayoutDashboard className="mr-2 h-6 w-6" />
          <h1 className="text-xl font-medium">ELIS Segreteria</h1>
        </div>
        <nav className="flex-1">
          <ul>
            {routes.map((route) => (
              <li key={route.path} className="py-1">
                {route.dropdown ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className={cn(
                        "flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer",
                        location.startsWith(route.path) && "bg-primary-dark"
                      )}>
                        {route.icon}
                        <span className="ml-3">{route.name}</span>
                        <ChevronDown className="ml-auto h-4 w-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-gray-700 text-white border-gray-600 w-48">
                      {route.children?.map((child) => (
                        <DropdownMenuItem
                          key={child.path}
                          className={cn(
                            "flex items-center hover:bg-gray-600 focus:bg-gray-600 cursor-pointer",
                            location === child.path && "bg-gray-600"
                          )}
                          onClick={(e) => handleNavigation(child.path, e)}
                        >
                          {child.icon}
                          <span className="ml-3">{child.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <a
                    href={route.path}
                    className={cn(
                      "flex items-center px-4 py-2 hover:bg-gray-700",
                      (location === route.path || 
                       (route.path.includes('?') && location === route.path.split('?')[0])) && 
                      "bg-primary-dark"
                    )}
                    onClick={(e) => handleNavigation(route.path, e)}
                  >
                    {route.icon}
                    <span className="ml-3">{route.name}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
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
              <SheetContent side="left" className="p-0 bg-gray-800 text-white">
                <div className="p-4 flex items-center border-b border-gray-700">
                  <LayoutDashboard className="mr-2 h-6 w-6" />
                  <h1 className="text-xl font-medium">ELIS Segreteria</h1>
                </div>
                <nav className="flex-1">
                  <ul>
                    {routes.map((route) => (
                      <li key={route.path} className="py-1">
                        {route.dropdown ? (
                          <div>
                            <div className={cn(
                              "flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer",
                              location.startsWith(route.path) && "bg-primary-dark"
                            )}>
                              {route.icon}
                              <span className="ml-3">{route.name}</span>
                              <ChevronDown className="ml-auto h-4 w-4" />
                            </div>
                            <div className="bg-gray-700 pl-8">
                              {route.children?.map((child) => (
                                <a
                                  key={child.path}
                                  href={child.path}
                                  className={cn(
                                    "flex items-center px-4 py-2 hover:bg-gray-600",
                                    location === child.path && "bg-gray-600"
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
                        ) : (
                          <a
                            href={route.path}
                            className={cn(
                              "flex items-center px-4 py-2 hover:bg-gray-700",
                              (location === route.path || 
                               (route.path.includes('?') && location === route.path.split('?')[0])) && 
                              "bg-primary-dark"
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
                      </li>
                    ))}
                  </ul>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex-1 md:ml-4">
              <h2 className="text-xl font-medium">
                {routes.find((route) => route.path === location)?.name || "Dashboard"}
              </h2>
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
          <nav className="md:hidden bg-white border-t border-gray-200">
            <div className="flex">
              <a 
                href="/"
                className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/" ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/", e)}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-xs mt-1">Dashboard</span>
              </a>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex-1 flex flex-col items-center py-2",
                      location === "/services" ? "text-primary" : "text-gray-600"
                    )}
                  >
                    <PackageOpen className="h-5 w-5" />
                    <span className="text-xs mt-1">Servizi</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={10} className="w-40">
                  <DropdownMenuItem 
                    onClick={(e) => handleNavigation("/services?type=siglatura", e)}
                    className="flex items-center cursor-pointer"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    <span>Siglatura</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/services?type=happy_hour", e)}
                    className="flex items-center cursor-pointer"
                  >
                    <Beer className="h-4 w-4 mr-2" />
                    <span>Happy Hour</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleNavigation("/services?type=riparazione", e)}
                    className="flex items-center cursor-pointer"
                  >
                    <Drill className="h-4 w-4 mr-2" />
                    <span>Riparazioni</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <a
                href="/services?status=unpaid"
                className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/services?status=unpaid" ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/services?status=unpaid", e)}
              >
                <Receipt className="h-5 w-5" />
                <span className="text-xs mt-1">Pagamenti</span>
              </a>
              
              <a
                href="/maintenance"
                className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/maintenance" ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/maintenance", e)}
              >
                <Hammer className="h-5 w-5" />
                <span className="text-xs mt-1">Manutenzione</span>
              </a>
              
              <a
                href="/reports"
                className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/reports" ? "text-primary" : "text-gray-600"
                )}
                onClick={(e) => handleNavigation("/reports", e)}
              >
                <FileBarChart className="h-5 w-5" />
                <span className="text-xs mt-1">Report</span>
              </a>
            </div>
          </nav>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 flex-1 bg-gray-50">{children}</div>
      </main>
    </div>
  );
}
