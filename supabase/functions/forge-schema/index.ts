import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEVEL_PROMPTS: Record<string, string> = {
  exploratory: `You are a database schema designer for a WJEC/Eduqas student targeting Grade E/D.
Produce FLAT 1NF tables only. Simple column types (INT, VARCHAR, TEXT, DATE). 
NO foreign keys, NO constraints beyond PRIMARY KEY. NO indexes. NO audit columns.
Each entity is a standalone table with an auto-increment id.`,

  competent: `You are a database schema designer for a WJEC/Eduqas student targeting Grade C/B.
Produce 2NF-normalized tables with PRIMARY KEYs and basic FOREIGN KEYs.
Use NOT NULL on key fields. Basic data types. No composite indexes.
No audit columns. Simple relationships.`,

  exemplary: `You are a database schema designer for a WJEC/Eduqas student targeting Grade A/A*.
Produce fully normalized 3NF schemas. Include:
- AUTO_INCREMENT primary keys
- FOREIGN KEY constraints with ON DELETE CASCADE
- Composite indexes on frequently queried columns
- created_at and updated_at audit columns
- Junction tables for M:M relationships
- NOT NULL, UNIQUE, CHECK constraints where appropriate`,

  rad: `You are an expert database architect in RAD 2.0 mode.
Produce the most robust, production-grade normalized schema possible. No grade ceiling. Include EVERY best practice:
- Full 3NF+ normalization, AUTO_INCREMENT PKs
- FOREIGN KEY constraints with CASCADE
- Composite indexes, UNIQUE, CHECK constraints
- created_at, updated_at, deleted_at (soft deletes) audit columns
- Junction tables for M:M with timestamps
- Pagination and search considerations
- If the user mentions a non-LAMP stack, still produce the LAMP reference but add rad_migration_notes.`,
};

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_blueprint",
    description: "Generate a ForgeBlueprint — a complete LAMP application architecture.",
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
              name: { type: "string" },
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
                      properties: { entity: { type: "string" }, field: { type: "string" } },
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
              auth: { type: "boolean" },
              validation: { type: "array", items: { type: "string" } },
              pagination: { type: "boolean" },
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
            server: { type: "object", properties: { port: { type: "number" }, host: { type: "string" } } },
            database: {
              type: "object",
              properties: { host: { type: "string" }, port: { type: "number" }, name: { type: "string" }, user: { type: "string" } },
            },
            session: { type: "object", properties: { max_age: { type: "number" } } },
          },
        },
        rad_migration_notes: { type: "array", items: { type: "string" } },
      },
      required: ["project", "scaffold_level", "entities"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, scaffoldLevel = "rad", routeContext } = await req.json();

    if (!intent || typeof intent !== "string") {
      return new Response(
        JSON.stringify({ error: "Intent is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const level = LEVEL_PROMPTS[scaffoldLevel] || LEVEL_PROMPTS.rad;
    const routeLine = routeContext
      ? `\nThe routing model classified this intent as "${routeContext}". Optimize accordingly.`
      : "";

    const systemPrompt = `${level}${routeLine}

CRITICAL: Call the generate_blueprint tool with a complete ForgeBlueprint JSON.
The scaffold_level must be "${scaffoldLevel}".
Entity and field names MUST be snake_case. Every entity MUST have an "id" field as PRIMARY KEY.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: intent },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "generate_blueprint" } },
        temperature: 0.2,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later.", status: 429 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits.", status: 402 }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract blueprint from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try content as JSON
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        // Try extracting JSON from fences
        const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ error: "Failed to extract blueprint from AI response" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("forge-schema error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
