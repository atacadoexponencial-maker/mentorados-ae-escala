// src/lib/capas.ts
// A capa definida para a marca vence; sem exceção, vale a capa base da aula.
export function resolverCapa(capaBase: string | null, capaDaMarca: string | null): string | null {
  return capaDaMarca ?? capaBase
}
