import "server-only";
import { makeAppConfig } from "@cmsjs/environment";

export type { AppConfig } from "@cmsjs/environment";

export const config = makeAppConfig(process.env);
