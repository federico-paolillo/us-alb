import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const frontend = resolve(import.meta.dirname, "..");
const runId = `${process.pid}-${Date.now()}`;
const network = `frontend-image-network-${runId}`;
const image = `frontend-image-test:${runId}`;
const cms = `frontend-image-cms-${runId}`;
const mediaCms = `frontend-image-media-${runId}`;
const containers = [];
let temporaryDirectory;

test("the standalone image supports read-only runtime configuration and caching", async (t) => {
  t.after(cleanup);
  try {
    await runIntegration();
  } catch (error) {
    await printDiagnostics();
    throw error;
  }
});

async function runIntegration() {
  await mkdir(join(frontend, ".test-build"), { recursive: true });
  temporaryDirectory = await mkdtemp(
    join(frontend, ".test-build", "container-"),
  );

  await docker("network", "create", network);
  await docker(
    "run",
    "--detach",
    "--name",
    cms,
    "--network",
    network,
    "--network-alias",
    "mock-cms",
    "--read-only",
    "--tmpfs",
    "/tmp:mode=1777",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--mount",
    `type=bind,src=${resolve(frontend, "test/container/mock-cms.mjs")},dst=/app/mock-cms.mjs,readonly`,
    "node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608",
    "node",
    "/app/mock-cms.mjs",
  );

  await docker(
    "build",
    "--file",
    "Dockerfile",
    "--tag",
    image,
    "--build-arg",
    "CMS_MEDIA_URL=http://localhost:65101",
    "--build-arg",
    "SITE_URL=http://build.example",
    "--build-arg",
    "NEXT_PUBLIC_APP_VERSION=container-validation",
    ".",
  );

  await verifyImage();

  const direct = await startFrontend("direct", {
    environment: appEnvironment("http://direct.example"),
  });
  assert.match(
    (await request(direct, "/sitemap.xml")).body,
    /http:\/\/direct\.example/,
  );

  const secretPath = await writeSecret("secret.env", "http://secret.example");
  const secretOnly = await startFrontend("secret", { secretPath });
  assert.match(
    (await request(secretOnly, "/sitemap.xml")).body,
    /http:\/\/secret\.example/,
  );

  const precedencePath = await writeSecret(
    "precedence.env",
    "http://secret.example",
  );
  const combined = await startFrontend("combined", {
    environment: ["SITE_URL=http://direct-override.example"],
    secretPath: precedencePath,
  });
  assert.match(
    (await request(combined, "/sitemap.xml")).body,
    /http:\/\/direct-override\.example/,
  );
  await startMediaCms(combined);

  const missing = await startFrontend("missing", { waitPath: null });
  const missingResponse = await waitForMissingConfig(missing);
  assert.notEqual(missingResponse?.status, 200);

  const firstPage = await request(combined, "/notizie");
  assert.equal(firstPage.status, 200);
  assert.match(firstPage.body, /Versione(?:\s|<!-- -->)*container-validation/);
  const staticPath = firstPage.body.match(
    /(?:src|href)="([^"]*\/_next\/static\/[^"]+)/,
  )?.[1];
  assert.ok(staticPath, "the page includes a hashed static asset");
  assert.equal((await request(combined, staticPath)).status, 200);

  const imageResponse = await request(
    combined,
    "/_next/image?url=http%3A%2F%2Flocalhost%3A65101%2Fmedia%2Ftest.png&w=64&q=75",
    { headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" } },
  );
  assert.equal(imageResponse.status, 200, imageResponse.body);
  assert.match(imageResponse.headers.get("content-type") ?? "", /^image\//);
  await docker(
    "exec",
    combined.name,
    "/nodejs/bin/node",
    "-e",
    "const fs=require('fs'); if (!fs.readdirSync('/app/.next/cache/images').length) process.exit(1)",
  );

  const countsAfterFirst = await cmsCounts();
  await request(combined, "/notizie");
  assert.deepEqual(await cmsCounts(), countsAfterFirst);

  const refreshed = await request(combined, "/refresh", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidate": "integration-secret",
    },
    body: JSON.stringify({
      event: "entry.update",
      createdAt: "2026-10-15T00:00:00.000Z",
      model: "news-item",
      entry: { id: 1 },
    }),
  });
  assert.equal(refreshed.status, 200);
  assert.deepEqual(JSON.parse(refreshed.body).revalidated, ["news"]);
  await request(combined, "/notizie");
  const countsAfterRevalidation = await cmsCounts();
  assert.ok(
    countsAfterRevalidation["/api/news"] > countsAfterFirst["/api/news"],
  );
  assert.equal(
    countsAfterRevalidation["/api/calendar-entries"],
    countsAfterFirst["/api/calendar-entries"],
  );
  assert.equal(
    countsAfterRevalidation["/api/official-documents"],
    countsAfterFirst["/api/official-documents"],
  );
}

