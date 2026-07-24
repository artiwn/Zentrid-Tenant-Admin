const express = require("express");
const cors = require("cors");

type FleetProxyHeaders = {
  accept?: string;
  authorization?: string;
};

type FleetProxyRequest = {
  originalUrl: string;
  method: string;
  headers: FleetProxyHeaders;
  body?: unknown;
};

type FleetProxyNext = () => void;

type FleetProxyResponse = {
  json(payload: unknown): void;
  status(code: number): FleetProxyResponse;
  setHeader(name: string, value: string): void;
  send(payload: string): void;
};

const app = express();
const PORT = process.env.PORT || 5050;
const AUTH_TARGET = process.env.ZENTRID_AUTH_TARGET || "https://fleetosauth.unisys.am";
const DATA_TARGET = process.env.ZENTRID_DATA_TARGET || "https://fleetosapi.unisys.am";
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src-elem 'self'",
  "script-src-attr 'unsafe-inline'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' http://localhost:5050 https://fleetosauth.unisys.am https://fleetosapi.unisys.am",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join("; ");
// Tenant Admin currently uses the same attribute-based interaction and chart primitives as the
// validated Global Admin UI. Reporting a stricter policy than the enforced policy creates noisy
// console violations for supported markup and hides real runtime errors. Keep report-only aligned
// until those shared primitives are migrated to nonce/class-based rendering as one coordinated task.
const CONTENT_SECURITY_POLICY_REPORT_ONLY = CONTENT_SECURITY_POLICY;

app.use((_req: FleetProxyRequest, res: FleetProxyResponse, next: FleetProxyNext) => {
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  res.setHeader("Content-Security-Policy-Report-Only", CONTENT_SECURITY_POLICY_REPORT_ONLY);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req: FleetProxyRequest, res: FleetProxyResponse) => {
  res.json({ status: "ok", service: "Zentrid local proxy", port: PORT });
});

async function proxyRequest(targetBaseUrl: string, req: FleetProxyRequest, res: FleetProxyResponse): Promise<void> {
  try {
    const requestBody = ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body || {});
    const response = await fetch(`${targetBaseUrl}${req.originalUrl}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Accept": req.headers.accept || "application/json",
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      ...(requestBody !== undefined ? { body: requestBody } : {})
    });

    const text = await response.text();
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error) {
    res.status(500).json({
      message: "Proxy error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

app.use("/api/Auth", (req: FleetProxyRequest, res: FleetProxyResponse) => proxyRequest(AUTH_TARGET, req, res));
app.use("/.well-known", (req: FleetProxyRequest, res: FleetProxyResponse) => proxyRequest(AUTH_TARGET, req, res));
app.use("/api", (req: FleetProxyRequest, res: FleetProxyResponse) => proxyRequest(DATA_TARGET, req, res));

// The compiled proxy lives inside dist, so __dirname is the generated application root.
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Zentrid proxy running on http://localhost:${PORT}`);
  console.log(`Auth API -> ${AUTH_TARGET}`);
  console.log(`Data API -> ${DATA_TARGET}`);
});
