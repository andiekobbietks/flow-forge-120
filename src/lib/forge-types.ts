import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────

export const ScaffoldLevelSchema = z.enum(["exploratory", "competent", "exemplary", "rad"]);
export type ScaffoldLevel = z.infer<typeof ScaffoldLevelSchema>;

export const MysqlTypeSchema = z.enum([
  "INT", "BIGINT", "SMALLINT", "TINYINT",
  "VARCHAR", "CHAR", "TEXT", "LONGTEXT",
  "DECIMAL", "FLOAT", "DOUBLE",
  "DATETIME", "DATE", "TIMESTAMP", "TIME",
  "BOOLEAN", "ENUM", "JSON", "BLOB",
]);

export const ConstraintSchema = z.enum([
  "PRIMARY KEY", "NOT NULL", "UNIQUE", "DEFAULT", "CHECK", "FOREIGN KEY", "AUTO_INCREMENT",
]);

export const CardinalitySchema = z.enum(["1:1", "1:M", "M:M"]);

export const CrudOpSchema = z.enum(["CREATE", "READ", "UPDATE", "DELETE"]);

export const PageLayoutSchema = z.enum(["table-crud", "form", "dashboard", "detail"]);

// ── Field ──────────────────────────────────────────────────────────

export const ForgeFieldSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Field name must be snake_case"),
  type: z.string(), // Allow "VARCHAR(255)" etc — loose match
  constraint: z.string().default(""),
  nullable: z.boolean().default(true),
  default: z.string().optional(),
  references: z
    .object({
      entity: z.string(),
      field: z.string(),
    })
    .optional(),
});
export type ForgeField = z.infer<typeof ForgeFieldSchema>;

// ── Entity ─────────────────────────────────────────────────────────

export const ForgeEntitySchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Entity name must be snake_case"),
  fields: z.array(ForgeFieldSchema).min(1),
  indexes: z.array(z.string()).default([]),
  audit: z.boolean().default(false),
});
export type ForgeEntity = z.infer<typeof ForgeEntitySchema>;

// ── Relationship ───────────────────────────────────────────────────

export const ForgeRelationshipSchema = z.object({
  name: z.string(),
  from: z.string(),
  to: z.string(),
  cardinality: CardinalitySchema,
  on_delete: z.string().default("CASCADE"),
  on_update: z.string().default("CASCADE"),
});
export type ForgeRelationship = z.infer<typeof ForgeRelationshipSchema>;

// ── Transaction ────────────────────────────────────────────────────

export const ForgeTransactionSchema = z.object({
  entity: z.string(),
  operations: z.array(CrudOpSchema).min(1),
  auth: z.boolean().default(false),
  validation: z.array(z.string()).default([]),
  pagination: z.boolean().default(false),
});
export type ForgeTransaction = z.infer<typeof ForgeTransactionSchema>;

// ── Page ───────────────────────────────────────────────────────────

export const ForgePageSchema = z.object({
  route: z.string(),
  title: z.string(),
  entity: z.string(),
  layout: PageLayoutSchema.default("table-crud"),
  fields: z.array(z.string()).default([]),
});
export type ForgePage = z.infer<typeof ForgePageSchema>;

// ── Config ─────────────────────────────────────────────────────────

export const ForgeConfigSchema = z.object({
  server: z
    .object({
      port: z.number().default(3000),
      host: z.string().default("localhost"),
    })
    .default({}),
  database: z
    .object({
      host: z.string().default("localhost"),
      port: z.number().default(3306),
      name: z.string().default("lampforge_db"),
      user: z.string().default("root"),
    })
    .default({}),
  session: z
    .object({
      max_age: z.number().default(3600),
    })
    .default({}),
});
export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;

// ── Blueprint (root) ──────────────────────────────────────────────

export const ForgeBlueprintSchema = z.object({
  version: z.string().default("1.0"),
  project: z.object({
    name: z.string(),
    description: z.string().default(""),
    dialect: z.string().default("mysql"),
  }),
  scaffold_level: ScaffoldLevelSchema,
  entities: z.array(ForgeEntitySchema).min(1),
  relationships: z.array(ForgeRelationshipSchema).default([]),
  transactions: z.array(ForgeTransactionSchema).default([]),
  pages: z.array(ForgePageSchema).default([]),
  config: ForgeConfigSchema.default({}),
  rad_migration_notes: z.array(z.string()).optional(),
});
export type ForgeBlueprint = z.infer<typeof ForgeBlueprintSchema>;

