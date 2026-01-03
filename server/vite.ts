import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// Simple logging function
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Development: setup Vite server with HMR


export async function setupVite(app: Express, server: Server) {
  // Create Vite dev server in middleware mode
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,          // middleware mode for Express
      hmr: { server },               // <-- Use the Node server for HMR
      watch: { usePolling: true },   // optional: helps HMR in some environments
    },
    appType: "custom",
  });

  // Use Vite as middleware
  app.use(vite.middlewares);

  // Catch-all route to serve index.html for React Router
  app.use("/", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e: unknown) {
      if (e instanceof Error) {
        vite.ssrFixStacktrace(e);
        next(e);
      } else {
        // If it’s not an Error, wrap it
        const err = new Error(String(e));
        vite.ssrFixStacktrace(err);
        next(err);
      }
    }

  });
}
  // Production: serve built frontend
  export function serveStatic(app: Express) {
  const distPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../dist/public"
  );

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // React Router catch-all
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} // <- This is the correct closing brace for the function
