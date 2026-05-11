import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = "5173";
const devUrl = `http://${host}:${port}`;

const vite = spawn("npm", ["run", "dev", "--", "--host", host, "--port", port], {
  shell: true,
  stdio: "inherit",
});

let electron;
let shuttingDown = false;

async function waitForVite() {
  const startedAt = Date.now();
  const timeoutMs = 30_000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(devUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Timed out waiting for Vite at ${devUrl}`);
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  electron?.kill();
  vite.kill();
  process.exit(code);
}

vite.on("exit", (code) => {
  if (!shuttingDown) {
    shutdown(code ?? 0);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  await waitForVite();
  electron = spawn("electron", ["."], {
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_START_URL: devUrl,
    },
  });

  electron.on("exit", (code) => shutdown(code ?? 0));
} catch (error) {
  console.error(error);
  shutdown(1);
}
