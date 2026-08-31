import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as unknown as pg.Pool);

export const db = pool ? drizzle(pool, { schema }) : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export * from "./schema";
export * from "./seed-data";
export * from "./seed";
