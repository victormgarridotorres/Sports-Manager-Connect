import "server-only";
import { connection } from "next/server";

/**
 * Hora actual para una petición concreta. Con Cache Components hay que llamar
 * a connection() antes de leer el reloj (ver docs: "Random values and timestamps").
 */
export async function requestNow() {
  await connection();
  return new Date();
}
