import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, AlertCircle, X } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ open, onClose, onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize scanner when component mounts
    if (open && !scannerRef.current && containerRef.current) {
      scannerRef.current = new Html5Qrcode("qr-reader");
    }

    // Clean up when unmounting
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop()
          .catch(error => console.error("Error stopping scanner:", error));
      }
    };
  }, [open, scanning]);

  const startScanner = async () => {
    if (!scannerRef.current) return;
    
    setError(null);
    setScanning(true);
    
    try {
      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermission(true);
      
      const qrCodeSuccessCallback = (decodedText: string) => {
        // Handle the scanned code
        stopScanner();
        onScan(decodedText);
      };
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      await scannerRef.current.start(
        { facingMode: "environment" }, 
        config, 
        qrCodeSuccessCallback, 
        undefined
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError(err instanceof Error ? err.message : "Errore durante l'inizializzazione della fotocamera");
      setPermission(false);
      setScanning(false);
    }
  };
  
  const stopScanner = () => {
    if (scannerRef.current && scanning) {
      scannerRef.current.stop()
        .then(() => {
          setScanning(false);
        })
        .catch(error => {
          console.error("Error stopping scanner:", error);
        });
    }
  };
  
  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scansiona QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div 
            ref={containerRef} 
            className="relative w-full max-w-sm mx-auto h-64 bg-gray-100 rounded-lg overflow-hidden"
          >
            {!scanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500 text-center px-4">
                  Avvia lo scanner per iniziare
                </p>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50">
                <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
                <p className="text-red-600 text-center px-4">
                  {error}
                </p>
              </div>
            )}
            
            <div id="qr-reader" className="w-full h-full"></div>
          </div>
          
          {permission === false && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-red-700 text-sm font-medium">Permesso fotocamera negato</p>
                    <p className="text-red-600 text-sm mt-1">
                      Per scansionare codici QR, consenti l'accesso alla fotocamera dalle impostazioni del browser.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Chiudi
          </Button>
          
          {!scanning ? (
            <Button 
              type="button" 
              onClick={startScanner}
              disabled={scanning}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Avvia scanner
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={stopScanner}
              className="flex-1"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scansione in corso...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Interrompi
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QrScanner;