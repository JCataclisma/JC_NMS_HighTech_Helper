const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const root = __dirname;
const port = 8766;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".gz": "application/gzip", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((request, response) => {
  const requested = decodeURIComponent((request.url || "/").split("?")[0]);
  const relative = requested === "/" ? "/index.html" : requested;
  const file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end("Not found"); return; }
  response.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(response);
});
server.listen(port, "127.0.0.1", () => { const url = `http://127.0.0.1:${port}/index.html`; console.log(`NMS HighTech Helper available at ${url}`); exec(`start "" "${url}"`); });
process.on("SIGINT", () => server.close(() => process.exit(0)));
