import { useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Tag, 
  Beer, 
  Drill, 
  Receipt, 
  FileBarChart, 
  Settings, 
  Menu, 
  Bell 
} from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const routes = [
    {
      name: "Dashboard",
      path: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
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
    {
      name: "Pagamenti",
      path: "/services?status=unpaid",
      icon: <Receipt className="h-5 w-5" />,
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
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="w-64 bg-gray-800 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 flex items-center border-b border-gray-700">
          <LayoutDashboard className="mr-2 h-6 w-6" />
          <h1 className="text-xl font-medium">ELIS Gestione</h1>
        </div>
        <nav className="flex-1">
          <ul>
            {routes.map((route) => (
              <li key={route.path} className="py-1">
                <Link href={route.path}>
                  <a
                    className={cn(
                      "flex items-center px-4 py-2 hover:bg-gray-700",
                      location === route.path && "bg-primary-dark"
                    )}
                  >
                    {route.icon}
                    <span className="ml-3">{route.name}</span>
                  </a>
                </Link>
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
                  <h1 className="text-xl font-medium">ELIS Gestione</h1>
                </div>
                <nav className="flex-1">
                  <ul>
                    {routes.map((route) => (
                      <li key={route.path} className="py-1">
                        <Link href={route.path}>
                          <a
                            className={cn(
                              "flex items-center px-4 py-2 hover:bg-gray-700",
                              location === route.path && "bg-primary-dark"
                            )}
                            onClick={() => setOpen(false)}
                          >
                            {route.icon}
                            <span className="ml-3">{route.name}</span>
                          </a>
                        </Link>
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
            <div className="flex justify-between">
              <Link href="/">
                <a className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/" ? "text-primary" : "text-gray-600"
                )}>
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="text-xs mt-1">Dashboard</span>
                </a>
              </Link>
              <Link href="/services?type=siglatura">
                <a className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/services?type=siglatura" ? "text-primary" : "text-gray-600"
                )}>
                  <Tag className="h-5 w-5" />
                  <span className="text-xs mt-1">Siglatura</span>
                </a>
              </Link>
              <Link href="/services?type=happy_hour">
                <a className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location === "/services?type=happy_hour" ? "text-primary" : "text-gray-600"
                )}>
                  <Beer className="h-5 w-5" />
                  <span className="text-xs mt-1">Happy Hour</span>
                </a>
              </Link>
              <Link href="/services?type=riparazione">
                <a className={cn(
                  "flex-1 flex flex-col items-center py-2",
                  location.startsWith("/services?type=riparazione") ? "text-primary" : "text-gray-600"
                )}>
                  <Drill className="h-5 w-5" />
                  <span className="text-xs mt-1">Altro</span>
                </a>
              </Link>
            </div>
          </nav>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 flex-1 bg-gray-50">{children}</div>
      </main>
    </div>
  );
}