async function verifyImage() {
  const configuration = JSON.parse(await docker("image", "inspect", image));
  const config = configuration[0].Config;
  assert.deepEqual(config.Entrypoint, ["/nodejs/bin/node"]);
  assert.deepEqual(config.Cmd, ["/app/server.js"]);
  assert.equal(config.User, "nonroot");
  assert.equal(config.WorkingDir, "/app");
  assert.equal(config.Volumes ?? null, null);
  assert.ok(config.ExposedPorts["65100/tcp"]);

  const inspection = await docker(
    "run",
    "--rm",
    "--entrypoint",
    "/nodejs/bin/node",
    image,
    "-e",
    "const fs=require('fs'); const assert=require('assert'); assert.equal(fs.readlinkSync('/app/.env'), '/run/secrets/frontend.env'); assert.ok(fs.statSync('/app/.next/static').isDirectory()); assert.throws(() => fs.accessSync('/app/server.js', fs.constants.W_OK)); for (const path of ['/app/app','/app/components','/app/next.config.ts','/app/.env.example']) assert.ok(!fs.existsSync(path), path + ' must be absent')",
  );
  assert.equal(inspection, "");
}

function appEnvironment(siteUrl) {
  return [
    "CMS_URL=http://mock-cms:65101/api",
    "CMS_MEDIA_URL=http://mock-cms:65101",
    "CMS_WEBHOOKS_SECRET_HEADER=revalidate",
    "CMS_WEBHOOKS_SECRET_HEADER_VALUE=integration-secret",
    "PREVIEW_SECRET=integration-preview-secret",
    `SITE_URL=${siteUrl}`,
  ];
}

async function writeSecret(name, siteUrl) {
  const path = join(temporaryDirectory, name);
  await writeFile(path, `${appEnvironment(siteUrl).join("\n")}\n`, {
    mode: 0o644,
  });
  return path;
}

async function startFrontend(
  suffix,
  { environment = [], secretPath, waitPath = "/sitemap.xml" } = {},
) {
  const name = `frontend-image-${suffix}-${runId}`;
  const args = [
    "run",
    "--detach",
    "--name",
    name,
    "--network",
    network,
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--tmpfs",
    "/app/.next/cache:mode=1777",
    "--tmpfs",
    "/tmp:mode=1777",
    "--publish",
    "127.0.0.1::65100",
  ];
  for (const value of environment) args.push("--env", value);
  if (secretPath) {
    args.push(
      "--mount",
      `type=bind,src=${secretPath},dst=/run/secrets/frontend.env,readonly`,
    );
  }
  args.push(image);
  await docker(...args);
  const port = (await docker("port", name, "65100/tcp"))
    .trim()
    .replace(/^.*:/, "");
  const container = { name, origin: `http://127.0.0.1:${port}` };
  containers.push(name);
  if (waitPath) await waitForResponse(container, waitPath);
  return container;
}

async function startMediaCms(frontendContainer) {
  await docker(
    "run",
    "--detach",
    "--name",
    mediaCms,
    "--network",
    `container:${frontendContainer.name}`,
    "--read-only",
    "--tmpfs",
    "/tmp:mode=1777",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--mount",
    `type=bind,src=${resolve(frontend, "test/container/mock-cms.mjs")},dst=/app/mock-cms.mjs,readonly`,
    "node:24.20.0-trixie@sha256:f7d34e58713740f9eef9092c0bd6ff10369d132f7238399a4b270f16d47fa608",
    "node",
    "/app/mock-cms.mjs",
  );
}

async function request(container, path, options) {
  const response = await fetch(`${container.origin}${path}`, options);
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  };
}

async function waitForResponse(container, path) {
  const deadline = Date.now() + 30_000;
  let failure;
  while (Date.now() < deadline) {
    try {
      return await request(container, path);
    } catch (error) {
      failure = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Container ${container.name} did not respond: ${failure}`);
}

async function waitForMissingConfig(container) {
  const deadline = Date.now() + 30_000;
  let response;
  while (Date.now() < deadline) {
    try {
      response = await request(container, "/notizie");
    } catch {
      // The server may close the first request while rendering the invalid route.
    }
    if (/Env\. var\. .+ is not set/.test(await dockerLogs(container.name))) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Container ${container.name} did not report missing configuration`,
  );
}

async function cmsCounts() {
  return JSON.parse(
    await docker(
      "exec",
      cms,
      "node",
      "-e",
      "fetch('http://127.0.0.1:65101/__counts').then(response => response.text()).then(console.log)",
    ),
  );
}

async function docker(...args) {
  try {
    const { stdout } = await execFileAsync("docker", args, {
      cwd: frontend,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(
      `docker ${args[0]} failed${details ? `:\n${details}` : ""}`,
      {
        cause: error,
      },
    );
  }
}

async function dockerLogs(name) {
  try {
    const { stderr, stdout } = await execFileAsync("docker", ["logs", name], {
      cwd: frontend,
      maxBuffer: 10 * 1024 * 1024,
    });
    return `${stdout}${stderr}`;
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(`docker logs failed${details ? `:\n${details}` : ""}`, {
      cause: error,
    });
  }
}

async function printDiagnostics() {
  for (const name of [...containers, mediaCms, cms]) {
    try {
      console.error(`Container ${name} logs:\n${await dockerLogs(name)}`);
    } catch {
      // A resource may not exist when startup itself failed.
    }
  }
}

async function cleanup() {
  for (const name of containers.reverse()) {
    await dockerIgnoreFailure("rm", "--force", name);
  }
  await dockerIgnoreFailure("rm", "--force", mediaCms);
  await dockerIgnoreFailure("rm", "--force", cms);
  await dockerIgnoreFailure("network", "rm", network);
  await dockerIgnoreFailure("image", "rm", "--force", image);
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function dockerIgnoreFailure(...args) {
  try {
    await docker(...args);
  } catch {
    // Cleanup only addresses this test run's exact resource names.
  }
}
