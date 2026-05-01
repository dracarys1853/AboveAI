const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "Washington DC"
];

const appState = {
  stories: [],
  insights: null,
  resources: [],
  messages: [],
  user: null,
  activeFilter: "all",
  activeResourceCategory: "All",
  search: ""
};

const els = {
  form: document.querySelector("#storyForm"),
  signupForm: document.querySelector("#signupForm"),
  loginForm: document.querySelector("#loginForm"),
  authStatus: document.querySelector("#authStatus"),
  logoutButton: document.querySelector("#logoutButton"),
  accountName: document.querySelector("#accountName"),
  accountMeta: document.querySelector("#accountMeta"),
  accountCard: document.querySelector("#accountCard"),
  formStatus: document.querySelector("#formStatus"),
  stateSelects: document.querySelectorAll("select[name='state'], [data-state-select]"),
  storyFeed: document.querySelector("#storyFeed"),
  storyCount: document.querySelector("#storyCount"),
  chatForm: document.querySelector("#chatForm"),
  chatMessages: document.querySelector("#chatMessages"),
  chatStatus: document.querySelector("#chatStatus"),
  pulseCards: document.querySelector("#pulseCards"),
  pulseClusters: document.querySelector("#pulseClusters"),
  trendClusters: document.querySelector("#trendClusters"),
  trendBars: document.querySelector("#trendBars"),
  filterSelect: document.querySelector("#filterSelect"),
  searchInput: document.querySelector("#searchInput"),
  resourceList: document.querySelector("#resourceList"),
  rolePlanner: document.querySelector("#rolePlanner"),
  concernPlanner: document.querySelector("#concernPlanner"),
  planOutput: document.querySelector("#planOutput"),
  storyTemplate: document.querySelector("#storyTemplate")
};

function init() {
  populateStates();
  bindEvents();
  openScreen(location.hash.replace("#", "") || "pulse");
  loadSession();
  loadData();
  loadChat();
}

function populateStates() {
  els.stateSelects.forEach(select => {
    US_STATES.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    });
  });
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach(item => {
    item.addEventListener("click", event => {
      event.preventDefault();
      const screen = event.currentTarget.dataset.nav;
      if (screen) {
        openScreen(screen);
      }
    });
  });

  window.addEventListener("hashchange", () => {
    openScreen(location.hash.replace("#", "") || "pulse", false);
  });

  els.form.addEventListener("submit", submitStory);
  els.signupForm.addEventListener("submit", submitSignup);
  els.loginForm.addEventListener("submit", submitLogin);
  els.logoutButton.addEventListener("click", logout);
  els.chatForm.addEventListener("submit", submitChat);

  document.querySelectorAll("[data-auth-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.authTab;
      els.signupForm.hidden = mode !== "signup";
      els.loginForm.hidden = mode !== "login";
      els.authStatus.textContent = "";
    });
  });
  els.filterSelect.addEventListener("change", event => {
    appState.activeFilter = event.target.value;
    renderStories();
  });
  els.searchInput.addEventListener("input", event => {
    appState.search = event.target.value.toLowerCase();
    renderStories();
  });

  document.querySelectorAll(".solution-tabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".solution-tabs .tab").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      appState.activeResourceCategory = tab.dataset.category;
      renderResources();
    });
  });

  [els.rolePlanner, els.concernPlanner].forEach(select => {
    select.addEventListener("change", renderPlan);
  });
}