// ── Validation ────────────────────────────────────────────────────

export function validateBlueprint(raw: unknown): ForgeBlueprint {
  const result = ForgeBlueprintSchema.parse(raw);

  // Cross-reference: relationships must reference existing entity names
  const entityNames = new Set(result.entities.map((e) => e.name));
  for (const rel of result.relationships) {
    if (!entityNames.has(rel.from)) {
      throw new Error(`Relationship "${rel.name}" references unknown entity "${rel.from}"`);
    }
    if (!entityNames.has(rel.to)) {
      throw new Error(`Relationship "${rel.name}" references unknown entity "${rel.to}"`);
    }
  }

  // Cross-reference: transactions must reference existing entities
  for (const txn of result.transactions) {
    if (!entityNames.has(txn.entity)) {
      throw new Error(`Transaction references unknown entity "${txn.entity}"`);
    }
  }

  // Cross-reference: pages must reference existing entities
  for (const page of result.pages) {
    if (!entityNames.has(page.entity)) {
      throw new Error(`Page "${page.route}" references unknown entity "${page.entity}"`);
    }
  }

  return result;
}

// ── Tool Schema for AI ────────────────────────────────────────────

export function getBlueprintToolSchema() {
  return {
    type: "function" as const,
    function: {
      name: "generate_blueprint",
      description:
        "Generate a ForgeBlueprint — a complete LAMP application architecture from the user's intent.",
      parameters: {
        type: "object",
        properties: {
          version: { type: "string", default: "1.0" },
          project: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              dialect: { type: "string", default: "mysql" },
            },
            required: ["name"],
          },
          scaffold_level: {
            type: "string",
            enum: ["exploratory", "competent", "exemplary", "rad"],
          },
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "snake_case entity name" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" },
                      constraint: { type: "string", default: "" },
                      nullable: { type: "boolean", default: true },
                      default: { type: "string" },
                      references: {
                        type: "object",
                        properties: {
                          entity: { type: "string" },
                          field: { type: "string" },
                        },
                      },
                    },
                    required: ["name", "type"],
                  },
                },
                indexes: { type: "array", items: { type: "string" } },
                audit: { type: "boolean", default: false },
              },
              required: ["name", "fields"],
            },
          },
          relationships: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                from: { type: "string" },
                to: { type: "string" },
                cardinality: { type: "string", enum: ["1:1", "1:M", "M:M"] },
                on_delete: { type: "string", default: "CASCADE" },
                on_update: { type: "string", default: "CASCADE" },
              },
              required: ["name", "from", "to", "cardinality"],
            },
          },
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                entity: { type: "string" },
                operations: {
                  type: "array",
                  items: { type: "string", enum: ["CREATE", "READ", "UPDATE", "DELETE"] },
                },
                auth: { type: "boolean", default: false },
                validation: { type: "array", items: { type: "string" } },
                pagination: { type: "boolean", default: false },
              },
              required: ["entity", "operations"],
            },
          },
          pages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                route: { type: "string" },
                title: { type: "string" },
                entity: { type: "string" },
                layout: { type: "string", enum: ["table-crud", "form", "dashboard", "detail"] },
                fields: { type: "array", items: { type: "string" } },
              },
              required: ["route", "title", "entity"],
            },
          },
          config: {
            type: "object",
            properties: {
              server: {
                type: "object",
                properties: {
                  port: { type: "number" },
                  host: { type: "string" },
                },
              },
              database: {
                type: "object",
                properties: {
                  host: { type: "string" },
                  port: { type: "number" },
                  name: { type: "string" },
                  user: { type: "string" },
                },
              },
              session: {
                type: "object",
                properties: {
                  max_age: { type: "number" },
                },
              },
            },
          },
          rad_migration_notes: { type: "array", items: { type: "string" } },
        },
        required: ["project", "scaffold_level", "entities"],
        additionalProperties: false,
      },
    },
  };
}
