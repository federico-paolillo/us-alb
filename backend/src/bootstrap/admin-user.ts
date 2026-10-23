import type { Core } from "@strapi/strapi";
import { resolveSecret } from "./secrets";

export async function ensureDefaultAdmin(strapi: Core.Strapi): Promise<void> {
  const password = resolveSecret("ADMIN_PASSWORD");

  if (!password) {
    strapi.log.warn(
      "Skipping default admin creation: ADMIN_PASSWORD (or ADMIN_PASSWORD_FILE) is not set.",
    );
    return;
  }

  const userService = strapi.service("admin::user");

  if (await userService.exists()) {
    return;
  }

  const { email, username } = parseAdminEmail(process.env.ADMIN_EMAIL);

  await userService.createFirstAdmin({
    email,
    password,
    username,
  });

  strapi.log.info(`Created default admin user ${email}`);
}

function parseAdminEmail(value: string | undefined): {
  email: string;
  username: string;
} {
  const email = value?.trim() || "admin@example.com";
  const [username, domain, ...rest] = email.split("@");

  if (!username || !domain || rest.length > 0) {
    throw new Error("Env. var. ADMIN_EMAIL must be a valid email address");
  }

  return { email, username };
}
