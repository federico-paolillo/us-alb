import type { Core } from '@strapi/strapi';
import { resolvePublicUrls } from "../src/config/public-urls";

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  const { cmsPublicUrl } = resolvePublicUrls(
    env("SITE_URL"),
    env("CMS_PUBLIC_URL"),
    env("CMS_ADMIN_COOKIE_PATH"),
  );

  return ({
    host: env('HOST', '127.0.0.1'),
    port: env.int('PORT', 65101),
    url: cmsPublicUrl.href,
    app: {
      keys: env.array('APP_KEYS')!,
    },
    webhooks: {
      populateRelations: true
    },
    dirs: {
      public: env("SERVER_PUBLIC_FOLDER", "./public")
    }
  })
};

export default config;
