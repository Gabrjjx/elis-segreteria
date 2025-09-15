// Emergency maintenance flag for database recovery operations
// When enabled, all write operations are blocked to prevent data corruption during recovery

let maintenanceMode = false;
let maintenanceReason = '';

export function enableMaintenanceMode(reason: string = 'Database recovery in progress') {
  maintenanceMode = true;
  maintenanceReason = reason;
  console.log(`🚨 MAINTENANCE MODE ENABLED: ${reason}`);
}

export function disableMaintenanceMode() {
  maintenanceMode = false;
  maintenanceReason = '';
  console.log('✅ MAINTENANCE MODE DISABLED');
}

export function isMaintenanceModeEnabled(): boolean {
  return maintenanceMode;
}

export function getMaintenanceReason(): string {
  return maintenanceReason;
}

// Middleware to block write operations during maintenance mode
export function maintenanceMiddleware(req: any, res: any, next: any) {
  if (maintenanceMode && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
    // Allow only recovery endpoints during maintenance
    if (!req.path.includes('/api/recovery/') && !req.path.includes('/api/import/')) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        reason: maintenanceReason,
        maintenanceMode: true
      });
    }
  }
  next();
}