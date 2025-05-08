import { AreaChart, BarChart, FileText, Euro } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceType } from "@shared/schema";

interface DashboardMetricsProps {
  metrics: {
    totalServices: number;
    pendingPayments: number;
    siglaturaCount: number;
    happyHourCount: number;
    repairCount: number;
    totalAmount: number;
    pendingAmount: number;
  };
}

export default function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Services */}
      <Card className="border-t-4 border-primary">
        <CardContent className="p-5 pt-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Servizi Totali</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.totalServices}</p>
            </div>
            <div className="rounded-full p-3 bg-primary-light bg-opacity-20">
              <FileText className="text-primary h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-sm text-green-600 flex items-center">
            <AreaChart className="h-4 w-4" />
            <span className="ml-1">+2 rispetto a ieri</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments */}
      <Card className="border-t-4 border-destructive">
        <CardContent className="p-5 pt-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Pagamenti Pendenti</p>
              <p className="text-2xl font-bold text-gray-800">€{metrics.pendingAmount.toFixed(2)}</p>
            </div>
            <div className="rounded-full p-3 bg-destructive bg-opacity-20">
              <Euro className="text-destructive h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-sm text-destructive flex items-center">
            <BarChart className="h-4 w-4" />
            <span className="ml-1">{metrics.pendingPayments} pagamento in attesa</span>
          </div>
        </CardContent>
      </Card>

      {/* Siglatura Services */}
      <Card className="border-t-4 border-secondary">
        <CardContent className="p-5 pt-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Siglatura</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.siglaturaCount}</p>
            </div>
            <div className="rounded-full p-3 bg-secondary bg-opacity-20">
              <svg className="h-5 w-5 text-secondary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H21V19H3V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 9L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 9L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 flex items-center">
            <span className="ml-1">Ultimo: 05/05/2025</span>
          </div>
        </CardContent>
      </Card>

      {/* Happy Hour */}
      <Card className="border-t-4 border-success">
        <CardContent className="p-5 pt-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase">Happy Hour</p>
              <p className="text-2xl font-bold text-gray-800">{metrics.happyHourCount}</p>
            </div>
            <div className="rounded-full p-3 bg-success bg-opacity-20">
              <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2L18 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 6L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 10C8 10 9.12676 12 12 12C14.8732 12 16 10 16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 22C7.76142 22 10 19.7614 10 17C10 14.9497 8.8555 13.1876 7.22355 12.3183C6.85501 12.1112 6.5 12.4168 6.5 12.8284L6.5 17C6.5 19.7614 8.73858 22 11.5 22C14.2614 22 16.5 19.7614 16.5 17C16.5 14.2386 14.2614 12 11.5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600 flex items-center">
            <span className="ml-1">Ultimo: 09/04/2025</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
