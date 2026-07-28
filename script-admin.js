(() => {
  "use strict";

  const DRAFT_KEY = "tirzetrack-admin-draft-v2";
  const GITHUB_CONFIG_KEY = "tirzetrack-github-config-v1";
  const ADMIN_BUILD = "2.5.2";
  const LIVE_PREVIEW_KEY = "tirzetrack-live-published-v1";
  const $ = id => document.getElementById(id);
  let appData = null;
  let dirty = false;
  let selectedDiaryIndex = -1;

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
    medicalNotice: "Este site organiza os registros informados e não substitui acompanhamento médico.",
    visibility: { header: true, profile: true, summary: true, treatment: true, weights: true, applications: true, weeks: true, analysis: true, diary: true, notes: true }
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
      diary: Array.isArray(data.diary) ? data.diary : [],
      visibility: { ...base.visibility, ...(data.visibility || {}) }
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

  function showLoadError(message = "") {
    const box = $("loadError");
    if (!box) return;
    box.hidden = !message;
    box.textContent = message;
  }

  function activateTab(id, scroll = false) {
    document.querySelectorAll(".admin-form-section").forEach(section => {
      section.hidden = section.id !== id;
    });
    document.querySelectorAll("[data-admin-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.adminTab === id);
    });
    if (scroll) document.querySelector(".admin-section-nav")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try { sessionStorage.setItem("tirzetrack-admin-tab", id); } catch (_) {}
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
        synchronizeWeights();
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
      showLoadError("");
      const url = new URL(`../dados.json?ts=${Date.now()}`, window.location.href).href;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`dados.json respondeu com status ${response.status}.`);
      const raw = await response.text();
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (_) { throw new Error("O arquivo dados.json não contém um JSON válido."); }
      appData = normalizeData(parsed);
      synchronizeWeights();
      localStorage.removeItem(DRAFT_KEY);
      dirty = false;
      fillEditor();
      setStatus("Dados publicados carregados", "saved");
      if (confirmReload) showToast("Dados publicados recarregados.");
    } catch (error) {
      appData = emptyData();
      fillEditor();
      setStatus("Falha ao carregar dados", "error");
      const message = `${error.message || "Não foi possível carregar dados.json."} Verifique se dados.json está na raiz do repositório e se admin/script-admin.js foi enviado.`;
      showLoadError(message);
      showToast(message, "error");
    }
  }

  function fillEditor() {
    const build = $("adminBuild");
    if (build) build.textContent = `Versão ${ADMIN_BUILD}`;
    setValue("fieldTitle", appData.title);
    setValue("fieldUpdatedAt", parseBRDate(appData.updatedAt));
    const autoDate = $("fieldAutoUpdatedAt");
    if (autoDate && autoDate.dataset.initialized !== "true") { autoDate.checked = true; autoDate.dataset.initialized = "true"; }
    if (autoDate) $("fieldUpdatedAt").disabled = autoDate.checked;
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
    const visibility = appData.visibility || {};
    ["Header","Profile","Summary","Treatment","Weights","Applications","Weeks","Analysis","Diary","Notes"].forEach(name => {
      const el = $(`visibility${name}`);
      if (el) el.checked = visibility[name.charAt(0).toLowerCase() + name.slice(1)] !== false;
    });
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

  function dateFromBR(value) {
    const iso = parseBRDate(value);
    return iso ? new Date(`${iso}T12:00:00`) : null;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function dateInRange(value, start, end) {
    const date = dateFromBR(value);
    return date && date >= start && date <= end;
  }

  function latestWeightOnOrBefore(date) {
    const items = appData.weights
      .map(item => ({ ...item, parsed: dateFromBR(item.date), value: Number(item.valueKg) }))
      .filter(item => item.parsed && Number.isFinite(item.value) && item.parsed <= date)
      .sort((a, b) => a.parsed - b.parsed);
    return items.length ? items[items.length - 1] : null;
  }

  function firstWeightAfter(date, limitDate = null) {
    const items = appData.weights
      .map(item => ({ ...item, parsed: dateFromBR(item.date), value: Number(item.valueKg) }))
      .filter(item => item.parsed && Number.isFinite(item.value) && item.parsed > date && (!limitDate || item.parsed <= limitDate))
      .sort((a, b) => a.parsed - b.parsed);
    return items.length ? items[0] : null;
  }

  function synchronizeGeneralObservationDate() {
    const observation = String(appData.generalObservation || '').trim();
    if (!observation || !appData.updatedAt) return;
    const updated = observation.replace(/^Até\s+\d{2}\/\d{2}\/\d{4}(?=\s*[,.-])/i, `Até ${appData.updatedAt}`);
    if (updated !== observation) {
      appData.generalObservation = updated;
      setValue('fieldGeneralObservation', updated);
    }
  }

  function uniqueText(items, key) {
    return [...new Set(items.map(item => String(item[key] || "").trim()).filter(Boolean))].join(" • ");
  }

  function extractWeekFields(item = {}) {
    const fields = {
      weight: item.weight || "",
      result: item.result || "",
      application: item.application || "",
      hunger: item.hunger || "",
      effects: item.effects || "",
      observation: item.observation || "",
      additional: item.additional || ""
    };
    const lines = Array.isArray(item.lines) ? item.lines : [];
    const map = [
      ["Peso:", "weight"], ["Resultado:", "result"], ["Aplicação:", "application"],
      ["Fome:", "hunger"], ["Efeitos:", "effects"], ["Observação:", "observation"]
    ];
    for (const line of lines) {
      const text = String(line || "").trim();
      const found = map.find(([prefix]) => text.startsWith(prefix));
      if (found && !fields[found[1]]) fields[found[1]] = text.slice(found[0].length).trim();
      else if (!found && text && !fields.additional) fields.additional = text;
    }
    if (Array.isArray(item.customLines) && item.customLines.length && !fields.additional) {
      fields.additional = item.customLines.join("\n");
    }
    return fields;
  }

  function weekLines(item = {}) {
    const fields = extractWeekFields(item);
    const lines = [];
    if (fields.weight) lines.push(`Peso: ${fields.weight}`);
    if (fields.result) lines.push(`Resultado: ${fields.result}`);
    if (fields.application) lines.push(`Aplicação: ${fields.application}`);
    if (fields.hunger) lines.push(`Fome: ${fields.hunger}`);
    if (fields.effects) lines.push(`Efeitos: ${fields.effects}`);
    if (fields.observation) lines.push(`Observação: ${fields.observation}`);
    if (fields.additional) {
      String(fields.additional).split("\n").map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
    }
    return lines;
  }

  function preserveManualValue(oldItem, key, generatedValue) {
    const oldFields = extractWeekFields(oldItem);
    const isManual = Boolean(oldItem?.manualFields?.[key]);
    return isManual ? oldFields[key] : generatedValue;
  }

  function generateWeeklySummaries({ notify = false } = {}) {
    collectDiaryFromDOM();
    const applications = [...appData.applications]
      .filter(item => dateFromBR(item.date))
      .sort((a, b) => dateFromBR(a.date) - dateFromBR(b.date));
    if (!applications.length) {
      if (notify) showToast("Cadastre pelo menos uma aplicação para gerar os resumos.", "error");
      return false;
    }

    const today = new Date(); today.setHours(12, 0, 0, 0);
    const oldByTitle = new Map((appData.weeks || []).map(item => [item.title, item]));
    appData.weeks = applications.map((application, index) => {
      const start = dateFromBR(application.date);
      const nominalEnd = addDays(start, 6);
      const nextStart = applications[index + 1] ? dateFromBR(applications[index + 1].date) : null;
      const end = nextStart ? addDays(nextStart, -1) : nominalEnd;
      const isCurrent = index === applications.length - 1 && today <= nominalEnd;
      const displayEnd = isCurrent && today < end ? today : end;
      const startWeight = latestWeightOnOrBefore(start);
      // A semana só é encerrada por uma pesagem posterior ao início dela.
      // A pesagem do próprio dia da aplicação é o peso inicial, nunca o resultado.
      const closingWeight = firstWeightAfter(start, nextStart || displayEnd);
      const endWeight = closingWeight;
      const entries = appData.diary.filter(item => dateInRange(item.date, start, displayEnd));

      let weight = "";
      let result = "";
      if (startWeight && endWeight && startWeight.date !== endWeight.date) {
        weight = `${Number(startWeight.value).toFixed(2).replace(".", ",")} → ${Number(endWeight.value).toFixed(2).replace(".", ",")} kg`;
        const delta = startWeight.value - endWeight.value;
        result = `${delta >= 0 ? "-" : "+"}${Math.abs(delta).toFixed(2).replace(".", ",")} kg`;
      } else if (startWeight) {
        weight = `${Number(startWeight.value).toFixed(2).replace(".", ",")} → aguardando nova pesagem`;
        result = "aguardando nova pesagem";
      }

      const generatedFields = {
        weight,
        result,
        application: `${application.date}${application.time ? ` às ${application.time}` : ""}`,
        hunger: uniqueText(entries, "hunger"),
        effects: uniqueText(entries, "effects"),
        observation: uniqueText(entries, "notes")
      };
      const title = `Semana ${index + 1}`;
      const old = oldByTitle.get(title) || {};
      const item = {
        title,
        period: isCurrent ? `Iniciada em ${application.date.slice(0, 5)}` : `${application.date.slice(0, 5)} a ${formatBRDate(displayEnd).slice(0, 5)}`,
        current: isCurrent,
        weight: preserveManualValue(old, "weight", generatedFields.weight),
        result: preserveManualValue(old, "result", generatedFields.result),
        application: preserveManualValue(old, "application", generatedFields.application),
        hunger: preserveManualValue(old, "hunger", generatedFields.hunger),
        effects: preserveManualValue(old, "effects", generatedFields.effects),
        observation: preserveManualValue(old, "observation", generatedFields.observation),
        additional: extractWeekFields(old).additional,
        generatedFields,
        manualFields: { ...(old.manualFields || {}) }
      };
      item.lines = weekLines(item);
      return item;
    });
    renderWeeks();
    if (notify) { markDirty(); showToast("Resumos semanais atualizados. Cada campo continua editável."); }
    return true;
  }

  function renderWeeks() {
    $("weeksList").innerHTML = appData.weeks.length ? appData.weeks.map((item, index) => {
      const fields = extractWeekFields(item);
      return `
      <article class="editable-item" data-type="weeks" data-index="${index}">
        ${itemHeader(item.title || `Semana ${index + 1}`, index, "weeks")}
        <div class="admin-grid two-columns weekly-fields-grid">
          <label>Título<input data-field="title" type="text" value="${escapeHtml(item.title)}"></label>
          <label>Período<input data-field="period" type="text" value="${escapeHtml(item.period)}"></label>
          <label class="checkbox-label wide-field"><input data-field="current" type="checkbox" ${item.current ? "checked" : ""}> Semana atual</label>
          <label>Peso<input data-field="weight" type="text" value="${escapeHtml(fields.weight)}" placeholder="Ex.: 111,30 → 109,80 kg"></label>
          <label>Resultado<input data-field="result" type="text" value="${escapeHtml(fields.result)}" placeholder="Ex.: -1,50 kg"></label>
          <label>Aplicação<input data-field="application" type="text" value="${escapeHtml(fields.application)}" placeholder="Data, horário e detalhes"></label>
          <label>Fome<textarea data-field="hunger" rows="3">${escapeHtml(fields.hunger)}</textarea></label>
          <label>Efeitos<textarea data-field="effects" rows="3">${escapeHtml(fields.effects)}</textarea></label>
          <label class="wide-field">Observação<textarea data-field="observation" rows="3">${escapeHtml(fields.observation)}</textarea></label>
          <label class="wide-field">Informações adicionais<textarea data-field="additional" rows="3" placeholder="Informações extras que não entram nos campos acima.">${escapeHtml(fields.additional)}</textarea></label>
        </div>
      </article>`;
    }).join("") : '<p class="empty-list">Nenhum resumo semanal. Clique em “Gerar resumos automaticamente”.</p>';
  }

  function collectDiaryFromDOM() {
    const editor = $("diarySingleEditor");
    if (!editor || selectedDiaryIndex < 0 || !appData.diary[selectedDiaryIndex]) return;
    const obj = {};
    editor.querySelectorAll("[data-field]").forEach(input => {
      const key = input.dataset.field;
      if (input.dataset.date) obj[key] = formatBRDate(input.value);
      else obj[key] = input.value.trim();
    });
    appData.diary[selectedDiaryIndex] = obj;
  }

  function renderDiary() {
    sortByDate(appData.diary);
    if (!appData.diary.length) {
      selectedDiaryIndex = -1;
      $("diaryDateSelector").innerHTML = '<option value="">Nenhum registro</option>';
      $("diarySingleEditor").innerHTML = '<p class="empty-list">Nenhum registro diário cadastrado.</p>';
      return;
    }
    if (selectedDiaryIndex < 0 || selectedDiaryIndex >= appData.diary.length) selectedDiaryIndex = appData.diary.length - 1;
    $("diaryDateSelector").innerHTML = appData.diary.map((item, index) => `<option value="${index}" ${index === selectedDiaryIndex ? "selected" : ""}>${escapeHtml(item.date || `Registro ${index + 1}`)}</option>`).join("");
    const item = appData.diary[selectedDiaryIndex];
    $("diarySingleEditor").innerHTML = `
      <article class="editable-item" data-type="diary" data-index="${selectedDiaryIndex}">
        ${itemHeader(item.date || `Registro ${selectedDiaryIndex + 1}`, selectedDiaryIndex, "diary")}
        <div class="admin-grid two-columns">
          <label>Data<input data-field="date" data-date="true" type="date" value="${escapeHtml(parseBRDate(item.date))}"></label>
          <label>Refeições<textarea data-field="meals" rows="4">${escapeHtml(item.meals)}</textarea></label>
          <label>Fome<textarea data-field="hunger" rows="4">${escapeHtml(item.hunger)}</textarea></label>
          <label>Efeitos<textarea data-field="effects" rows="4">${escapeHtml(item.effects)}</textarea></label>
          <label class="wide-field">Observações<textarea data-field="notes" rows="4">${escapeHtml(item.notes)}</textarea></label>
        </div>
      </article>`;
  }

  function collectDataFromDOM() {
    appData.title = getValue("fieldTitle");
    if ($("fieldAutoUpdatedAt")?.checked) {
      appData.updatedAt = formatBRDate(new Date());
      setValue("fieldUpdatedAt", parseBRDate(appData.updatedAt));
    } else appData.updatedAt = formatBRDate(getValue("fieldUpdatedAt"));
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
    appData.weeks = collectList("weeks").map((item, index) => {
      const merged = { ...(appData.weeks[index] || {}), ...item };
      merged.generatedFields = appData.weeks[index]?.generatedFields || {};
      merged.manualFields = appData.weeks[index]?.manualFields || {};
      merged.lines = weekLines(merged);
      return merged;
    });
    collectDiaryFromDOM();
    appData.generalObservation = getValue("fieldGeneralObservation");
    appData.medicalNotice = getValue("fieldMedicalNotice");
    appData.visibility = {
      header: $("visibilityHeader")?.checked !== false,
      profile: $("visibilityProfile")?.checked !== false,
      summary: $("visibilitySummary")?.checked !== false,
      treatment: $("visibilityTreatment")?.checked !== false,
      weights: $("visibilityWeights")?.checked !== false,
      applications: $("visibilityApplications")?.checked !== false,
      weeks: $("visibilityWeeks")?.checked !== false,
      analysis: $("visibilityAnalysis")?.checked !== false,
      diary: $("visibilityDiary")?.checked !== false,
      notes: $("visibilityNotes")?.checked !== false
    };
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
    if (type === "weeks") appData.weeks.push({ title: `Semana ${appData.weeks.length + 1}`, period: "", current: false, generatedLines: [], customLines: [], lines: [] });
    if (type === "diary") {
      const today = formatBRDate(new Date());
      const existingIndex = appData.diary.findIndex(item => item.date === today);
      if (existingIndex >= 0) {
        selectedDiaryIndex = existingIndex;
        showToast("O registro de hoje já existe e foi aberto para edição.", "error");
      } else {
        appData.diary.push({ date: today, meals: "", hunger: "", effects: "", notes: "" });
        sortByDate(appData.diary);
        selectedDiaryIndex = appData.diary.findIndex(item => item.date === today);
      }
    }
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
    if (type === "diary") selectedDiaryIndex = Math.min(index, list.length - 1);
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

  function synchronizeWeights({ updateStage = false } = {}) {
    sortByDate(appData.weights);
    const valid = appData.weights.filter(item => item.date && Number.isFinite(Number(item.valueKg)));
    if (!valid.length) return false;
    appData.goal.initialWeightKg = Number(valid[0].valueKg);
    appData.goal.currentWeightKg = Number(valid[valid.length - 1].valueKg);
    if (updateStage || !Number.isFinite(Number(appData.goal.stageStartWeightKg))) {
      appData.goal.stageStartWeightKg = Number(valid[0].valueKg);
    }
    if (updateStage || !appData.goal.stageStartDate) appData.goal.stageStartDate = valid[0].date;
    return true;
  }

  function recalculateWeights() {
    collectDataFromDOM();
    if (!synchronizeWeights()) return showToast("Cadastre ao menos uma pesagem válida.", "error");
    fillEditor();
    markDirty();
    showToast("Peso inicial e peso atual recalculados pela primeira e pela última pesagem.");
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

  function applyAutomaticUpdates() {
    collectDataFromDOM();
    sortByDate(appData.weights);
    synchronizeWeights();
    sortByDate(appData.applications);
    sortByDate(appData.diary);
    appData.applications.forEach((item, index) => { item.number = numeric(item.number) || index + 1; });
    synchronizeGeneralObservationDate();
    if ($("fieldAutoWeeks")?.checked) generateWeeklySummaries();
    appData.weeks = (appData.weeks || []).map(item => ({
      ...item,
      lines: weekLines(item)
    }));
    setValue("fieldInitialWeight", appData.goal.initialWeightKg);
    setValue("fieldCurrentWeight", appData.goal.currentWeightKg);
    return appData;
  }

  function prepareData() {
    applyAutomaticUpdates();
    const errors = validateData(appData);
    if (errors.length) throw new Error(errors.slice(0, 5).join("\n"));
    return appData;
  }

  function saveDraft() {
    try {
      applyAutomaticUpdates();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(appData));
      dirty = false;
      setStatus("Rascunho salvo neste navegador", "saved");
      showToast("Rascunho salvo com data, pesos e resumos atualizados.");
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


  function pdfText(value = "") {
    return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  }

  function pdfKg(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2).replace(".", ",")} kg` : "-";
  }

  function pdfFileName(data) {
    const name = pdfText(data?.profile?.name || "TirzeTrack")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "TirzeTrack";
    return `TirzeTrack-${name}-${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  function escapePdfHtml(value = "") {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function pdfRows(headers, rows) {
    const head = `<thead><tr>${headers.map(item => `<th>${escapePdfHtml(item)}</th>`).join("")}</tr></thead>`;
    const body = `<tbody>${rows.map(row => `<tr>${row.map(item => `<td>${escapePdfHtml(item)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return `<table>${head}${body}</table>`;
  }

  function getSelectedPdfSections() {
    return new Set(Array.from(document.querySelectorAll('input[name="pdfSection"]:checked')).map(input => input.value));
  }

  function openPdfOptions() {
    const dialog = $("pdfOptionsDialog");
    if (!dialog) return exportPdfAdmin(new Set(["summary", "treatment", "chart", "weights", "applications", "weeks", "observations"]));
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closePdfOptions() {
    const dialog = $("pdfOptionsDialog");
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function pdfProgress(initial, current, target) {
    const total = initial - target;
    const lost = initial - current;
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(lost)) return 0;
    return Math.max(0, Math.min(100, (lost / total) * 100));
  }

  function pdfChartSvg(weights = []) {
    const points = weights.map(item => ({ date: pdfText(item.date), value: Number(item.valueKg) })).filter(item => Number.isFinite(item.value));
    if (points.length < 2) return '<p class="empty-note">São necessárias pelo menos duas pesagens para gerar o gráfico.</p>';
    const width = 900, height = 330, left = 70, right = 28, top = 30, bottom = 58;
    const values = points.map(item => item.value);
    const rawMin = Math.min(...values), rawMax = Math.max(...values);
    const padding = Math.max(1, (rawMax - rawMin) * 0.18);
    const min = Math.floor(rawMin - padding), max = Math.ceil(rawMax + padding);
    const range = Math.max(1, max - min);
    const x = index => left + index * ((width - left - right) / Math.max(1, points.length - 1));
    const y = value => top + (max - value) * ((height - top - bottom) / range);
    const line = points.map((item, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
    const grid = Array.from({ length: 5 }, (_, index) => {
      const value = max - (range * index / 4);
      const yy = y(value);
      return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" class="chart-grid"/><text x="${left-12}" y="${yy+5}" text-anchor="end" class="chart-axis">${value.toFixed(1).replace(".", ",")}</text>`;
    }).join("");
    const labels = points.map((item, index) => {
      const xx = x(index), yy = y(item.value);
      const shortDate = item.date.replace(/\/\d{4}$/, "");
      return `<circle cx="${xx}" cy="${yy}" r="5" class="chart-point"/><text x="${xx}" y="${yy-13}" text-anchor="middle" class="chart-value">${item.value.toFixed(2).replace(".", ",")} kg</text><text x="${xx}" y="${height-22}" text-anchor="middle" class="chart-axis">${escapePdfHtml(shortDate)}</text>`;
    }).join("");
    return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico da evolução do peso">${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" class="chart-base"/><line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="chart-base"/><path d="${line}" class="chart-line"/>${labels}</svg></div>`;
  }

  function weekCard(item) {
    const lines = (item.lines || []).map(pdfText).filter(Boolean);
    return `<article class="week-card${item.current ? " current" : ""}"><h3>${escapePdfHtml(item.title || "Semana")}${item.period ? ` <span>- ${escapePdfHtml(item.period)}</span>` : ""}</h3>${lines.length ? `<ul>${lines.map(line => `<li>${escapePdfHtml(line)}</li>`).join("")}</ul>` : '<p class="empty-note">Sem informações registradas.</p>'}</article>`;
  }

  function diaryCards(items, compact) {
    return items.map(item => `<article class="diary-card${compact ? " compact" : ""}"><h3>${escapePdfHtml(item.date || "Sem data")}</h3><table class="detail-table"><tbody><tr><th>Refeições</th><td>${escapePdfHtml(pdfText(item.meals) || "-")}</td></tr><tr><th>Fome</th><td>${escapePdfHtml(pdfText(item.hunger) || "-")}</td></tr><tr><th>Efeitos</th><td>${escapePdfHtml(pdfText(item.effects) || "-")}</td></tr><tr><th>Observações</th><td>${escapePdfHtml(pdfText(item.notes) || "-")}</td></tr></tbody></table></article>`).join("");
  }

  async function exportPdfAdmin(selectedSections = getSelectedPdfSections()) {
    const button = $("generateSelectedPdf") || $("exportPdfAdmin");
    const originalText = button?.textContent || "Gerar relatório";
    try {
      if (!selectedSections.size) throw new Error("Selecione pelo menos uma seção para o relatório.");
      if (button) { button.disabled = true; button.textContent = "Preparando relatório..."; }
      const data = prepareData();
      const compactDiary = $("pdfCompactDiary")?.checked !== false;
      const goal = data.goal || {};
      const initial = Number(goal.initialWeightKg);
      const current = Number(goal.currentWeightKg);
      const target = Number(goal.targetWeightKg);
      const lost = Number.isFinite(initial) && Number.isFinite(current) ? initial - current : NaN;
      const remaining = Number.isFinite(current) && Number.isFinite(target) ? current - target : NaN;
      const progress = pdfProgress(initial, current, target);
      const section = (key, title, content, extraClass = "") => selectedSections.has(key) ? `<section class="report-section ${extraClass}"><h2>${escapePdfHtml(title)}</h2>${content}</section>` : "";
      const parts = [];

      parts.push(section("summary", "Resumo geral", `<div class="summary-grid"><div><small>Peso inicial</small><strong>${pdfKg(initial)}</strong></div><div><small>Peso atual</small><strong>${pdfKg(current)}</strong></div><div class="highlight"><small>Perda acumulada</small><strong>${pdfKg(lost)}</strong></div><div><small>Meta atual</small><strong>${pdfKg(target)}</strong></div></div><div class="progress-box"><div><strong>Progresso até ${pdfKg(target)}</strong><span>${progress.toFixed(1).replace(".", ",")}%</span><em>Faltam ${pdfKg(remaining)}</em></div><div class="progress-track"><i style="width:${progress.toFixed(2)}%"></i></div></div>`));

      parts.push(section("treatment", "Tratamento", `<table class="detail-table treatment-table"><tbody><tr><th>Medicamento</th><td>${escapePdfHtml(pdfText(data.treatment?.medication) || "-")}</td><th>Concentração</th><td>${escapePdfHtml(pdfText(data.treatment?.concentration) || "-")}</td></tr><tr><th>Dose semanal</th><td>${escapePdfHtml(pdfText(data.treatment?.weeklyDose) || "-")}</td><th>Início</th><td>${escapePdfHtml(pdfText(data.treatment?.startDate) || "-")}</td></tr><tr><th>Aplicações registradas</th><td>${(data.applications || []).length}</td><th>Atualização</th><td>${escapePdfHtml(data.updatedAt || "-")}</td></tr></tbody></table>`));

      parts.push(section("chart", "Evolução do peso", pdfChartSvg(data.weights || []), "chart-section"));

      if ((data.weights || []).length) parts.push(section("weights", "Histórico de pesagens", pdfRows(["Data", "Peso", "Variação"], data.weights.map((item, index, list) => { const value = Number(item.valueKg); const previous = index ? Number(list[index - 1].valueKg) : value; const variation = value - previous; return [item.date || "-", pdfKg(value), index ? `${variation > 0 ? "+" : ""}${variation.toFixed(2).replace(".", ",")} kg` : "Início"]; }))));

      if ((data.applications || []).length) parts.push(section("applications", "Linha do tempo das aplicações", pdfRows(["Nº", "Data", "Hora", "Dose", "Local"], data.applications.map(item => [item.number ?? "-", item.date || "-", item.time || "-", item.dose || "-", pdfText(item.location) || "-"]))));

      if ((data.weeks || []).length) parts.push(section("weeks", "Resumo semanal", `<div class="weeks-list">${data.weeks.map(weekCard).join("")}</div>`));

      if ((data.diary || []).length) parts.push(section("diary", "Registros diários", `<div class="diary-list">${diaryCards(data.diary, compactDiary)}</div>`, "diary-section"));

      if (data.generalObservation || data.medicalNotice) parts.push(section("observations", "Observação geral", `<div class="observation-box"><p>${escapePdfHtml(pdfText(data.generalObservation) || "Sem observação geral.").replace(/\n/g, "<br>")}</p>${data.medicalNotice ? `<p class="notice">${escapePdfHtml(pdfText(data.medicalNotice)).replace(/\n/g, "<br>")}</p>` : ""}</div>`));

      const report = window.open("", "_blank");
      if (!report) throw new Error("O navegador bloqueou a janela do relatório. Permita pop-ups para o site e tente novamente.");
      const subtitle = [data.profile?.name, data.profile?.age ? `${data.profile.age} anos` : "", data.profile?.heightM ? `${String(data.profile.heightM).replace(".", ",")} m` : ""].filter(Boolean).join(" • ");
      report.document.open();
      report.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapePdfHtml(pdfFileName(data))}</title><style>
        @page { size:A4; margin:15mm 14mm 17mm; }
        *{box-sizing:border-box} body{margin:0;color:#173532;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.38;background:#fff} .actions{position:sticky;top:0;z-index:10;display:flex;justify-content:center;gap:8px;padding:10px;background:#fff;border-bottom:1px solid #d7e1df}.actions button{padding:10px 18px;border:0;border-radius:9px;background:#117d73;color:#fff;font-weight:800;cursor:pointer}
        .report-header{margin:-15mm -14mm 10mm;padding:13mm 14mm 10mm;background:#137d73;color:#fff}.report-header .header-row{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.report-header h1{margin:0 0 3mm;font-size:23pt;line-height:1.08}.report-header p{margin:0;font-size:11pt}.report-header time{font-weight:800;white-space:nowrap;margin-top:3mm}
        main{display:block}.report-section{margin:0 0 8mm;break-inside:auto}.report-section>h2{margin:0 0 4mm;color:#173f3b;font-size:17pt;line-height:1.15}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d4dfdd}.summary-grid>div{padding:3mm 4mm;border-right:1px solid #d4dfdd}.summary-grid>div:last-child{border-right:0}.summary-grid small{display:block;margin-bottom:1.5mm;color:#667b78;font-size:8pt;font-weight:800;text-transform:uppercase}.summary-grid strong{font-size:16pt}.summary-grid .highlight{background:#d9f1ee;color:#086e66}.progress-box{margin-top:4mm;padding:4mm;border:1px solid #d4dfdd;background:#f8fbfa}.progress-box>div:first-child{display:flex;align-items:center;gap:8px}.progress-box span{font-weight:800}.progress-box em{margin-left:auto;color:#72817f;font-style:normal}.progress-track{height:7px;margin-top:3mm;border-radius:99px;background:#dce9e7;overflow:hidden}.progress-track i{display:block;height:100%;background:#17998e;border-radius:99px}
        table{width:100%;border-collapse:collapse;table-layout:auto} th,td{padding:2.5mm 3mm;border:1px solid #d4dfdd;text-align:left;vertical-align:top;overflow-wrap:anywhere} thead th{background:#137d73;color:#fff;font-size:9pt} tbody td{font-size:9pt}.detail-table th{width:17%;background:#f3f7f6;color:#425d59}.treatment-table td{width:33%} tr{break-inside:avoid}
        .chart-wrap{padding:3mm 0 0}.chart-wrap svg{display:block;width:100%;height:auto}.chart-grid{stroke:#d8e2e0;stroke-width:1}.chart-base{stroke:#233936;stroke-width:2}.chart-line{fill:none;stroke:#137d73;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}.chart-point{fill:#fff;stroke:#137d73;stroke-width:4}.chart-axis{fill:#536b67;font-size:18px}.chart-value{fill:#173532;font-size:17px;font-weight:800}
        .weeks-list,.diary-list{display:grid;gap:3mm}.week-card{padding:4mm;border:1px solid #d4dfdd;break-inside:avoid}.week-card.current{border-color:#137d73;background:#e4f5f2}.week-card h3,.diary-card h3{margin:0 0 2mm;color:#08736a;font-size:13pt}.week-card h3 span{font-weight:700}.week-card ul{margin:0;padding-left:5mm}.week-card li{margin:.6mm 0}.diary-card{break-inside:avoid}.diary-card.compact h3{margin-bottom:1.5mm}.diary-card.compact th,.diary-card.compact td{padding:1.8mm 2.5mm;font-size:8.5pt}.observation-box{padding:4mm;border:1px solid #d4dfdd;background:#f8fbfa}.observation-box p{margin:0 0 3mm}.observation-box p:last-child{margin-bottom:0}.notice{color:#637672;font-size:9pt}.empty-note{color:#6f807d}
        .report-footer{margin-top:10mm;padding-top:3mm;border-top:1px solid #d4dfdd;color:#6a7b78;font-size:8.5pt;display:flex;justify-content:space-between}.report-footer::after{content:"TirzeTrack 2.6.0"}
        @media print{.actions{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-header{break-after:avoid}.chart-section{break-inside:avoid}.report-footer{position:running(footer)}}
        @media(max-width:700px){.summary-grid{grid-template-columns:repeat(2,1fr)}.summary-grid>div:nth-child(2){border-right:0}.summary-grid>div:nth-child(-n+2){border-bottom:1px solid #d4dfdd}.report-header .header-row{display:block}.report-header time{display:block}.progress-box>div:first-child{flex-wrap:wrap}.progress-box em{margin-left:0;width:100%}}
      </style></head><body><div class="actions"><button type="button" onclick="window.print()">Salvar como PDF / Imprimir</button></div><header class="report-header"><div class="header-row"><div><h1>${escapePdfHtml(data.title || "Acompanhamento com Tirzepatida")}</h1><p>${escapePdfHtml(subtitle)}</p></div><time>Atualizado em ${escapePdfHtml(data.updatedAt || "-")}</time></div></header><main>${parts.join("")}</main><footer class="report-footer"><span>Relatório de acompanhamento</span></footer><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),450));<\/script></body></html>`);
      report.document.close();
      closePdfOptions();
      showToast("Relatório preparado. Escolha ‘Salvar como PDF’ na tela de impressão.");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Não foi possível preparar o PDF.", "error");
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
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

      const encodedPath = config.path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
      const endpoint = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
      const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      };

      async function fetchCurrentSha() {
        const separator = endpoint.includes("?") ? "&" : "?";
        const url = `${endpoint}${separator}ref=${encodeURIComponent(config.branch)}&_=${Date.now()}`;
        const current = await fetch(url, { headers, cache: "no-store" });
        if (current.ok) return (await current.json()).sha;
        if (current.status === 404) return undefined;
        const detail = await current.json().catch(() => ({}));
        throw new Error(detail.message || `Não foi possível consultar o arquivo (${current.status}).`);
      }

      let response;
      let result = {};
      // Se outro envio alterou dados.json entre a consulta e a gravação, o GitHub
      // devolve conflito de SHA. Nesse caso, buscamos o SHA mais recente e tentamos novamente.
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const sha = await fetchCurrentSha();
        const payload = {
          message: `Atualiza dados do TirzeTrack em ${data.updatedAt}`,
          content: encodeBase64Utf8(`${JSON.stringify(data, null, 2)}\n`),
          branch: config.branch,
          ...(sha ? { sha } : {})
        };
        response = await fetch(endpoint, {
          method: "PUT",
          headers,
          cache: "no-store",
          body: JSON.stringify(payload)
        });
        result = await response.json().catch(() => ({}));
        if (response.ok) break;
        const shaConflict = (response.status === 409 || response.status === 422) && /sha|does not match|conflict/i.test(result.message || "");
        if (!shaConflict || attempt === 3) {
          throw new Error(result.message || `Falha ao publicar (${response.status}).`);
        }
        await new Promise(resolve => setTimeout(resolve, 450 * attempt));
      }

      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
      localStorage.setItem(LIVE_PREVIEW_KEY, JSON.stringify({ data, publishedAt: Date.now() }));
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

  // Liga todos os controles fixos do painel.
  document.querySelectorAll("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.adminTab;
      if (!targetId || !$(targetId)) return;
      collectDataFromDOM();
      activateTab(targetId, true);
    });
  });

  $("saveDraft")?.addEventListener("click", saveDraft);
  $("downloadBackup")?.addEventListener("click", downloadBackup);
  $("exportPdfAdmin")?.addEventListener("click", openPdfOptions);
  $("closePdfOptions")?.addEventListener("click", closePdfOptions);
  $("cancelPdfOptions")?.addEventListener("click", closePdfOptions);
  $("generateSelectedPdf")?.addEventListener("click", () => exportPdfAdmin(getSelectedPdfSections()));
  $("selectAllPdfSections")?.addEventListener("click", () => document.querySelectorAll('input[name="pdfSection"]').forEach(input => { input.checked = true; }));
  $("clearPdfSections")?.addEventListener("click", () => document.querySelectorAll('input[name="pdfSection"]').forEach(input => { input.checked = false; }));
  $("pdfOptionsDialog")?.addEventListener("click", event => { if (event.target === $("pdfOptionsDialog")) closePdfOptions(); });
  $("reloadPublished")?.addEventListener("click", () => loadPublishedData(true));
  $("recalculateWeights")?.addEventListener("click", recalculateWeights);
  $("generateWeeks")?.addEventListener("click", () => {
    collectDataFromDOM();
    generateWeeklySummaries({ notify: true });
  });
  $("saveGithubConfig")?.addEventListener("click", saveGithubConfig);
  $("publishButton")?.addEventListener("click", publishToGithub);

  $("fieldAutoUpdatedAt")?.addEventListener("change", event => {
    const dateField = $("fieldUpdatedAt");
    if (dateField) dateField.disabled = event.target.checked;
    if (event.target.checked) {
      appData.updatedAt = formatBRDate(new Date());
      setValue("fieldUpdatedAt", parseBRDate(appData.updatedAt));
    }
    markDirty();
  });

  $("diaryDateSelector")?.addEventListener("change", event => {
    collectDiaryFromDOM();
    const nextIndex = Number(event.target.value);
    selectedDiaryIndex = Number.isInteger(nextIndex) ? nextIndex : -1;
    renderDiary();
  });

  // Botões criados dinamicamente: adicionar e excluir registros.
  document.addEventListener("click", event => {
    const addButton = event.target.closest("[data-add]");
    if (addButton) {
      event.preventDefault();
      addItem(addButton.dataset.add);
      return;
    }
    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      event.preventDefault();
      deleteItem(deleteButton.dataset.delete, Number(deleteButton.dataset.index));
    }
  });

  // Marca como alterado quando o usuário edita qualquer campo do painel.
  document.addEventListener("input", event => {
    if (event.target.matches("input, textarea, select")) {
      const weekItem = event.target.closest('.editable-item[data-type="weeks"]');
      const field = event.target.dataset.field;
      if (weekItem && field) {
        const index = Number(weekItem.dataset.index);
        if (appData?.weeks?.[index]) {
          appData.weeks[index].manualFields = { ...(appData.weeks[index].manualFields || {}), [field]: true };
        }
      }
      markDirty();
    }
  });
  document.addEventListener("change", event => {
    if (event.target.matches("input, textarea, select")) markDirty();
  });

  $("jsonInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) importJson(file);
    event.target.value = "";
  });
  window.addEventListener("beforeunload", event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  const requiredIds = ["saveStatus", "fieldTitle", "weightsList", "diaryDateSelector", "publishButton"];
  const missing = requiredIds.filter(id => !$(id));
  if (missing.length) {
    document.body.insertAdjacentHTML("afterbegin", `<div class="admin-load-error">Erro de estrutura: campos ausentes (${missing.join(", ")}).</div>`);
  } else {
    let initialTab = "general";
    try { initialTab = sessionStorage.getItem("tirzetrack-admin-tab") || "general"; } catch (_) {}
    if (!$(initialTab)) initialTab = "general";
    activateTab(initialTab);
    loadInitialData();
  }
})();
