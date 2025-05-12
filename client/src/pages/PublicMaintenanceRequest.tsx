import MaintenanceRequestForm from "@/components/maintenance/MaintenanceRequestForm";
import { Link } from "wouter";

export default function PublicMaintenanceRequest() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-8 text-center">
            <Link href="/">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="Segreteria ELIS College" 
                  className="h-12 w-auto"
                  onError={(e) => {
                    // Fallback se il logo non è disponibile
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </Link>
            
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Segnalazione di manutenzione
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
              &copy; {new Date().getFullYear()} ELIS College. Tutti i diritti riservati.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}