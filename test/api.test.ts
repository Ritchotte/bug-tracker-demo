import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/server";

describe("Bug Tracker API", () => {
  it("seeds demo data and reports summary", async () => {
    const seedRes = await request(app).post("/seed?size=8&reset=true");
    expect(seedRes.status).toBe(201);
    expect(seedRes.body.seeded).toBe(8);
    expect(seedRes.body.totalBugs).toBe(8);

    const summary = await request(app).get("/analytics/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.totalBugs).toBe(8);
    expect(summary.body.bySeverity.critical).toBeGreaterThanOrEqual(1);
  });

  it("supports filtering and pagination", async () => {
    await request(app).post("/seed?size=12&reset=true");

    const res = await request(app).get("/bugs?severity=high&sortBy=severity&order=desc&limit=3&offset=0");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(3);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeLessThanOrEqual(3);
    for (const item of res.body.items) {
      expect(item.severity).toBe("high");
    }
  });

  it("creates a bug, comments on it, and exposes timeline", async () => {
    await request(app).post("/seed?size=1&reset=true");

    const created = await request(app).post("/bugs").send({
      title: "Profile showcase issue",
      description: "Timeline should include comments and updates.",
      severity: "medium",
      assignee: "ruth",
      labels: ["demo", "showcase"],
    });

    expect(created.status).toBe(201);
    const bugId = created.body.id as number;

    const comment = await request(app).post(`/bugs/${bugId}/comments`).send({
      author: "reviewer",
      message: "Looks good, please add screenshots to README.",
    });
    expect(comment.status).toBe(201);
    expect(comment.body.author).toBe("reviewer");

    const timeline = await request(app).get(`/bugs/${bugId}/timeline`);
    expect(timeline.status).toBe(200);
    expect(Array.isArray(timeline.body)).toBe(true);
    expect(timeline.body.length).toBeGreaterThanOrEqual(2);
  });

  it("returns assignee leaderboard", async () => {
    await request(app).post("/seed?size=10&reset=true");
    const res = await request(app).get("/analytics/leaderboard");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("assignee");
    expect(res.body[0]).toHaveProperty("assigned");
    expect(res.body[0]).toHaveProperty("fixed");
    expect(res.body[0]).toHaveProperty("fixRate");
  });
});
