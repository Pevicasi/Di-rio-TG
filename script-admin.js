(() => {
  "use strict";

  const DRAFT_KEY = "tirzetrack-admin-draft-v2";
  const GITHUB_CONFIG_KEY = "tirzetrack-github-config-v1";
  const $ = id => document.getElementById(id);
  let appData = null;
  let dirty = false;

  const emptyData = () => ({
    schemaVersion: 1,
    title: "Acompanhamento com Tirzepatida",
    updatedAt: formatBRDate(new Date()),
    profile: { name: "", age: "", heightM: "" },
    goal: {
      initialWeightKg: "", currentWeightKg: "", targetWeightKg: "",
      history: [], stageStartWeightKg: "", stageStartDate: ""
    },
    treatment: { medication: "", concentration: "", weeklyDose: "", startDate: "" },
    weights: [], applications: [], weeks: [], diary: [],
    generalObservation: "",
    medicalNotice: "Este site organiza os registros informados e não substitui acompanhamento médico."
  });

  function normalizeData(raw) {
    const base = emptyData();
    const data = raw && typeof raw === "object" ? raw : {};
    return {
      ...base,
      ...data,
      profile: { ...base.profile, ...(data.profile || {}) },
      goal: { ...base.goal, ...(data.goal || {}), history: Array.isArray(data?.goal?.history) ? data.goal.history : [] },
      treatment: { ...base.treatment, ...(data.treatment || {}) },
      weights: Array.isArray(data.weights) ? data.weights : [],
      applications: Array.isArray(data.applications) ? data.applications : [],
      weeks: Array.isArray(data.weeks) ? data.weeks : [],
      diary: Array.isArray(data.diary) ? data.diary : []
    };
  }

  function parseBRDate(value) {
    if (!value) return "";
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  }

  function formatBRDate(value) {
    if (!value) return "";
    if (value instanceof Date) {
      const d = String(value.getDate()).padStart(2, "0");
      const m = String(value.getMonth() + 1).padStart(2, "0");
      return `${d}/${m}/${value.getFullYear()}`;
    }
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
  }

  function numeric(value) {
    if (value === "" || value === null || value === undefined) return "";
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  function encodeBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function setValue(id, value) { const el = $(id); if (el) el.value = value ?? ""; }
  function getValue(id) { return $(id)?.value?.trim() ?? ""; }

  function showToast(message, type = "success") {
    const toast = $("toast");
    toast.textContent = message;
    toast.className = `toast visible ${type}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = "toast"; }, 3500);
  }

  function setStatus(message, state = "") {
    const el = $("saveStatus");
    el.textContent = message;
    el.dataset.state = state;
  }

  function markDirty() {
    dirty = true;
    setStatus("Alterações não salvas", "dirty");
  }

  async function loadInitialData() {
    loadGithubConfig();
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        appData = normalizeData(JSON.parse(draft));
        fillEditor();
        setStatus("Rascunho carregado", "draft");
        return;
      } catch (_) {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    await loadPublishedData(false);
  }

  async function loadPublishedData(confirmReload = true) {
    if (confirmReload && dirty && !confirm("Descartar as alterações atuais e recarregar os dados publicados?")) return;
    try {
      setStatus("Carregando dados publicados...");
      const response = await fetch(`../dados.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Falha ao carregar dados.json (${response.status}).`);
      appData = normalizeData(await response.json());
      localStorage.removeItem(DRAFT_KEY);
      dirty = false;
      fillEditor();
      setStatus("Dados publicados carregados", "saved");
      if (confirmReload) showToast("Dados publicados recarregados.");
    } catch (error) {
      appData = emptyData();
      fillEditor();
      setStatus("Novo cadastro", "draft");
      showToast(error.message || "Não foi possível carregar dados.json.", "error");
    }
  }

  function fillEditor() {
    setValue("fieldTitle", appData.title);
    setValue("fieldUpdatedAt", parseBRDate(appData.updatedAt));
    setValue("fieldSchemaVersion", appData.schemaVersion);
    setValue("fieldName", appData.profile.name);
    setValue("fieldAge", appData.profile.age);
    setValue("fieldHeight", appData.profile.heightM);
    setValue("fieldInitialWeight", appData.goal.initialWeightKg);
    setValue("fieldCurrentWeight", appData.goal.currentWeightKg);
    setValue("fieldTargetWeight", appData.goal.targetWeightKg);
    setValue("fieldStageStartWeight", appData.goal.stageStartWeightKg);
    setValue("fieldStageStartDate", parseBRDate(appData.goal.stageStartDate));
    setValue("fieldMedication", appData.treatment.medication);
    setValue("fieldConcentration", appData.treatment.concentration);
    setValue("fieldWeeklyDose", appData.treatment.weeklyDose);
    setValue("fieldTreatmentStart", parseBRDate(appData.treatment.startDate));
    setValue("fieldGeneralObservation", appData.generalObservation);
    setValue("fieldMedicalNotice", appData.medicalNotice);
    renderLists();
  }

  function renderLists() {
    renderGoalHistory();
    renderWeights();
    renderApplications();
    renderWeeks();
    renderDiary();
  }

  function itemHeader(title, index, type) {
    return `<div class="editable-item-header"><strong>${escapeHtml(title)}</strong><button class="delete-button" type="button" data-delete="${type}" data-index="${index}">Excluir</button></div>`;
  }

  function renderGoalHistory() {
    $("goalHistoryList").innerHTML = appData.goal.history.length ? appData.goal.history.map((item, index) => `
      <article class="editable-item" data-type="goalHistory" data-index="${index}">
        ${itemHeader(`Meta anterior ${index + 1}`, index, "goalHistory")}
        <div class="admin-grid four-columns">
          <label>Meta (kg)<input data-field="targetWeightKg" type="number" step="0.01" value="${escapeHtml(item.targetWeightKg)}"></label>
          <label>Peso inicial da etapa (kg)<input data-field="startWeightKg" type="number" step="0.01" value="${escapeHtml(item.startWeightKg ?? item.stageStartWeightKg ?? "")}"></label>
          <label>Data de início<input data-field="startDate" data-date="true" type="date" value="${escapeHtml(parseBRDate(item.startDate ?? item.stageStartDate))}"></label>
          <label>Data de conclusão<input data-field="completedAt" data-date="true" type="date" value="${escapeHtml(parseBRDate(item.completedAt))}"></label>
        </div>
      </article>`).join("") : '<p class="empty-list">Nenhuma meta anterior cadastrada.</p>';
  }

  function renderWeights() {
    $("weightsList").innerHTML = appData.weights.length ? appData.weights.map((item, index) => `
      <article class="editable-item compact-item" data-type="weights" data-index="${index}">
        ${itemHeader(`Pesagem ${index + 1}`, index, "weights")}
        <div class="admin-grid two-columns">
          <label>Data<input data-field="date" data-date="true" type="date" value="${escapeHtml(parseBRDate(item.date))}"></label>
          <label>Peso (kg)<input data-field="valueKg" type="number" step="0.01" inputmode="decimal" value="${escapeHtml(item.valueKg)}"></label>
        </div>
      </article>`).join("") : '<p class="empty-list">Nenhuma pesagem cadastrada.</p>';
  }

  function renderApplications() {
    $("applicationsList").innerHTML = appData.applications.length ? appData.applications.map((item, index) => `
      <article class="editable-item" data-type="applications" data-index="${index}">
        ${itemHeader(`Aplicação ${item.number || index + 1}`, index, "applications")}
        <div class="admin-grid four-columns">
          <label>Número<input data-field="number" type="number" min="1" step="1" value="${escapeHtml(item.number)}"></label>
          <label>Data<input data-field="date" data-date="true" type="date" value="${escapeHtml(parseBRDate(item.date))}"></label>
          <label>Horário<input data-field="time" type="time" value="${escapeHtml(item.time)}"></label>
          <label>Dose<input data-field="dose" type="text" value="${escapeHtml(item.dose)}"></label>
          <label class="wide-field">Local da aplicação<input data-field="location" type="text" value="${escapeHtml(item.location)}"></label>
        </div>
      </article>`).join("") : '<p class="empty-list">Nenhuma aplicação cadastrada.</p>';
  }

  function renderWeeks() {
    $("weeksList").innerHTML = appData.weeks.length ? appData.weeks.map((item, index) => `
      <article class="editable-item" data-type="weeks" data-index="${index}">
        ${itemHeader(item.title || `Semana ${index + 1}`, index, "weeks")}
        <div class="admin-grid three-columns">
          <label>Título<input data-field="title" type="text" value="${escapeHtml(item.title)}"></label>
          <label>Período<input data-field="period" type="text" value="${escapeHtml(item.period)}"></label>
          <label class="checkbox-label"><input data-field="current" type="checkbox" ${item.current ? "checked" : ""}> Semana atual</label>
          <label class="wide-field">Linhas do resumo<textarea data-field="lines" data-lines="true" rows="6">${escapeHtml((item.lines || []).join("\n"))}</textarea></label>
        </div>
      </article>`).join("") : '<p class="empty-list">Nenhum resumo semanal cadastrado.</p>';
  }

  function renderDiary() {
    $("diaryEditorList").innerHTML = appData.diary.length ? appData.diary.map((item, index) => `
      <article class="editable-item" data-type="diary" data-index="${index}">
        ${itemHeader(item.date || `Registro ${index + 1}`, index, "diary")}
        <div class="admin-grid two-columns">
          <label>Data<input data-field="date" data-date="true" type="date" value="${escapeHtml(parseBRDate(item.date))}"></label>
          <label>Refeições<textarea data-field="meals" rows="4">${escapeHtml(item.meals)}</textarea></label>
          <label>Fome<textarea data-field="hunger" rows="4">${escapeHtml(item.hunger)}</textarea></label>
          <label>Efeitos<textarea data-field="effects" rows="4">${escapeHtml(item.effects)}</textarea></label>
          <label class="wide-field">Observações<textarea data-field="notes" rows="4">${escapeHtml(item.notes)}</textarea></label>
        </div>
      </article>`).join("") : '<p class="empty-list">Nenhum registro diário cadastrado.</p>';
  }

  function collectDataFromDOM() {
    appData.title = getValue("fieldTitle");
    appData.updatedAt = formatBRDate(getValue("fieldUpdatedAt"));
    appData.schemaVersion = numeric(getValue("fieldSchemaVersion")) || 1;
    appData.profile = {
      name: getValue("fieldName"), age: numeric(getValue("fieldAge")), heightM: numeric(getValue("fieldHeight"))
    };
    appData.goal = {
      ...appData.goal,
      initialWeightKg: numeric(getValue("fieldInitialWeight")),
      currentWeightKg: numeric(getValue("fieldCurrentWeight")),
      targetWeightKg: numeric(getValue("fieldTargetWeight")),
      stageStartWeightKg: numeric(getValue("fieldStageStartWeight")),
      stageStartDate: formatBRDate(getValue("fieldStageStartDate")),
      history: collectList("goalHistory")
    };
    appData.treatment = {
      medication: getValue("fieldMedication"), concentration: getValue("fieldConcentration"),
      weeklyDose: getValue("fieldWeeklyDose"), startDate: formatBRDate(getValue("fieldTreatmentStart"))
    };
    appData.weights = collectList("weights");
    appData.applications = collectList("applications");
    appData.weeks = collectList("weeks");
    appData.diary = collectList("diary");
    appData.generalObservation = getValue("fieldGeneralObservation");
    appData.medicalNotice = getValue("fieldMedicalNotice");
    return appData;
  }

  function collectList(type) {
    return [...document.querySelectorAll(`.editable-item[data-type="${type}"]`)].map(item => {
      const obj = {};
      item.querySelectorAll("[data-field]").forEach(input => {
        const key = input.dataset.field;
        if (input.type === "checkbox") obj[key] = input.checked;
        else if (input.dataset.lines) obj[key] = input.value.split("\n").map(line => line.trim()).filter(Boolean);
        else if (input.dataset.date) obj[key] = formatBRDate(input.value);
        else if (input.type === "number") obj[key] = numeric(input.value);
        else obj[key] = input.value.trim();
      });
      return obj;
    });
  }

  function addItem(type) {
    collectDataFromDOM();
    if (type === "goalHistory") appData.goal.history.push({ targetWeightKg: "", startWeightKg: "", startDate: "", completedAt: "" });
    if (type === "weights") appData.weights.push({ date: formatBRDate(new Date()), valueKg: "" });
    if (type === "applications") appData.applications.push({ number: appData.applications.length + 1, date: formatBRDate(new Date()), time: "", dose: appData.treatment.weeklyDose || "", location: "" });
    if (type === "weeks") appData.weeks.push({ title: `Semana ${appData.weeks.length + 1}`, period: "", current: false, lines: [] });
    if (type === "diary") appData.diary.push({ date: formatBRDate(new Date()), meals: "", hunger: "", effects: "", notes: "" });
    renderLists();
    markDirty();
    const selector = type === "goalHistory" ? "#goalHistoryList .editable-item:last-child" : `[data-type="${type}"]:last-child`;
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteItem(type, index) {
    if (!confirm("Tem certeza de que deseja excluir este registro?")) return;
    collectDataFromDOM();
    const list = type === "goalHistory" ? appData.goal.history : appData[type];
    if (!Array.isArray(list)) return;
    list.splice(index, 1);
    if (type === "applications") list.forEach((item, i) => { if (!item.number) item.number = i + 1; });
    renderLists();
    markDirty();
  }

  function sortByDate(list) {
    const time = date => {
      const iso = parseBRDate(date);
      return iso ? new Date(`${iso}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
    };
    return list.sort((a, b) => time(a.date) - time(b.date));
  }

  function recalculateWeights() {
    collectDataFromDOM();
    sortByDate(appData.weights);
    const valid = appData.weights.filter(item => Number.isFinite(Number(item.valueKg)));
    if (!valid.length) return showToast("Cadastre ao menos uma pesagem válida.", "error");
    appData.goal.initialWeightKg = Number(valid[0].valueKg);
    appData.goal.currentWeightKg = Number(valid[valid.length - 1].valueKg);
    if (!appData.goal.stageStartWeightKg) appData.goal.stageStartWeightKg = Number(valid[0].valueKg);
    if (!appData.goal.stageStartDate) appData.goal.stageStartDate = valid[0].date;
    fillEditor();
    markDirty();
    showToast("Peso inicial e peso atual recalculados.");
  }

  function validateData(data) {
    const errors = [];
    if (!data.title) errors.push("Informe o título do site.");
    if (!data.updatedAt) errors.push("Informe a data de atualização.");
    if (!data.profile.name) errors.push("Informe o nome do perfil.");
    ["initialWeightKg", "currentWeightKg", "targetWeightKg"].forEach(key => {
      if (!Number.isFinite(Number(data.goal[key]))) errors.push(`Informe um valor válido para ${key}.`);
    });
    data.weights.forEach((item, i) => {
      if (!item.date || !Number.isFinite(Number(item.valueKg))) errors.push(`Pesagem ${i + 1} está incompleta.`);
    });
    data.applications.forEach((item, i) => {
      if (!item.date || !item.dose) errors.push(`Aplicação ${i + 1} está incompleta.`);
    });
    data.diary.forEach((item, i) => { if (!item.date) errors.push(`Registro diário ${i + 1} está sem data.`); });
    return errors;
  }

  function prepareData() {
    collectDataFromDOM();
    sortByDate(appData.weights);
    sortByDate(appData.applications);
    sortByDate(appData.diary);
    appData.applications.forEach((item, index) => { item.number = numeric(item.number) || index + 1; });
    const errors = validateData(appData);
    if (errors.length) throw new Error(errors.slice(0, 5).join("\n"));
    return appData;
  }

  function saveDraft() {
    try {
      collectDataFromDOM();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(appData));
      dirty = false;
      setStatus("Rascunho salvo neste navegador", "saved");
      showToast("Rascunho salvo.");
    } catch (error) { showToast(error.message, "error"); }
  }

  function downloadBackup() {
    try {
      const data = prepareData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-tirzetrack-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Backup gerado.");
    } catch (error) { showToast(error.message, "error"); }
  }

  async function importJson(file) {
    try {
      const text = await file.text();
      appData = normalizeData(JSON.parse(text));
      fillEditor();
      markDirty();
      showToast("JSON importado. Revise e publique quando estiver pronto.");
    } catch (_) { showToast("O arquivo JSON é inválido.", "error"); }
  }

  function loadGithubConfig() {
    try {
      const config = JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY) || "{}");
      setValue("githubOwner", config.owner);
      setValue("githubRepo", config.repo);
      setValue("githubBranch", config.branch || "main");
      setValue("githubPath", config.path || "dados.json");
      setValue("githubToken", config.token);
    } catch (_) { /* configuração vazia */ }
  }

  function getGithubConfig() {
    return {
      owner: getValue("githubOwner"), repo: getValue("githubRepo"),
      branch: getValue("githubBranch") || "main", path: getValue("githubPath") || "dados.json",
      token: getValue("githubToken")
    };
  }

  function saveGithubConfig() {
    const config = getGithubConfig();
    if (!config.owner || !config.repo || !config.token) return showToast("Preencha usuário, repositório e token.", "error");
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
    showToast("Configuração do GitHub salva.");
  }

  async function publishToGithub() {
    const button = $("publishButton");
    try {
      const data = prepareData();
      const config = getGithubConfig();
      if (!config.owner || !config.repo || !config.branch || !config.path || !config.token) {
        document.querySelector("#github")?.scrollIntoView({ behavior: "smooth" });
        throw new Error("Configure usuário, repositório, branch, arquivo e token do GitHub.");
      }
      button.disabled = true;
      button.textContent = "Publicando...";
      setStatus("Publicando no GitHub...");

      const encodedPath = config.path.split("/").map(encodeURIComponent).join("/");
      const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
      const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      };

      let sha;
      const current = await fetch(`${endpoint}?ref=${encodeURIComponent(config.branch)}`, { headers });
      if (current.ok) sha = (await current.json()).sha;
      else if (current.status !== 404) {
        const detail = await current.json().catch(() => ({}));
        throw new Error(detail.message || `Não foi possível consultar o arquivo (${current.status}).`);
      }

      const payload = {
        message: `Atualiza dados do TirzeTrack em ${data.updatedAt}`,
        content: encodeBase64Utf8(`${JSON.stringify(data, null, 2)}\n`),
        branch: config.branch,
        ...(sha ? { sha } : {})
      };
      const response = await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Falha ao publicar (${response.status}).`);

      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
      dirty = false;
      setStatus("Publicado com sucesso", "published");
      showToast("Alterações publicadas no GitHub.");
    } catch (error) {
      setStatus("Falha na publicação", "error");
      showToast(error.message || "Não foi possível publicar.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Publicar no GitHub";
    }
  }

  document.addEventListener("input", event => {
    if (event.target.matches("input, textarea")) markDirty();
  });
  document.addEventListener("change", event => {
    if (event.target.matches("input, textarea")) markDirty();
  });
  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    if (add) addItem(add.dataset.add);
    const del = event.target.closest("[data-delete]");
    if (del) deleteItem(del.dataset.delete, Number(del.dataset.index));
  });

  $("saveDraft").addEventListener("click", saveDraft);
  $("downloadBackup").addEventListener("click", downloadBackup);
  $("reloadPublished").addEventListener("click", () => loadPublishedData(true));
  $("recalculateWeights").addEventListener("click", recalculateWeights);
  $("saveGithubConfig").addEventListener("click", saveGithubConfig);
  $("publishButton").addEventListener("click", publishToGithub);
  $("jsonInput").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) importJson(file);
    event.target.value = "";
  });
  window.addEventListener("beforeunload", event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  loadInitialData();
})();
