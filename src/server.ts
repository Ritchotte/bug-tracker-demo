import express, { NextFunction, Request, Response } from "express";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use((req, _res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

const BUG_STATUSES = ["open", "in_progress", "fixed", "reopened"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const SORT_FIELDS = ["id", "createdAt", "updatedAt", "severity"] as const;

type BugStatus = (typeof BUG_STATUSES)[number];
type Severity = (typeof SEVERITIES)[number];
type SortField = (typeof SORT_FIELDS)[number];
type SortOrder = "asc" | "desc";
type EventType = "created" | "updated" | "commented";

type Comment = {
  id: number;
  author: string;
  message: string;
  createdAt: string;
};

type ActivityEvent = {
  id: number;
  bugId: number;
  type: EventType;
  createdAt: string;
  message: string;
};

type Bug = {
  id: number;
  title: string;
  description: string;
  status: BugStatus;
  severity: Severity;
  assignee?: string | undefined;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string | undefined;
  resolvedAt?: string | undefined;
  comments: Comment[];
};

type BugPatchBody = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  severity?: unknown;
  assignee?: unknown;
  labels?: unknown;
  dueDate?: unknown;
};

type BugCreateBody = {
  title?: unknown;
  description?: unknown;
  severity?: unknown;
  assignee?: unknown;
  labels?: unknown;
  dueDate?: unknown;
};

let nextBugId = 1;
let nextCommentId = 1;
let nextEventId = 1;
const bugs: Bug[] = [];
const activity: ActivityEvent[] = [];

const statusSet = new Set<string>(BUG_STATUSES);
const severitySet = new Set<string>(SEVERITIES);
const sortFieldSet = new Set<string>(SORT_FIELDS);

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveInt(value: string | string[] | undefined): number | null {
  if (!value) return null;
  if (Array.isArray(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseDateOrThrow(value: unknown, fieldName: string): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be an ISO date string`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return date.toISOString();
}

function sanitizeLabels(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new Error("labels must be an array of strings");
  }
  const labels = raw
    .filter((value): value is string => typeof value === "string")
    .map((label) => label.trim().toLowerCase())
    .filter((label) => label.length > 0);
  return Array.from(new Set(labels));
}

function logEvent(bugId: number, type: EventType, message: string): void {
  activity.push({
    id: nextEventId++,
    bugId,
    type,
    message,
    createdAt: new Date().toISOString(),
  });
}

function createBugRecord(input: {
  title: string;
  description: string;
  severity: Severity;
  assignee?: string | undefined;
  labels?: string[] | undefined;
  dueDate?: string | undefined;
  status?: BugStatus | undefined;
}): Bug {
  const now = new Date().toISOString();
  const bug: Bug = {
    id: nextBugId++,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    status: input.status ?? "open",
    labels: input.labels ?? [],
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
  if (input.assignee && input.assignee.trim()) {
    bug.assignee = input.assignee.trim();
  }
  if (input.dueDate) {
    bug.dueDate = input.dueDate;
  }
  if (bug.status === "fixed") {
    bug.resolvedAt = now;
  }
  bugs.push(bug);
  logEvent(bug.id, "created", `Bug created with severity ${bug.severity}`);
  return bug;
}

function resetStore(): void {
  bugs.splice(0, bugs.length);
  activity.splice(0, activity.length);
  nextBugId = 1;
  nextCommentId = 1;
  nextEventId = 1;
}

function seedStore(size: number): Bug[] {
  const templates: Array<{
    title: string;
    description: string;
    severity: Severity;
    assignee?: string;
    labels: string[];
    status: BugStatus;
  }> = [
    {
      title: "Login button disabled on Safari",
      description: "The submit button remains disabled after valid credentials.",
      severity: "high",
      assignee: "ruth",
      labels: ["frontend", "auth"],
      status: "open",
    },
    {
      title: "Webhook retries duplicate events",
      description: "Payment webhook retries create duplicate orders in edge cases.",
      severity: "critical",
      assignee: "alex",
      labels: ["backend", "payments"],
      status: "in_progress",
    },
    {
      title: "Dark mode contrast issue in settings",
      description: "Text contrast ratio fails accessibility checks.",
      severity: "medium",
      assignee: "jamie",
      labels: ["frontend", "accessibility"],
      status: "reopened",
    },
    {
      title: "CSV export missing timezone",
      description: "Timestamps are exported without timezone marker.",
      severity: "low",
      assignee: "ruth",
      labels: ["reporting"],
      status: "fixed",
    },
    {
      title: "Rate limiter blocks internal health checks",
      description: "Health checks from trusted subnet receive 429.",
      severity: "high",
      labels: ["infra", "api"],
      status: "open",
    },
  ];

  const output: Bug[] = [];
  for (let i = 0; i < size; i += 1) {
    const t = templates[i % templates.length]!;
    const dueDate = new Date(Date.now() + ((i % 7) + 1) * 24 * 60 * 60 * 1000).toISOString();
    const bug = createBugRecord({
      title: `${t.title} #${i + 1}`,
      description: t.description,
      severity: t.severity,
      assignee: t.assignee,
      labels: t.labels,
      status: t.status,
      dueDate,
    });
    if (i % 2 === 0) {
      const comment: Comment = {
        id: nextCommentId++,
        author: t.assignee ?? "triage-bot",
        message: "Initial triage completed.",
        createdAt: new Date().toISOString(),
      };
      bug.comments.push(comment);
      bug.updatedAt = comment.createdAt;
      logEvent(bug.id, "commented", `Comment added by ${comment.author}`);
    }
    output.push(bug);
  }
  return output;
}

function findBugByIdOr404(req: Request, res: Response): Bug | null {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ error: "id must be a positive integer" });
    return null;
  }
  const bug = bugs.find((item) => item.id === id);
  if (!bug) {
    res.status(404).json({ error: "bug not found" });
    return null;
  }
  return bug;
}

