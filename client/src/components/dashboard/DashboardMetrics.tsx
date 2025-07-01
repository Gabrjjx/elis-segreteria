import { 
  AreaChart, 
  BarChart, 
  FileText, 
  Euro, 
  TrendingUp,
  AlertTriangle,
  Shirt,
  Clock
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { ServiceType } from "@shared/schema";
import { motion } from "framer-motion";

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

  const metricsData = [
    {
      title: "Servizi Totali",
      value: metrics.totalServices,
      icon: <FileText className="h-4 w-4" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+2 oggi",
      trend: "up"
    },
    {
      title: "Importo Totale",
      value: `€${metrics.totalAmount.toFixed(2)}`,
      icon: <Euro className="h-4 w-4" />,
      color: "text-green-600", 
      bgColor: "bg-green-50",
      change: "+€45 oggi",
      trend: "up"
    },
    {
      title: "Pagamenti Pendenti",
      value: metrics.pendingPayments,
      subValue: `€${metrics.pendingAmount.toFixed(2)}`,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: "-3 rispetto a ieri",
      trend: "down"
    },
    {
      title: "Siglaturi",
      value: metrics.siglaturaCount,
      icon: <Shirt className="h-4 w-4" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "Più richiesto",
      trend: "neutral"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric, index) => (
          <AnimatedCard
            key={metric.title}
            title={metric.title}
            icon={metric.icon}
            delay={index * 0.1}
            className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <motion.span 
                  className="text-3xl font-bold text-foreground"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                >
                  {metric.value}
                </motion.span>
                <div className={`p-2 rounded-full ${metric.bgColor}`}>
                  <div className={metric.color}>
                    {metric.icon}
                  </div>
                </div>
              </div>
              
              {metric.subValue && (
                <div className="text-sm text-muted-foreground">
                  {metric.subValue}
                </div>
              )}
              
              <motion.div 
                className="flex items-center text-xs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                {metric.trend === "up" && (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                )}
                {metric.trend === "down" && (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1 rotate-180" />
                )}
                <span className={
                  metric.trend === "up" 
                    ? "text-green-600" 
                    : metric.trend === "down" 
                      ? "text-red-600" 
                      : "text-muted-foreground"
                }>
                  {metric.change}
                </span>
              </motion.div>
            </div>
          </AnimatedCard>
        ))}
      </div>
      
      {/* Service Types Overview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Siglaturi</p>
              <p className="text-2xl font-bold text-blue-800">{metrics.siglaturaCount}</p>
            </div>
            <Shirt className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Happy Hour</p>
              <p className="text-2xl font-bold text-orange-800">{metrics.happyHourCount}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Riparazioni</p>
              <p className="text-2xl font-bold text-green-800">{metrics.repairCount}</p>
            </div>
            <AreaChart className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}