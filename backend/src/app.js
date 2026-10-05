import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, routeNotFound } from "./middleware/error.js";
import { routes } from "./routes.js";

export const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", routes);

app.use(routeNotFound);
app.use(errorHandler);