function severityRank(level: Severity): number {
  const map: Record<Severity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return map[level];
}

function validateStatusTransition(current: BugStatus, next: BugStatus): void {
  if (current === "fixed" && next === "in_progress") {
    throw new Error("cannot move fixed bug directly back to in_progress");
  }
}

// Home
app.get("/", (_req, res) => {
  res.json({
    service: "Bug Tracker API",
    version: "2.0.0",
    features: [
      "query filtering/sorting/pagination",
      "assignment and labels",
      "comments and timeline",
      "analytics summary and assignee leaderboard",
    ],
    endpoints: {
      health: "/health",
      bugs: "/bugs",
      bugDetails: "/bugs/:id",
      bugComments: "/bugs/:id/comments",
      bugTimeline: "/bugs/:id/timeline",
      analyticsSummary: "/analytics/summary",
      analyticsLeaderboard: "/analytics/leaderboard",
    },
  });
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Health + uptime
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    bugCount: bugs.length,
    timestamp: new Date().toISOString(),
  });
});

// Demo seed endpoint
app.post("/seed", (req, res) => {
  const sizeRaw = req.query.size;
  const resetRaw = req.query.reset;

  const size = sizeRaw == null ? 10 : Number(Array.isArray(sizeRaw) ? sizeRaw[0] : sizeRaw);
  if (!Number.isInteger(size) || size < 1 || size > 200) {
    return res.status(400).json({ error: "size must be an integer between 1 and 200" });
  }

  const shouldReset = resetRaw == null ? true : String(Array.isArray(resetRaw) ? resetRaw[0] : resetRaw) !== "false";
  if (shouldReset) {
    resetStore();
  }

  const seeded = seedStore(size);
  return res.status(201).json({
    seeded: seeded.length,
    totalBugs: bugs.length,
    reset: shouldReset,
  });
});

