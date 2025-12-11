/**
 * Middleware to restrict routes to localhost only
 * This ensures admin dashboard is only accessible when running locally
 * 
 * In production: Only allows requests from localhost (127.0.0.1, ::1, localhost)
 * In development: Allows all requests (for easier local development)
 */
const localhostOnly = (req, res, next) => {
  // Get hostname - check this first regardless of NODE_ENV
  const hostname = (req.hostname || req.get('host') || '').toLowerCase();
  
  // Production domains that should be blocked
  const productionDomains = [
    'codecastle.store',
    'www.codecastle.store'
  ];
  
  // Check if accessed via production domain - block immediately
  const isProductionDomain = productionDomains.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );
  
  if (isProductionDomain) {
    // Blocked: accessed via production domain
    console.warn(`[SECURITY] Admin route blocked - production domain access: ${hostname}`);
    return res.status(404).json({
      status: 'error',
      message: 'Route not found'
    });
  }

  // In production, restrict to localhost only
  if (process.env.NODE_ENV === 'production') {
    // Block any non-localhost hostname access
    // Only allow localhost or 127.0.0.1 hostnames
    const isLocalhostHostname = 
      hostname === 'localhost' ||
      hostname.startsWith('localhost:') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('127.0.0.1:') ||
      hostname === ''; // Empty hostname might be from direct IP access
    
    if (!isLocalhostHostname) {
      // Blocked: non-localhost hostname
      console.warn(`[SECURITY] Admin route blocked - non-localhost hostname: ${hostname}`);
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }

    // Get the client IP address (works correctly when trust proxy is enabled)
    const clientIp = (req.ip || 
      req.connection?.remoteAddress || 
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown').toString();

    // Check if request is from localhost IP
    // Handle both IPv4 and IPv6 localhost addresses
    const isLocalhostIp = 
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp === '::ffff:127.0.0.1' ||
      clientIp.startsWith('127.') ||
      clientIp === 'localhost';

    // Final check: if IP is not localhost, block it
    if (!isLocalhostIp) {
      console.warn(`[SECURITY] Admin route blocked - non-localhost IP: ${clientIp} (hostname: ${hostname})`);
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }

    // Log successful localhost access for monitoring
    console.log(`[ADMIN] Localhost access granted: ${hostname} from ${clientIp}`);
  }

  // Allow access if it's localhost or in development
  next();
};

module.exports = localhostOnly;

