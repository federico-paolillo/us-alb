import "server-only";

import { makeCmsClient } from "@cmsjs/cms/client";
import { type CmsConnector, makeCmsConnector } from "@cmsjs/cms/connector";
import { type AppConfig, config } from "@cmsjs/config";

export interface AppDeps {
  connector: CmsConnector;
}

function makeDeps(cfg: AppConfig): AppDeps {
  return Object.freeze({
    connector: makeCmsConnector(
      makeCmsClient(globalThis.fetch, cfg.cmsApiUrl.href, cfg.cmsApiToken),
      cfg.cmsMediaUrl.href,
    ),
  });
}

export const deps = makeDeps(config);
