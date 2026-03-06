const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Bug Tracker Demo API",
    version: "2.1.0",
    description: "Portfolio-ready bug tracker API with analytics, comments, seeding, and dashboard.",
  },
  servers: [{ url: "/", description: "Local server" }],
  tags: [
    { name: "System" },
    { name: "Bugs" },
    { name: "Analytics" },
  ],
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
        required: ["error"],
      },
      Bug: {
        type: "object",
        properties: {
          id: { type: "integer", example: 2 },
          title: { type: "string", example: "Checkout button does nothing" },
          description: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "fixed", "reopened"] },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          assignee: { type: "string", nullable: true },
          labels: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
          comments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                author: { type: "string" },
                message: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
              },
              required: ["id", "author", "message", "createdAt"],
            },
          },
        },
        required: ["id", "title", "description", "status", "severity", "labels", "createdAt", "updatedAt", "comments"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health and uptime",
        responses: {
          200: {
            description: "Service health",
          },
        },
      },
    },
    "/seed": {
      post: {
        tags: ["System"],
        summary: "Seed demo data",
        parameters: [
          { name: "size", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 }, required: false },
          { name: "reset", in: "query", schema: { type: "boolean" }, required: false },
        ],
        responses: {
          201: { description: "Seed complete" },
          400: { description: "Validation error" },
        },
      },
    },
    "/bugs": {
      get: {
        tags: ["Bugs"],
        summary: "List bugs",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "severity", in: "query", schema: { type: "string" } },
          { name: "assignee", in: "query", schema: { type: "string" } },
          { name: "label", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["id", "createdAt", "updatedAt", "severity"] } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0 } },
        ],
        responses: {
          200: {
            description: "Paginated bugs",
          },
        },
      },
      post: {
        tags: ["Bugs"],
        summary: "Create bug",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  assignee: { type: "string" },
                  labels: { type: "array", items: { type: "string" } },
                  dueDate: { type: "string", format: "date-time" },
                },
                required: ["title", "description", "severity"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Bug" },
              },
            },
          },
          400: {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/bugs/{id}": {
      get: {
        tags: ["Bugs"],
        summary: "Get bug details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: {
            description: "Bug details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Bug" },
              },
            },
          },
          404: {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
      patch: {
        tags: ["Bugs"],
        summary: "Update bug",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string", enum: ["open", "in_progress", "fixed", "reopened"] },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  assignee: { type: "string", nullable: true },
                  labels: { type: "array", items: { type: "string" } },
                  dueDate: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          400: { description: "Validation error" },
          404: { description: "Not found" },
        },
      },
      delete: {
        tags: ["Bugs"],
        summary: "Delete bug",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Deleted" },
          404: { description: "Not found" },
        },
      },
    },
    "/bugs/{id}/comments": {
      post: {
        tags: ["Bugs"],
        summary: "Add comment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  author: { type: "string" },
                  message: { type: "string" },
                },
                required: ["author", "message"],
              },
            },
          },
        },
        responses: {
          201: { description: "Created" },
          404: { description: "Bug not found" },
        },
      },
    },
    "/bugs/{id}/timeline": {
      get: {
        tags: ["Bugs"],
        summary: "Get bug timeline",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Timeline events" },
          404: { description: "Bug not found" },
        },
      },
    },
    "/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Aggregate bug metrics",
        responses: {
          200: { description: "Summary metrics" },
        },
      },
    },
    "/analytics/leaderboard": {
      get: {
        tags: ["Analytics"],
        summary: "Assignee leaderboard",
        responses: {
          200: { description: "Leaderboard rows" },
        },
      },
    },
  },
} as const;

export { openApiDocument };
