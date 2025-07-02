import { motion } from "framer-motion";

interface ELISLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function ELISLoader({ 
  size = "md", 
  text = "Caricamento...",
  className = "" 
}: ELISLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {/* ELIS College Mascot - Animated Hammer & Sickle */}
      <motion.div
        className={`${sizeClasses[size]} flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 rounded-full shadow-lg`}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          },
          scale: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        {/* ELIS College Symbol - Stylized E */}
        <motion.svg
          viewBox="0 0 32 32"
          className="w-3/4 h-3/4 text-white"
          fill="currentColor"
          animate={{
            rotate: [0, -360]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {/* Letter E stylized */}
          <path d="M8 6h12v3H11v3h8v3H11v3h9v3H8V6z" />
          {/* Academic cap accent */}
          <path d="M22 8l2 1-2 1v4l-1-1-1 1V10l-2-1 2-1V8z" />
          {/* Building/College accent */}
          <rect x="6" y="22" width="2" height="4" />
          <rect x="10" y="22" width="2" height="4" />
          <rect x="14" y="22" width="2" height="4" />
          <rect x="18" y="22" width="2" height="4" />
          <rect x="4" y="26" width="18" height="2" />
        </motion.svg>
      </motion.div>

      {/* Animated Text */}
      <motion.p
        className={`${textSizes[size]} font-medium text-gray-600`}
        animate={{
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {text}
      </motion.p>

      {/* Animated Dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Overlay Loading Component
export function ELISLoadingOverlay({ 
  isVisible, 
  text = "Caricamento...",
  size = "lg" 
}: { 
  isVisible: boolean; 
  text?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-8 shadow-2xl"
      >
        <ELISLoader size={size} text={text} />
      </motion.div>
    </motion.div>
  );
}

// Inline Loading Component for Cards/Sections
export function ELISInlineLoader({ 
  text = "Caricamento dati...",
  size = "md",
  className = "py-8"
}: {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <ELISLoader size={size} text={text} />
    </div>
  );
}

// Table Loading Component for Service Lists
export function ELISTableLoader({ 
  rows = 5,
  text = "Caricamento servizi..."
}: {
  rows?: number;
  text?: string;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center mb-6">
        <ELISLoader size="md" text={text} />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div
            key={i}
            className="h-16 bg-gray-100 rounded-lg"
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1
            }}
          />
        ))}
      </div>
    </div>
  );
}