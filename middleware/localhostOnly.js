/**
 * Middleware to restrict routes to localhost only
 * This ensures admin dashboard is only accessible when running locally
 * 
 * In production: Only allows requests from localhost (127.0.0.1, ::1, localhost)
 * In development: Allows all requests (for easier local development)
 */
const localhostOnly = (req, res, next) => {
  // In production, restrict to localhost only
  if (process.env.NODE_ENV === 'production') {
    // Get the client IP address
    // Check various possible sources for the IP
    const clientIp = 
      req.ip || 
      req.connection?.remoteAddress || 
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown';

    // Get hostname
    const hostname = req.hostname || req.get('host') || '';

    // Check if request is from localhost
    // Handle both IPv4 and IPv6 localhost addresses
    const isLocalhost = 
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp === '::ffff:127.0.0.1' ||
      clientIp.startsWith('127.') ||
      clientIp === 'localhost' ||
      hostname === 'localhost' ||
      hostname.startsWith('localhost:') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('127.0.0.1:');

    if (!isLocalhost) {
      // Return 404 to hide the existence of admin routes in production
      // This prevents information disclosure about admin routes
      console.warn(`[SECURITY] Admin route accessed from non-localhost: ${clientIp} (${hostname})`);
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }
  }

  // Allow access if it's localhost or in development
  next();
};

module.exports = localhostOnly;

