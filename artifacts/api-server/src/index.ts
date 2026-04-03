import app from "./app";
import { logger } from "./lib/logger";
import https from "https";
import fs from "fs";

const rawPort = process.env["PORT"] ?? "3001";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Also serve HTTPS when cert files are configured.
// Required for GPS on Android Chrome (geolocation is blocked on plain HTTP).
const sslCert = process.env["SSL_CERT"];
const sslKey = process.env["SSL_KEY"];

if (sslCert && sslKey) {
  try {
    const credentials = {
      cert: fs.readFileSync(sslCert),
      key: fs.readFileSync(sslKey),
    };
    const rawHttpsPort = process.env["HTTPS_PORT"] ?? "3443";
    const httpsPort = Number(rawHttpsPort);
    https.createServer(credentials, app).listen(httpsPort, () => {
      logger.info({ port: httpsPort }, "HTTPS server listening");
    });
  } catch (err) {
    logger.warn({ err }, "Could not start HTTPS server — check SSL_CERT and SSL_KEY paths");
  }
}