function openScreen(screen, updateHash = true) {
  const target = document.querySelector(`[data-screen="${screen}"]`);
  if (!target) return;

  document.querySelectorAll(".screen").forEach(item => item.classList.remove("active"));
  target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(item => {
    item.classList.toggle("active", item.dataset.nav === screen);
  });

  if (updateHash && location.hash !== `#${screen}`) {
    history.pushState(null, "", `#${screen}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadData() {
  const response = await fetch("/api/stories");
  const data = await response.json();
  appState.stories = data.stories;
  appState.insights = data.insights;
  appState.resources = data.resources;
  renderAll();
}

async function loadSession() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();
  appState.user = data.user;
  renderAccount();
}

async function submitSignup(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(els.signupForm).entries());
  els.authStatus.textContent = "Creating your account...";

  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    els.authStatus.textContent = data.error || "Could not create account.";
    return;
  }

  appState.user = data.user;
  els.signupForm.reset();
  els.authStatus.textContent = "You are signed in. Welcome to AboveAI.";
  renderAccount();
  prefillStoryProfile();
  openScreen("share");
}

async function submitLogin(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(els.loginForm).entries());
  els.authStatus.textContent = "Signing you in...";

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    els.authStatus.textContent = data.error || "Could not log in.";
    return;
  }

  appState.user = data.user;
  els.loginForm.reset();
  els.authStatus.textContent = "You are signed in.";
  renderAccount();
  prefillStoryProfile();
  openScreen("community");
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  appState.user = null;
  renderAccount();
  openScreen("auth");
}

function renderAccount() {
  const user = appState.user;
  els.accountName.textContent = user ? user.name : "Guest";
  els.accountMeta.textContent = user ? `${user.role} - ${user.state}` : "Sign in to share and chat";
  els.accountCard.querySelector(".account-avatar").textContent = user ? user.name.slice(0, 1).toUpperCase() : "?";
  els.logoutButton.hidden = !user;
  const authNav = document.querySelector('.nav-link[data-nav="auth"]');
  if (authNav) {
    authNav.textContent = user ? "Account" : "Sign in";
  }
  document.body.classList.toggle("signed-in", Boolean(user));
  prefillStoryProfile();
}

function prefillStoryProfile() {
  if (!appState.user) return;
  const user = appState.user;
  els.form.elements.name.value = user.name || "";
  els.form.elements.role.value = user.role || "";
  els.form.elements.seniority.value = user.seniority || "";
  els.form.elements.state.value = user.state || "";
  els.form.elements.industry.value = user.industry || "";
}

async function submitStory(event) {
  event.preventDefault();
  if (!appState.user) {
    els.formStatus.textContent = "Please sign in before sharing a story.";
    openScreen("auth");
    return;
  }
  const formData = new FormData(els.form);
  const payload = {
    anonymous: formData.get("anonymous") === "on",
    name: formData.get("name"),
    role: formData.get("role"),
    seniority: formData.get("seniority"),
    state: formData.get("state"),
    industry: formData.get("industry"),
    yearsExperience: formData.get("yearsExperience"),
    aiImpact: formData.get("aiImpact"),
    supportNeeded: formData.get("supportNeeded")
  };

  els.formStatus.textContent = "Creating your AboveAI guidance...";

  const response = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    els.formStatus.textContent = data.error || "Something went wrong.";
    return;
  }

  els.form.reset();
  els.formStatus.textContent = "Your story is live, and a solution thread was created.";
  prefillStoryProfile();
  await loadData();
  openScreen("community");
}

async function loadChat() {
  const response = await fetch("/api/chat");
  const data = await response.json();
  appState.messages = data.messages || [];
  renderChat();
}

async function submitChat(event) {
  event.preventDefault();
  if (!appState.user) {
    els.chatStatus.textContent = "Please sign in before joining the chat.";
    openScreen("auth");
    return;
  }

  const formData = new FormData(els.chatForm);
  const payload = {
    anonymous: formData.get("anonymous") === "on",
    body: formData.get("body")
  };

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    els.chatStatus.textContent = data.error || "Could not send message.";
    return;
  }

  els.chatForm.reset();
  els.chatStatus.textContent = "";
  await loadChat();
}

function renderAll() {
  renderFilters();
  renderStories();
  renderPulse();
  renderTrends();
  renderResources();
  renderPlan();
}

function renderFilters() {
  const current = appState.activeFilter;
  const tags = [...new Set(appState.stories.flatMap(story => story.tags))].sort();
  els.filterSelect.replaceChildren();

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "All concerns";
  els.filterSelect.append(all);

  tags.forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = toTitle(tag);
    els.filterSelect.append(option);
  });

  els.filterSelect.value = tags.includes(current) ? current : "all";
}

function renderStories() {
  const filtered = appState.stories.filter(story => {
    const matchesConcern = appState.activeFilter === "all" || story.tags.includes(appState.activeFilter);
    const haystack = [
      story.name,
      story.role,
      story.state,
      story.industry,
      story.aiImpact,
      story.supportNeeded,
      story.tags.join(" ")
    ].join(" ").toLowerCase();
    const matchesSearch = !appState.search || haystack.includes(appState.search);
    return matchesConcern && matchesSearch;
  });

  els.storyCount.textContent = appState.stories.length;
  els.storyFeed.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "No stories match this view yet.";
    els.storyFeed.append(empty);
    return;
  }

  filtered.forEach(story => {
    const node = els.storyTemplate.content.cloneNode(true);
    const card = node.querySelector(".story-card");
    card.querySelector("h3").textContent = story.anonymous ? "Anonymous IT worker" : story.name;
    card.querySelector(".meta").textContent = `${story.role} - ${story.industry} - ${story.state} - ${story.yearsExperience || 0} yrs`;
    card.querySelector(".seniority-chip").textContent = story.seniority;
    card.querySelector(".impact").textContent = story.aiImpact;
    card.querySelector(".ai-box p").textContent = story.aiResponse || story.summary;

    const tagList = card.querySelector(".tag-list");
    story.tags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = toTitle(tag);
      tagList.append(chip);
    });

    const steps = card.querySelector(".steps");
    const solutionSteps = story.solutionThread?.steps || [];
    solutionSteps.forEach(step => {
      const li = document.createElement("li");
      li.textContent = step;
      steps.append(li);
    });

    const replies = card.querySelector(".replies");
    renderReplies(replies, story.replies);

    const replyForm = card.querySelector(".reply-form");
    replyForm.addEventListener("submit", event => submitReply(event, story.id));
    els.storyFeed.append(node);
  });
}

function renderReplies(container, replies = []) {
  container.replaceChildren();
  replies.slice(0, 3).forEach(reply => {
    const item = document.createElement("p");
    item.className = "reply";
    item.innerHTML = `<strong>${escapeHtml(reply.author)}:</strong> ${escapeHtml(reply.body)}`;
    container.append(item);
  });
}

async function submitReply(event, storyId) {
  event.preventDefault();
  if (!appState.user) {
    openScreen("auth");
    return;
  }
  const form = event.target;
  const payload = {
    anonymous: form.elements.anonymous.checked,
    body: form.elements.body.value
  };

  const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    form.reset();
    await loadData();
  }
}

function renderChat() {
  els.chatMessages.replaceChildren();
  if (!appState.messages.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "No chat messages yet. Start the room with a useful question.";
    els.chatMessages.append(empty);
    return;
  }

  appState.messages.forEach(message => {
    const item = document.createElement("article");
    item.className = "chat-message";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(message.author)}</strong>
        <span>${escapeHtml(message.anonymous ? "Anonymous" : `${message.role || "IT worker"} - ${message.state || "US"}`)}</span>
      </div>
      <p>${escapeHtml(message.body)}</p>
    `;
    els.chatMessages.append(item);
  });
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function renderPulse() {
  const insights = appState.insights;
  if (!insights) return;

  const cards = [
    { value: insights.totalStories, label: "Stories collected" },
    { value: insights.commonConcerns[0]?.label ? toTitle(insights.commonConcerns[0].label) : "Learning", label: "Top concern" },
    { value: insights.topStates[0]?.label || "US", label: "Most active state" },
    { value: insights.topRoles[0]?.label || "IT workers", label: "Most active role" }
  ];

  els.pulseCards.replaceChildren(...cards.map(createMetricCard));
  renderClusterList(els.pulseClusters, insights.clusters.slice(0, 3));
}

function renderTrends() {
  const insights = appState.insights;
  if (!insights) return;

  renderClusterList(els.trendClusters, insights.clusters);

  els.trendBars.replaceChildren(
    createBarGroup("States", insights.topStates),
    createBarGroup("Roles", insights.topRoles),
    createBarGroup("Concerns", insights.commonConcerns)
  );
}

function createMetricCard(card) {
  const item = document.createElement("article");
  item.className = "metric-card";
  item.innerHTML = `<strong>${escapeHtml(String(card.value))}</strong><span>${escapeHtml(card.label)}</span>`;
  return item;
}

function renderClusterList(container, clusters) {
  container.replaceChildren();
  clusters.forEach(cluster => {
    const item = document.createElement("article");
    item.className = "cluster-item";
    item.innerHTML = `<strong>${escapeHtml(toTitle(cluster.label))} (${cluster.count})</strong><p>${escapeHtml(cluster.summary)}</p>`;
    container.append(item);
  });
}

function createBarGroup(title, rows = []) {
  const group = document.createElement("div");
  group.className = "trend-group";
  const max = Math.max(...rows.map(row => row.count), 1);
  const body = rows.map(row => {
    const width = Math.max(10, Math.round((row.count / max) * 100));
    return `
      <div class="bar-row">
        <span>${escapeHtml(toTitle(row.label))}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span>
        <strong>${row.count}</strong>
      </div>
    `;
  }).join("");
  group.innerHTML = `<h3>${escapeHtml(title)}</h3>${body}`;
  return group;
}

function renderResources() {
  const resources = appState.activeResourceCategory === "All"
    ? appState.resources
    : appState.resources.filter(resource => resource.category === appState.activeResourceCategory);

  els.resourceList.replaceChildren();
  resources.forEach(resource => {
    const item = document.createElement("article");
    item.className = "resource-card";
    const actions = resource.actions.map(action => `<li>${escapeHtml(action)}</li>`).join("");
    item.innerHTML = `
      <span class="category">${escapeHtml(resource.category)}</span>
      <h3>${escapeHtml(resource.title)}</h3>
      <p>${escapeHtml(resource.description)}</p>
      <ul>${actions}</ul>
    `;
    els.resourceList.append(item);
  });
}

function renderPlan() {
  const role = els.rolePlanner.value;
  const concern = els.concernPlanner.value;
  const matching = appState.resources
    .map(resource => ({
      resource,
      score: scoreResource(resource, role, concern)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => item.resource);

  const recommended = matching[0];
  const steps = [
    {
      title: "Week 1: Map the risk",
      body: `List the ${toTitle(concern)} tasks affecting your ${role} work, then mark which ones need human judgment, security context, customer trust, or production ownership.`
    },
    {
      title: "Week 2: Pick a stronger lane",
      body: recommended ? `Start with ${recommended.title}. Use one small project to prove you can combine AI tools with accountable human decisions.` : "Choose one adjacent skill path and make it visible through a small proof project."
    },
    {
      title: "Week 3: Build evidence",
      body: "Create a portfolio note, internal demo, or manager-ready memo showing the business outcome of your new workflow."
    },
    {
      title: "Week 4: Ask for the transition",
      body: "Use the evidence to request a project, mentor, certification support, internal move, or clearer role expectations."
    }
  ];

  els.planOutput.replaceChildren(...steps.map(step => {
    const item = document.createElement("article");
    item.className = "plan-step";
    item.innerHTML = `<strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.body)}</p>`;
    return item;
  }));
}

function scoreResource(resource, role, concern) {
  let score = 0;
  if (resource.roles.includes("Any")) score += 1;
  if (resource.roles.some(resourceRole => role.toLowerCase().includes(resourceRole.toLowerCase()) || resourceRole.toLowerCase().includes(role.toLowerCase()))) {
    score += 3;
  }
  if (resource.concerns.includes(concern)) score += 3;
  return score;
}

function toTitle(value) {
  return String(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