// List bugs with filtering, sorting, pagination
app.get("/bugs", (req, res) => {
  const {
    status,
    severity,
    assignee,
    label,
    search,
    sortBy = "createdAt",
    order = "desc",
    limit = "25",
    offset = "0",
  } = req.query;

  const limitValue = Number(limit);
  const offsetValue = Number(offset);

  if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100) {
    return res.status(400).json({ error: "limit must be an integer between 1 and 100" });
  }
  if (!Number.isInteger(offsetValue) || offsetValue < 0) {
    return res.status(400).json({ error: "offset must be a non-negative integer" });
  }

  if (status && (typeof status !== "string" || !statusSet.has(status))) {
    return res.status(400).json({ error: `status must be one of ${BUG_STATUSES.join("|")}` });
  }
  if (severity && (typeof severity !== "string" || !severitySet.has(severity))) {
    return res.status(400).json({ error: `severity must be one of ${SEVERITIES.join("|")}` });
  }
  if (sortBy && (typeof sortBy !== "string" || !sortFieldSet.has(sortBy))) {
    return res.status(400).json({ error: `sortBy must be one of ${SORT_FIELDS.join("|")}` });
  }
  if (order !== "asc" && order !== "desc") {
    return res.status(400).json({ error: "order must be asc|desc" });
  }

  let filtered = bugs.slice();
  if (status && typeof status === "string") {
    filtered = filtered.filter((bug) => bug.status === status);
  }
  if (severity && typeof severity === "string") {
    filtered = filtered.filter((bug) => bug.severity === severity);
  }
  if (assignee && typeof assignee === "string") {
    const normalized = assignee.trim().toLowerCase();
    filtered = filtered.filter((bug) => bug.assignee?.toLowerCase() === normalized);
  }
  if (label && typeof label === "string") {
    const normalized = label.trim().toLowerCase();
    filtered = filtered.filter((bug) => bug.labels.includes(normalized));
  }
  if (search && typeof search === "string") {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter((bug) => {
      const text = `${bug.title} ${bug.description}`.toLowerCase();
      return text.includes(term);
    });
  }

  const selectedSort = sortBy as SortField;
  const selectedOrder = order as SortOrder;
  filtered.sort((a, b) => {
    let compare = 0;
    if (selectedSort === "id") compare = a.id - b.id;
    if (selectedSort === "createdAt") compare = a.createdAt.localeCompare(b.createdAt);
    if (selectedSort === "updatedAt") compare = a.updatedAt.localeCompare(b.updatedAt);
    if (selectedSort === "severity") compare = severityRank(a.severity) - severityRank(b.severity);
    return selectedOrder === "asc" ? compare : -compare;
  });

  const total = filtered.length;
  const items = filtered.slice(offsetValue, offsetValue + limitValue);

  return res.json({
    total,
    limit: limitValue,
    offset: offsetValue,
    items,
  });
});

// Get full bug details
app.get("/bugs/:id", (req, res) => {
  const bug = findBugByIdOr404(req, res);
  if (!bug) return;
  res.json(bug);
});

// Create bug
app.post("/bugs", (req, res) => {
  try {
    const body = (req.body ?? {}) as BugCreateBody;
    const { title, description, severity, assignee } = body;
    if (!isString(title)) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!isString(description)) {
      return res.status(400).json({ error: "description is required" });
    }
    if (typeof severity !== "string" || !severitySet.has(severity)) {
      return res.status(400).json({ error: `severity must be ${SEVERITIES.join("|")}` });
    }
    if (assignee != null && assignee !== "" && typeof assignee !== "string") {
      return res.status(400).json({ error: "assignee must be a string" });
    }
    const labels = sanitizeLabels(body.labels);
    const dueDate = parseDateOrThrow(body.dueDate, "dueDate");

    const bug = createBugRecord({
      title,
      description,
      severity: severity as Severity,
      labels,
      dueDate,
      assignee: typeof assignee === "string" ? assignee : undefined,
    });

    return res.status(201).json(bug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid payload";
    return res.status(400).json({ error: message });
  }
});

// Update bug fields
app.patch("/bugs/:id", (req, res) => {
  const bug = findBugByIdOr404(req, res);
  if (!bug) return;

  try {
    const body = (req.body ?? {}) as BugPatchBody;
    let changed = false;
    const notes: string[] = [];

    if (body.title !== undefined) {
      if (!isString(body.title)) return res.status(400).json({ error: "title must be a non-empty string" });
      bug.title = body.title.trim();
      changed = true;
      notes.push("title updated");
    }

    if (body.description !== undefined) {
      if (!isString(body.description)) {
        return res.status(400).json({ error: "description must be a non-empty string" });
      }
      bug.description = body.description.trim();
      changed = true;
      notes.push("description updated");
    }

    if (body.severity !== undefined) {
      if (typeof body.severity !== "string" || !severitySet.has(body.severity)) {
        return res.status(400).json({ error: `severity must be ${SEVERITIES.join("|")}` });
      }
      bug.severity = body.severity as Severity;
      changed = true;
      notes.push(`severity set to ${bug.severity}`);
    }

    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !statusSet.has(body.status)) {
        return res.status(400).json({ error: `status must be ${BUG_STATUSES.join("|")}` });
      }
      const nextStatus = body.status as BugStatus;
      validateStatusTransition(bug.status, nextStatus);
      bug.status = nextStatus;
      bug.resolvedAt = nextStatus === "fixed" ? new Date().toISOString() : undefined;
      changed = true;
      notes.push(`status set to ${bug.status}`);
    }

    if (body.assignee !== undefined) {
      if (body.assignee !== null && typeof body.assignee !== "string") {
        return res.status(400).json({ error: "assignee must be string|null" });
      }
      bug.assignee = body.assignee?.trim() || undefined;
      changed = true;
      notes.push(`assignee set to ${bug.assignee ?? "unassigned"}`);
    }

    if (body.labels !== undefined) {
      bug.labels = sanitizeLabels(body.labels);
      changed = true;
      notes.push(`labels updated (${bug.labels.join(", ") || "none"})`);
    }

    if (body.dueDate !== undefined) {
      bug.dueDate = parseDateOrThrow(body.dueDate, "dueDate");
      changed = true;
      notes.push(`dueDate set to ${bug.dueDate ?? "none"}`);
    }

    if (!changed) {
      return res.status(400).json({ error: "no valid fields provided to update" });
    }

    bug.updatedAt = new Date().toISOString();
    logEvent(bug.id, "updated", notes.join("; "));
    return res.json(bug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid payload";
    return res.status(400).json({ error: message });
  }
});

