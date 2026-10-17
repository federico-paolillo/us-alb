import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  return ({
    host: env('HOST', '127.0.0.1'),
    port: env.int('PORT', 1337),
    url: env('SERVER_URL', ''),
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
