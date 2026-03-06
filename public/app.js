const els = {
  seedBtn: document.querySelector("#seedBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  summaryCards: document.querySelector("#summaryCards"),
  bugList: document.querySelector("#bugList"),
  leaderboard: document.querySelector("#leaderboard"),
  bugCount: document.querySelector("#bugCount"),
  search: document.querySelector("#search"),
  status: document.querySelector("#status"),
  severity: document.querySelector("#severity"),
  assignee: document.querySelector("#assignee"),
  sortBy: document.querySelector("#sortBy"),
  order: document.querySelector("#order"),
  template: document.querySelector("#bugItemTemplate"),
};

const state = {
  timer: null,
};

function debounce(fn, wait = 250) {
  return (...args) => {
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => fn(...args), wait);
  };
}

async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function createCard(label, value) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `<p class="card-label">${label}</p><p class="card-value">${value}</p>`;
  return div;
}

function renderSummary(summary) {
  els.summaryCards.innerHTML = "";
  els.summaryCards.append(
    createCard("Total Bugs", summary.totalBugs),
    createCard("Overdue", summary.overdueCount),
    createCard("Open", summary.byStatus.open),
    createCard("In Progress", summary.byStatus.in_progress),
    createCard("Avg Fix (hrs)", summary.averageHoursToFix ?? "-")
  );
}

function renderLeaderboard(rows) {
  els.leaderboard.innerHTML = "";
  if (!rows.length) {
    els.leaderboard.textContent = "No assignees yet.";
    return;
  }

  for (const row of rows.slice(0, 8)) {
    const div = document.createElement("div");
    div.className = "leader-row mono";
    div.innerHTML = `
      <strong>${row.assignee}</strong>
      <span>Assigned: ${row.assigned}</span>
      <span>Fixed: ${row.fixed}</span>
      <span>Fix Rate: ${row.fixRate}%</span>
    `;
    els.leaderboard.appendChild(div);
  }
}

function renderBugList(payload) {
  els.bugList.innerHTML = "";
  els.bugCount.textContent = `${payload.total} results`;

  if (!payload.items.length) {
    els.bugList.textContent = "No bugs match the current filters.";
    return;
  }

  for (const bug of payload.items) {
    const fragment = els.template.content.cloneNode(true);
    const item = fragment.querySelector(".bug-item");
    const title = fragment.querySelector(".bug-title");
    const desc = fragment.querySelector(".bug-desc");
    const meta = fragment.querySelector(".bug-meta");
    const badge = fragment.querySelector(".severity");
    const labels = fragment.querySelector(".labels");

    item.dataset.id = String(bug.id);
    title.textContent = bug.title;
    desc.textContent = bug.description;
    meta.textContent = `#${bug.id} • ${bug.status} • ${bug.assignee || "unassigned"} • updated ${new Date(
      bug.updatedAt
    ).toLocaleString()}`;
    badge.textContent = bug.severity;
    badge.classList.add(bug.severity);

    for (const label of bug.labels) {
      const chip = document.createElement("span");
      chip.className = "badge";
      chip.textContent = label;
      labels.appendChild(chip);
    }

    els.bugList.appendChild(fragment);
  }
}

function queryString() {
  const params = new URLSearchParams();
  const fields = ["search", "status", "severity", "assignee", "sortBy", "order"];
  for (const key of fields) {
    const value = els[key].value.trim();
    if (value) params.set(key, value);
  }
  params.set("limit", "50");
  return params.toString();
}

async function refreshAll() {
  try {
    const [summary, leaderboard, bugs] = await Promise.all([
      api("/analytics/summary"),
      api("/analytics/leaderboard"),
      api(`/bugs?${queryString()}`),
    ]);
    renderSummary(summary);
    renderLeaderboard(leaderboard);
    renderBugList(bugs);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function seedData() {
  els.seedBtn.disabled = true;
  try {
    await api("/seed?size=20&reset=true", { method: "POST" });
    await refreshAll();
  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    els.seedBtn.disabled = false;
  }
}

els.seedBtn.addEventListener("click", seedData);
els.refreshBtn.addEventListener("click", refreshAll);

const onFilter = debounce(refreshAll, 220);
for (const key of ["search", "status", "severity", "assignee", "sortBy", "order"]) {
  els[key].addEventListener("input", onFilter);
  els[key].addEventListener("change", onFilter);
}

refreshAll();
