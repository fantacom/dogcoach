export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
}
export const optionalEnv = (name: string) => Deno.env.get(name) || undefined;
