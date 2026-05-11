import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("Sprites");
const destination = resolve("dist", "Sprites");

await mkdir(resolve("dist"), { recursive: true });
await cp(source, destination, { recursive: true });
