import { createServer } from "node:http";

const counts = Object.create(null);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL02wAAAABJRU5ErkJggg==",
  "base64",
);
const collectionPaths = new Set([
  "/api/news",
  "/api/calendar-entries",
  "/api/official-documents",
]);

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://mock-cms").pathname;

  if (request.method === "GET" && collectionPaths.has(path)) {
    counts[path] = (counts[path] ?? 0) + 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: [] }));
    return;
  }

  if (request.method === "GET" && path === "/media/test.png") {
    response.writeHead(200, { "content-type": "image/png" });
    response.end(png);
    return;
  }

  if (request.method === "GET" && path === "/__counts") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(counts));
    return;
  }

  response.writeHead(404);
  response.end();
});

server.listen(65101, "0.0.0.0");
