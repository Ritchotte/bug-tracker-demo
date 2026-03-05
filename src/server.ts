import express from "express";

const app = express();
app.use(express.json());

type BugStatus = "open" | "in_progress" | "fixed";
type Severity = "low" | "medium" | "high";

type Bug = {
  id: number;
  title: string;
  status: BugStatus;
  severity: Severity;
  createdAt: string;
};

let nextId = 1;
const bugs: Bug[] = [];

// Quick health endpoint
app.get("/health", (_req, res) => res.json({ ok: true }));

// List bugs
app.get("/bugs", (_req, res) => res.json(bugs));

// Create bug
app.post("/bugs", (req, res) => {
  const { title, severity } = req.body ?? {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }

  if (!["low", "medium", "high"].includes(severity)) {
    return res.status(400).json({ error: "severity must be low|medium|high" });
  }

  const bug: Bug = {
    id: nextId++,
    title,
    severity,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  bugs.push(bug);
  return res.status(201).json(bug);
});

// Update bug status
app.patch("/bugs/:id", (req, res) => {
  const id = Number(req.params.id);
  const bug = bugs.find((b) => b.id === id);
  if (!bug) return res.status(404).json({ error: "bug not found" });

  const { status } = req.body ?? {};

  if (status && !["open", "in_progress", "fixed"].includes(status)) {
    return res.status(400).json({ error: "status must be open|in_progress|fixed" });
  }

  if (status) bug.status = status;
  return res.json(bug);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Bug tracker running on http://localhost:${PORT}`);
});