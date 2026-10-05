import { Router } from "express";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { activiteRouter } from "./modules/activite/activite.routes.js";
import { annuaireRouter } from "./modules/annuaire/annuaire.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { clientsRouter } from "./modules/clients/clients.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { espaceClientRouter } from "./modules/espace-client/espace-client.routes.js";
import { facturationRouter } from "./modules/facturation/facturation.routes.js";
import { interventionsRouter } from "./modules/interventions/interventions.routes.js";
import { profilPublicRouter } from "./modules/profil-public/profil-public.routes.js";

export const routes = Router();

routes.get("/health", (req, res) => res.json({ ok: true }));

routes.use("/auth", authRouter);
routes.use("/annuaire", annuaireRouter);

// Les sessions client n'ont pas d'activiteId : elles ne doivent jamais atteindre les routes pro
const client = [requireAuth, requireRole("CLIENT")];
const pro = [requireAuth, requireRole("RESPONSABLE", "TECHNICIEN")];

routes.use("/espace-client", client, espaceClientRouter);
routes.use("/dashboard", pro, dashboardRouter);
routes.use("/interventions", pro, interventionsRouter);
routes.use("/clients", pro, clientsRouter);
routes.use("/facturation", pro, facturationRouter);
routes.use("/profil-public", pro, profilPublicRouter);
routes.use("/activite", pro, activiteRouter);
