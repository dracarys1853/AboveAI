const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "stories.json");
const sessions = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const RESOURCE_LIBRARY = [
  {
    id: "cloud-ai-transition",
    title: "Cloud and AI operations transition path",
    category: "Career pivot",
    roles: ["Help Desk", "IT Support", "Systems Administrator", "Network Engineer"],
    concerns: ["automation", "upskilling", "role-change"],
    description: "Move toward cloud operations, AI tooling support, FinOps, or platform engineering where human judgment still anchors production reliability.",
    actions: ["Map your current tickets to cloud services", "Build one AWS, Azure, or GCP project", "Document incident-response stories for interviews"]
  },
  {
    id: "secure-ai-governance",
    title: "AI governance and security track",
    category: "Upskilling",
    roles: ["Security Analyst", "Compliance Analyst", "Manager", "Software Engineer"],
    concerns: ["governance", "security", "policy"],
    description: "Specialize in model risk, data privacy, AI usage policies, prompt security, and vendor evaluation.",
    actions: ["Learn NIST AI Risk Management Framework basics", "Audit how AI tools touch company data", "Create a lightweight AI usage policy draft"]
  },
  {
    id: "developer-ai-copilot",
    title: "Developer plus AI workflow",
    category: "Upskilling",
    roles: ["Software Engineer", "QA Engineer", "Data Engineer", "DevOps Engineer"],
    concerns: ["automation", "productivity", "replacement"],
    description: "Turn AI from a threat into leverage by owning architecture, review quality, testing strategy, and production context.",
    actions: ["Practice AI-assisted refactoring with tests", "Create review checklists for generated code", "Build a portfolio app showing human-led AI workflows"]
  },
  {
    id: "leadership-change",
    title: "Team-level AI change strategy",
    category: "Leadership",
    roles: ["Manager", "Director", "Executive", "Product Manager"],
    concerns: ["layoffs", "reorg", "strategy"],
    description: "Create transparent transition plans that protect trust while introducing AI responsibly.",
    actions: ["Run a role-impact assessment", "Define reskilling budget and time", "Publish clear AI adoption guardrails"]
  },
  {
    id: "mental-health-support",
    title: "Stress and uncertainty support plan",
    category: "Wellbeing",
    roles: ["Any"],
    concerns: ["stress", "burnout", "fear"],
    description: "Use a practical support routine while making career decisions under pressure.",
    actions: ["Name the concrete risk, not just the fear", "Find one peer accountability partner", "Use employer EAP or local counseling resources if anxiety becomes hard to manage"]
  },
  {
    id: "worker-rights",
    title: "Workplace rights and documentation",
    category: "Legal / policy",
    roles: ["Any"],
    concerns: ["layoffs", "policy", "fairness"],
    description: "Track role changes, performance expectations, and AI-related decisions so workers can ask informed questions.",
    actions: ["Keep a private timeline of role changes", "Save policy announcements", "Ask HR how AI-driven role changes are evaluated"]
  }
];

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let shouldSeed = !fs.existsSync(DB_PATH);
  if (!shouldSeed) {
    try {
      const existing = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
      shouldSeed = !Array.isArray(existing.stories) || existing.stories.length === 0;
    } catch (error) {
      shouldSeed = true;
    }
  }

  if (shouldSeed) {
    const now = new Date().toISOString();
    const seedStories = [
      {
        id: crypto.randomUUID(),
        createdAt: now,
        name: "Maya Thompson",
        anonymous: false,
        role: "QA Engineer",
        seniority: "Mid-level",
        state: "Texas",
        industry: "Fintech",
        yearsExperience: 6,
        aiImpact: "Our team introduced AI-generated test cases. It helped speed up regression work, but two contractors were not renewed and everyone is nervous about what happens next.",
        supportNeeded: "I want to move into test strategy and automation architecture instead of only writing test cases.",
        tags: ["automation", "upskilling", "stress"],
        replies: [
          {
            id: crypto.randomUUID(),
            createdAt: now,
            author: "AboveAI Guide",
            body: "A strong next move is to own test quality gates, flaky-test strategy, and AI output review. Those are harder to automate away because they need product context."
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        createdAt: now,
        name: "Anonymous",
        anonymous: true,
        role: "IT Support Specialist",
        seniority: "Entry-level",
        state: "California",
        industry: "Healthcare IT",
        yearsExperience: 2,
        aiImpact: "A chatbot now handles basic password resets and ticket triage. I am glad users get faster answers, but I need a path beyond repetitive support tickets.",
        supportNeeded: "I need a practical roadmap into cloud support or security.",
        tags: ["role-change", "automation", "upskilling"],
        replies: []
      },
      {
        id: crypto.randomUUID(),
        createdAt: now,
        name: "David Kim",
        anonymous: false,
        role: "Engineering Manager",
        seniority: "Manager",
        state: "New York",
        industry: "SaaS",
        yearsExperience: 12,
        aiImpact: "Leadership is asking every team to cut delivery time with AI. People are afraid the productivity gains will become headcount reductions.",
        supportNeeded: "I want a humane way to introduce AI without breaking trust with my team.",
        tags: ["strategy", "layoffs", "governance"],
        replies: []
      }
    ];

    const seedUser = createUserRecord({
      name: "Maya Thompson",
      email: "maya@example.com",
      password: "aboveai-demo",
      role: "QA Engineer",
      state: "Texas",
      seniority: "Mid-level",
      industry: "Fintech"
    });
    const chatMessages = [
      {
        id: crypto.randomUUID(),
        createdAt: now,
        userId: seedUser.id,
        author: "Maya Thompson",
        role: "QA Engineer",
        state: "Texas",
        anonymous: false,
        body: "Has anyone moved from QA execution into AI-assisted test strategy? I am trying to make that transition before the next planning cycle."
      },
      {
        id: crypto.randomUUID(),
        createdAt: now,
        userId: null,
        author: "Anonymous IT worker",
        role: "IT Support Specialist",
        state: "California",
        anonymous: true,
        body: "The support chatbot is helping users, but I need a realistic cloud support roadmap that does not assume I already know everything."
      }
    ];

    fs.writeFileSync(DB_PATH, JSON.stringify({ stories: seedStories, users: [seedUser], chatMessages }, null, 2));
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  let changed = false;
  if (!Array.isArray(db.stories)) {
    db.stories = [];
    changed = true;
  }
  if (!Array.isArray(db.users)) {
    db.users = [];
    changed = true;
  }
  if (!Array.isArray(db.chatMessages)) {
    db.chatMessages = [];
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDatabase(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendCookie(res, name, value, options = {}) {
  const parts = [`${name}=${value}`, "Path=/", "SameSite=Lax", "HttpOnly"];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function sanitizeString(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return sanitizeString(value, 160).toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const saved = Buffer.from(hash, "hex");
  return saved.length === candidate.length && crypto.timingSafeEqual(saved, candidate);
}

function createUserRecord(body) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: sanitizeString(body.name, 80),
    email: normalizeEmail(body.email),
    passwordHash: hashPassword(body.password),
    role: sanitizeString(body.role, 80),
    state: sanitizeString(body.state, 40),
    seniority: sanitizeString(body.seniority, 40),
    industry: sanitizeString(body.industry, 80)
  };
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    state: user.state,
    seniority: user.seniority,
    industry: user.industry
  };
}

function getCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const index = cookie.indexOf("=");
      if (index !== -1) {
        acc[cookie.slice(0, index)] = decodeURIComponent(cookie.slice(index + 1));
      }
      return acc;
    }, {});
}

