"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const mode = process.argv[2] === "dist" ? "dist" : "root";
const rootDir = mode === "dist" ? path.join(projectRoot, "dist") : projectRoot;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".sol": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requestedPath = cleanPath === "/" ? "/verification-page/verification.html" : cleanPath;
  const filePath = path.normalize(path.join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

if (mode === "dist" && !fs.existsSync(rootDir)) {
  console.error("dist/ does not exist. Run npm run build first.");
  process.exit(1);
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed");
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");

  if (!filePath) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, 404, "Not found");
      return;
    }

    const contentType = contentTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(data);
  });
});

server.on("error", (error) => {
  console.error(`Unable to start server on ${host}:${port}: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Serving ${mode} at http://${host}:${port}/verification-page/verification.html`);
});