// Add comment
app.post("/bugs/:id/comments", (req, res) => {
  const bug = findBugByIdOr404(req, res);
  if (!bug) return;

  const { author, message } = req.body ?? {};
  if (!isString(author)) {
    return res.status(400).json({ error: "author is required" });
  }
  if (!isString(message)) {
    return res.status(400).json({ error: "message is required" });
  }

  const comment: Comment = {
    id: nextCommentId++,
    author: author.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  };
  bug.comments.push(comment);
  bug.updatedAt = comment.createdAt;
  logEvent(bug.id, "commented", `Comment added by ${comment.author}`);
  return res.status(201).json(comment);
});

// Timeline
app.get("/bugs/:id/timeline", (req, res) => {
  const bug = findBugByIdOr404(req, res);
  if (!bug) return;
  const events = activity.filter((event) => event.bugId === bug.id);
  res.json(events);
});

// Delete bug
app.delete("/bugs/:id", (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "id must be a positive integer" });
  }
  const index = bugs.findIndex((bug) => bug.id === id);
  if (index < 0) {
    return res.status(404).json({ error: "bug not found" });
  }
  const [deleted] = bugs.splice(index, 1);
  logEvent(id, "updated", "Bug deleted");
  return res.json({ deletedId: deleted?.id ?? id });
});

// Analytics summary
app.get("/analytics/summary", (_req, res) => {
  const now = Date.now();

  const byStatus: Record<BugStatus, number> = {
    open: 0,
    in_progress: 0,
    fixed: 0,
    reopened: 0,
  };

  const bySeverity: Record<Severity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let overdueCount = 0;
  let fixedWithTime = 0;
  let totalTimeToFixMs = 0;

  for (const bug of bugs) {
    byStatus[bug.status] += 1;
    bySeverity[bug.severity] += 1;
    if (bug.dueDate && bug.status !== "fixed") {
      if (new Date(bug.dueDate).getTime() < now) overdueCount += 1;
    }
    if (bug.resolvedAt) {
      fixedWithTime += 1;
      totalTimeToFixMs += new Date(bug.resolvedAt).getTime() - new Date(bug.createdAt).getTime();
    }
  }

  const averageHoursToFix = fixedWithTime === 0 ? null : Number((totalTimeToFixMs / fixedWithTime / 36e5).toFixed(2));

  return res.json({
    totalBugs: bugs.length,
    overdueCount,
    byStatus,
    bySeverity,
    averageHoursToFix,
  });
});

// Leaderboard by assignee
app.get("/analytics/leaderboard", (_req, res) => {
  const table: Record<string, { assigned: number; fixed: number }> = {};

  for (const bug of bugs) {
    const key = bug.assignee ?? "unassigned";
    if (!table[key]) {
      table[key] = { assigned: 0, fixed: 0 };
    }
    table[key].assigned += 1;
    if (bug.status === "fixed") {
      table[key].fixed += 1;
    }
  }

  const leaderboard = Object.entries(table)
    .map(([assignee, stats]) => ({
      assignee,
      assigned: stats.assigned,
      fixed: stats.fixed,
      fixRate: stats.assigned === 0 ? 0 : Number(((stats.fixed / stats.assigned) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.fixed - a.fixed || b.assigned - a.assigned || a.assignee.localeCompare(b.assignee));

  res.json(leaderboard);
});

app.use((_req, res) => {
  res.status(404).json({ error: "route not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = Number(process.env.PORT ?? 3000);
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Bug tracker running on http://localhost:${PORT}`);
  });
}

export { app };
