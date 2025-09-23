import express, { Request, Response, NextFunction } from "express";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();

  const vite = await createViteServer({
    root: __dirname,
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.originalUrl;
      const templatePath = path.resolve(__dirname, "index.html");
      const raw = await readFile(templatePath, "utf-8");
      let template = await vite.transformIndexHtml(url, raw);

      const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
      const { html, head } = await render();

      template = template.replace("<!--app-head-->", head).replace('<div id="root"></div>', `<div id="root">${html}</div>`);

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  const port = process.env.PORT || 5173;
  app.listen(port, () => console.log(`SSR server running http://localhost:${port}`));
}

createServer();
