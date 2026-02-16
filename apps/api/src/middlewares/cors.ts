import cors from "cors";
import { env } from "../utils/env";

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true
});
