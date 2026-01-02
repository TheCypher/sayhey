export function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET;

  if (!secret) {
    throw new Error("TOKEN_SECRET is required for auth.");
  }

  return secret;
}

export function getAppUrl(): string {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is required for auth.");
  }

  return appUrl;
}

export function getMailtrapToken(): string {
  const token = process.env.MAILTRAP_API_TOKEN;

  if (!token) {
    throw new Error("MAILTRAP_API_TOKEN is required for auth emails.");
  }

  return token;
}
