/** True when PostgREST/Postgres says the table/function is missing. */
export function isMissingSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) return false;
  return (
    lower.includes("schema cache") ||
    lower.includes("does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("pgrst205") ||
    lower.includes("pgrst202")
  );
}

/** Append migration hint only for real schema/migration problems. */
export function withMigrationHint(
  message: string,
  migrationFile: string,
): string {
  if (isMissingSchemaError(message)) {
    return `${message} — run migration ${migrationFile}`;
  }
  return message;
}
