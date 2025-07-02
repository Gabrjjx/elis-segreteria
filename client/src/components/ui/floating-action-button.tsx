import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      icon: Plus,
      label: "Nuovo Servizio",
      href: "/services/new",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      icon: Zap,
      label: "Pagamento Rapido",
      href: "/qr-scanner",
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Action Items */}
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{
              opacity: isOpen ? 1 : 0,
              scale: isOpen ? 1 : 0,
              y: isOpen ? -60 * (index + 1) : 20,
            }}
            transition={{
              duration: 0.3,
              delay: isOpen ? index * 0.1 : 0,
              type: "spring",
              stiffness: 200,
            }}
            className="absolute bottom-0 right-0"
          >
            <Link href={action.href}>
              <Button
                className={`${action.color} text-white w-12 h-12 rounded-full shadow-lg 
                         hover:shadow-xl transform hover:scale-110 transition-all duration-300
                         border-2 border-white/20`}
                onClick={() => setIsOpen(false)}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        );
      })}

      {/* Main FAB */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="floating-action"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Plus className="h-6 w-6" />
          </motion.div>
        </Button>
      </motion.div>

      {/* Background overlay when open */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/10 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}