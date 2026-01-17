const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const compression = require('compression');
const helmet = require('helmet');
const hpp = require('hpp');
const { rateLimit } = require('express-rate-limit');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// When using middleware 
const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

const compress = compression();
const securityHeaders = helmet({
  contentSecurityPolicy: false, // Set to false if you have trouble with script sources, or configure it properly
});
const parameterPollution = hpp();
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // 1. Compression
      compress(req, res, () => {
        // 2. Security Headers
        securityHeaders(req, res, () => {
          // 3. Parameter Pollution Protection
          parameterPollution(req, res, () => {
            // 4. Rate Limiting for API routes
            if (req.url.startsWith('/api/')) {
              apiLimiter(req, res, async () => {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
              });
            } else {
              const parsedUrl = parse(req.url, true);
              handle(req, res, parsedUrl);
            }
          });
        });
      });
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});