function getCurrentUser(req, db = readDatabase()) {
  const token = getCookies(req).aboveai_session;
  const session = token ? sessions.get(token) : null;
  if (!session) return null;
  return db.users.find(user => user.id === session.userId) || null;
}

function requireUser(req, res, db) {
  const user = getCurrentUser(req, db);
  if (!user) {
    sendJson(res, 401, { error: "Please sign in first." });
    return null;
  }
  return user;
}

function detectTags(text) {
  const lower = text.toLowerCase();
  const rules = [
    ["layoffs", ["layoff", "laid off", "headcount", "reduction", "downsizing", "cut"]],
    ["automation", ["automated", "automation", "bot", "chatbot", "copilot", "generated"]],
    ["replacement", ["replace", "replacing", "overtake", "take over", "obsolete"]],
    ["upskilling", ["learn", "certification", "upskill", "reskill", "roadmap", "training"]],
    ["stress", ["stress", "anxious", "fear", "nervous", "burnout", "mental"]],
    ["governance", ["policy", "governance", "compliance", "risk", "guardrail"]],
    ["security", ["security", "privacy", "data", "risk", "breach"]],
    ["role-change", ["role", "career", "transition", "pivot", "promotion"]]
  ];

  const tags = rules
    .filter(([, words]) => words.some(word => lower.includes(word)))
    .map(([tag]) => tag);

  return [...new Set(tags.length ? tags : ["workplace-change"])];
}

function summarizeStory(story) {
  const role = story.role || "IT worker";
  const location = story.state ? ` in ${story.state}` : "";
  const impact = story.aiImpact || "";
  const sentence = impact.split(/[.!?]/).find(Boolean) || impact;
  return `${role}${location} is dealing with ${sentence.trim().toLowerCase()}. They are looking for ${story.supportNeeded || "practical next steps"}.`;
}

