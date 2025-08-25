import MaintenanceRequestForm from "@/components/maintenance/MaintenanceRequestForm";
import { Link } from "wouter";

export default function PublicMaintenanceRequest() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900 py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-8 text-center">
            <Link href="/">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="Segreteria ELIS College" 
                  className="h-16 w-auto bg-white dark:bg-gray-800 p-2 rounded-full shadow-md"
                  onError={(e) => {
                    // Fallback se il logo non è disponibile
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </Link>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 mt-4">
              <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-300">
                Segnalazione di manutenzione
              </span>
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Residenza ELIS College
            </p>
          </div>
          
          <div className="w-full max-w-md">
            <MaintenanceRequestForm />
          </div>
          
          <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              ©GabrieleIngrosso - ElisCollege 2025
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}