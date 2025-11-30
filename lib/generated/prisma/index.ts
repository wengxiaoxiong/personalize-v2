// Lightweight PrismaClient stub to keep Server Actions working in demo/offline mode.
// The real client can replace this file after running `prisma generate` with database access.
import crypto from "crypto";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type UpsertArgs<T> = { where: Record<string, any>; update: Partial<T>; create: T };

type FindManyArgs<T> = { where?: Record<string, any>; orderBy?: Record<string, "asc" | "desc">; take?: number; include?: any };

type CreateArgs<T> = { data: T };

function withTimestamps<T extends { createdAt?: Date; updatedAt?: Date }>(data: T): T {
  const now = new Date();
  return { ...data, createdAt: data.createdAt ?? now, updatedAt: data.updatedAt ?? now };
}

export class PrismaClient {
  private personas: any[] = [];
  private materials: any[] = [];
  private generations: any[] = [];
  private recommendations: any[] = [];
  private users: any[] = [];
  private stylePacks: any[] = [];

  user = {
    upsert: async ({ where, create }: UpsertArgs<any>) => {
      const existing = this.users.find((u) => u.id === where.id);
      if (existing) return existing;
      const next = withTimestamps(create);
      this.users.push(next);
      return next;
    },
  };

  kosPersona = {
    findMany: async (_args: FindManyArgs<any>) => this.personas,
    findUnique: async ({ where }: any) => this.personas.find((p) => p.id === where.id) || null,
    findFirst: async ({ where }: any) => this.personas.find((p) => p.userId === where.userId && p.name === where.name) || null,
    create: async ({ data }: CreateArgs<any>) => {
      const next = withTimestamps({ id: crypto.randomUUID(), ...data });
      this.personas.push(next);
      return next;
    },
  };

  contentGeneration = {
    findMany: async (_args: FindManyArgs<any>) => this.generations,
    create: async ({ data }: CreateArgs<any>) => {
      const next = withTimestamps({ id: crypto.randomUUID(), ...data });
      this.generations.push(next);
      return next;
    },
  };

  recommendation = {
    findMany: async (_args: FindManyArgs<any>) => this.recommendations,
  };

  productMaterial = {
    findMany: async (_args: FindManyArgs<any>) => this.materials,
    create: async ({ data }: CreateArgs<any>) => {
      const next = withTimestamps({ id: crypto.randomUUID(), ...data });
      this.materials.push(next);
      return next;
    },
    upsert: async ({ where, create }: UpsertArgs<any>) => {
      const existing = this.materials.find((m) => m.id === where.id);
      if (existing) return existing;
      const next = withTimestamps(create);
      this.materials.push(next);
      return next;
    },
  };

  stylePack = {
    upsert: async ({ where, create }: UpsertArgs<any>) => {
      const existing = this.stylePacks.find((m) => m.id === where.id);
      if (existing) return existing;
      const next = withTimestamps(create);
      this.stylePacks.push(next);
      return next;
    },
  };
}