function buildInsights(stories) {
  const total = stories.length;
  const states = countBy(stories, "state");
  const roles = countBy(stories, "role");
  const tags = stories.reduce((acc, story) => {
    story.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const commonConcerns = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  const clusters = commonConcerns.map(concern => {
    const matchingStories = stories.filter(story => story.tags.includes(concern.label));
    return {
      label: concern.label,
      count: matchingStories.length,
      summary: buildClusterSummary(concern.label, matchingStories),
      storyIds: matchingStories.map(story => story.id)
    };
  });

  return {
    totalStories: total,
    topStates: topEntries(states),
    topRoles: topEntries(roles),
    commonConcerns,
    clusters,
    generatedAt: new Date().toISOString()
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "Unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(record) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

function buildClusterSummary(label, stories) {
  const roles = [...new Set(stories.map(story => story.role).filter(Boolean))].slice(0, 3);
  const locations = [...new Set(stories.map(story => story.state).filter(Boolean))].slice(0, 3);
  const roleText = roles.length ? roles.join(", ") : "IT workers";
  const locationText = locations.length ? ` across ${locations.join(", ")}` : "";
  const concernText = label.replace("-", " ");
  return `${roleText}${locationText} are discussing ${concernText} and asking for concrete next steps.`;
}

function recommendResources(story) {
  const role = story.role || "Any";
  const tags = story.tags || [];
  const scored = RESOURCE_LIBRARY.map(resource => {
    let score = 0;
    if (resource.roles.includes("Any")) score += 1;
    if (resource.roles.some(resourceRole => role.toLowerCase().includes(resourceRole.toLowerCase()) || resourceRole.toLowerCase().includes(role.toLowerCase()))) score += 3;
    score += resource.concerns.filter(concern => tags.includes(concern)).length * 2;
    return { ...resource, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score, ...resource }) => resource);
}

function createSolutionThread(story) {
  const resources = recommendResources(story);
  const first = resources[0] || RESOURCE_LIBRARY[0];
  return {
    title: `Path forward for ${story.role || "IT workers"} in ${story.state || "the US"}`,
    summary: summarizeStory(story),
    steps: [
      `Clarify the highest-risk tasks in the current role: ${story.tags.slice(0, 2).join(" and ") || "routine work"}.`,
      `Choose one adjacent skill path: ${first.title}.`,
      "Create a 30-day proof project that shows judgment, communication, and AI-enabled productivity.",
      "Discuss the transition with a manager, mentor, peer group, or workforce advisor using concrete role outcomes."
    ],
    resources
  };
}

async function maybeGenerateAiDraft(story) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "You are AboveAI, a calm career support assistant for US IT workers facing AI disruption. Be practical, non-alarmist, and concise."
          },
          {
            role: "user",
            content: `Create a short supportive response and three practical next steps for this worker story:\n${JSON.stringify(story)}`
          }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.output_text || null;
  } catch (error) {
    return null;
  }
}

function createLocalAiDraft(story) {
  const resources = recommendResources(story);
  const pathName = resources[0]?.title || "a focused transition path";
  return `You are not behind; you are at a decision point. Based on your role as ${story.role || "an IT worker"}, start by separating tasks AI can accelerate from the judgment-heavy work people still trust you to own. A practical next move is ${pathName}. Build one small proof project, write down the outcomes, and use it to guide your next conversation with a manager, mentor, or peer.`;
}

function validateStory(body, user = null) {
  const anonymous = Boolean(body.anonymous);
  const story = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    userId: user?.id || null,
    name: sanitizeString(anonymous ? "Anonymous" : body.name || user?.name, 80) || "Anonymous",
    anonymous,
    role: sanitizeString(body.role || user?.role, 80),
    seniority: sanitizeString(body.seniority || user?.seniority, 40),
    state: sanitizeString(body.state || user?.state, 40),
    industry: sanitizeString(body.industry || user?.industry, 80),
    yearsExperience: Number(body.yearsExperience || 0),
    aiImpact: sanitizeString(body.aiImpact, 1800),
    supportNeeded: sanitizeString(body.supportNeeded, 600),
    tags: [],
    replies: []
  };

  const required = ["role", "seniority", "state", "industry", "aiImpact", "supportNeeded"];
  const missing = required.filter(key => !story[key]);
  if (missing.length) {
    return { error: `Missing required fields: ${missing.join(", ")}` };
  }

  story.yearsExperience = Number.isFinite(story.yearsExperience) ? Math.max(0, Math.min(50, story.yearsExperience)) : 0;
  story.tags = detectTags(`${story.aiImpact} ${story.supportNeeded} ${story.role} ${story.industry}`);
  return { story };
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/auth/me") {
    const db = readDatabase();
    sendJson(res, 200, { user: publicUser(getCurrentUser(req, db)) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/signup") {
    const body = await parseJsonBody(req);
    const db = readDatabase();
    const required = ["name", "email", "password", "role", "state", "seniority", "industry"];
    const missing = required.filter(key => !sanitizeString(body[key], 160));
    if (missing.length) {
      sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }
    if (String(body.password).length < 8) {
      sendJson(res, 400, { error: "Password must be at least 8 characters." });
      return;
    }
    const email = normalizeEmail(body.email);
    if (db.users.some(user => user.email === email)) {
      sendJson(res, 409, { error: "An account with this email already exists." });
      return;
    }

    const user = createUserRecord({ ...body, email });
    db.users.push(user);
    writeDatabase(db);

    const token = crypto.randomUUID();
    sessions.set(token, { userId: user.id, createdAt: Date.now() });
    sendCookie(res, "aboveai_session", encodeURIComponent(token), { maxAge: 60 * 60 * 24 * 7 });
    sendJson(res, 201, { user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await parseJsonBody(req);
    const db = readDatabase();
    const user = db.users.find(item => item.email === normalizeEmail(body.email));
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      sendJson(res, 401, { error: "Invalid email or password." });
      return;
    }

    const token = crypto.randomUUID();
    sessions.set(token, { userId: user.id, createdAt: Date.now() });
    sendCookie(res, "aboveai_session", encodeURIComponent(token), { maxAge: 60 * 60 * 24 * 7 });
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const token = getCookies(req).aboveai_session;
    if (token) sessions.delete(token);
    sendCookie(res, "aboveai_session", "", { maxAge: 0 });
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/stories") {
    const db = readDatabase();
    const stories = db.stories
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(story => ({
        ...story,
        summary: summarizeStory(story),
        recommendations: recommendResources(story),
        solutionThread: createSolutionThread(story)
      }));
    sendJson(res, 200, { stories, insights: buildInsights(stories), resources: RESOURCE_LIBRARY });
    return;
  }

  if (req.method === "POST" && pathname === "/api/stories") {
    const body = await parseJsonBody(req);
    const db = readDatabase();
    const user = requireUser(req, res, db);
    if (!user) return;

    const { story, error } = validateStory(body, user);
    if (error) {
      sendJson(res, 400, { error });
      return;
    }

    story.aiResponse = await maybeGenerateAiDraft(story) || createLocalAiDraft(story);
    story.solutionThread = createSolutionThread(story);

    db.stories.push(story);
    writeDatabase(db);
    sendJson(res, 201, {
      story: {
        ...story,
        summary: summarizeStory(story),
        recommendations: recommendResources(story)
      }
    });
    return;
  }

  if (req.method === "POST" && pathname.match(/^\/api\/stories\/[^/]+\/replies$/)) {
    const storyId = decodeURIComponent(pathname.split("/")[3]);
    const body = await parseJsonBody(req);
    const db = readDatabase();
    const user = requireUser(req, res, db);
    if (!user) return;
    const story = db.stories.find(item => item.id === storyId);
    if (!story) {
      sendJson(res, 404, { error: "Story not found" });
      return;
    }

    const reply = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      userId: user.id,
      anonymous: Boolean(body.anonymous),
      author: Boolean(body.anonymous) ? "Anonymous IT worker" : user.name,
      body: sanitizeString(body.body, 700)
    };

    if (!reply.body) {
      sendJson(res, 400, { error: "Reply cannot be empty" });
      return;
    }

    story.replies.unshift(reply);
    writeDatabase(db);
    sendJson(res, 201, { reply });
    return;
  }

  if (req.method === "GET" && pathname === "/api/chat") {
    const db = readDatabase();
    const messages = db.chatMessages
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-80);
    sendJson(res, 200, { messages });
    return;
  }

  if (req.method === "POST" && pathname === "/api/chat") {
    const body = await parseJsonBody(req);
    const db = readDatabase();
    const user = requireUser(req, res, db);
    if (!user) return;

    const anonymous = Boolean(body.anonymous);
    const message = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      userId: user.id,
      author: anonymous ? "Anonymous IT worker" : user.name,
      role: user.role,
      state: user.state,
      anonymous,
      body: sanitizeString(body.body, 900)
    };

    if (!message.body) {
      sendJson(res, 400, { error: "Message cannot be empty." });
      return;
    }

    db.chatMessages.push(message);
    writeDatabase(db);
    sendJson(res, 201, { message });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: "Unexpected server error" });
  }
});

ensureDatabase();
server.listen(PORT, () => {
  console.log(`AboveAI is running at http://localhost:${PORT}`);
});
