export function getSiteName(): string {
  return (
    process.env.GUNSAFE_SITE_NAME ||
    process.env.NEXT_PUBLIC_GUNSAFE_SITE_NAME ||
    ""
  );
}

export function getSitePassword(): string {
  return process.env.GUNSAFE_SITE_PASSWORD || "";
}

export function isSitePasswordRequired(): boolean {
  return getSitePassword().length > 0;
}