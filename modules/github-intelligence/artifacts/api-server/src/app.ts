import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import legacyGitHubRouter from "./legacy-app/server";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  try {
    if (new URL(origin).host.toLowerCase() !== (req.get("host") ?? "").toLowerCase()) {
      res.status(403).json({ error: "Origem da solicitação não permitida." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Origem da solicitação inválida." });
    return;
  }
  next();
});
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(legacyGitHubRouter);
app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, "Falha não tratada pela API");
  if (!res.headersSent) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export default app;
