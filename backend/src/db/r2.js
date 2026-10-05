import { S3Client } from "@aws-sdk/client-s3";
import { env, stockageActif } from "../config/env.js";

export const r2 = stockageActif
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    })
  : null;
