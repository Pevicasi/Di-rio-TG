(() => {
  "use strict";

  const DRAFT_KEY = "tirzetrack-admin-draft-v2";
  const GITHUB_CONFIG_KEY = "tirzetrack-github-config-v1";
  const ADMIN_BUILD = "3.0.0";
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

  const PDF_WIN_ANSI = {"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
  function pdfBytes(text) {
    const out = [];
    for (const char of String(text)) {
      const code = char.codePointAt(0);
      if (code <= 255) out.push(code);
      else if (PDF_WIN_ANSI[char] !== undefined) out.push(PDF_WIN_ANSI[char]);
      else out.push(63);
    }
    return out;
  }
  function pdfEscape(text) {
    return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
  }
  function pdfBinary(text) { return String.fromCharCode(...pdfBytes(text)); }

  class TirzePdf {
    constructor() {
      this.width = 595.28; this.height = 841.89;
      this.margin = 42; this.bottom = 46; this.pages = [[]]; this.page = 0;
      this.y = 42; this.teal = [19,125,115]; this.dark = [23,53,50]; this.gray = [103,123,120]; this.border = [210,223,221];
    }
    cmd(value) { this.pages[this.page].push(value); }
    rgb(color, stroke = false) { const [r,g,b] = color.map(v => (v/255).toFixed(3)); this.cmd(`${r} ${g} ${b} ${stroke ? "RG" : "rg"}`); }
    addPage() { this.pages.push([]); this.page++; this.y = this.margin; }
    ensure(height) { if (this.y + height > this.height - this.bottom) this.addPage(); }
    text(text, x, y, size = 10, bold = false, color = this.dark, align = "left") {
      const clean = pdfBinary(pdfText(text));
      let tx = x;
      const approx = clean.length * size * 0.49;
      if (align === "right") tx -= approx; else if (align === "center") tx -= approx / 2;
      this.rgb(color); this.cmd(`BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${tx.toFixed(2)} ${(this.height-y).toFixed(2)} Tm (${pdfEscape(clean)}) Tj ET`);
    }
    line(x1,y1,x2,y2,color=this.border,width=0.7) { this.rgb(color,true); this.cmd(`${width} w ${x1} ${this.height-y1} m ${x2} ${this.height-y2} l S`); }
    rect(x,y,w,h,fill=null,stroke=this.border) {
      if (fill) this.rgb(fill); if (stroke) this.rgb(stroke,true);
      this.cmd(`${x} ${(this.height-y-h).toFixed(2)} ${w} ${h} re ${fill && stroke ? "B" : fill ? "f" : "S"}`);
    }
    wrap(text, maxWidth, size=10) {
      const words = pdfText(text).split(/\s+/).filter(Boolean), lines=[]; let line="";
      const limit = Math.max(8, Math.floor(maxWidth/(size*0.49)));
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length <= limit) line = candidate;
        else { if (line) lines.push(line); line = word; }
      }
      if (line) lines.push(line); return lines.length ? lines : [""];
    }
    paragraph(text,x,width,size=10,lineHeight=14,color=this.dark,bold=false) {
      const lines=[]; String(text ?? "").split(/\n/).forEach(p => lines.push(...this.wrap(p,width,size)));
      this.ensure(lines.length*lineHeight+4);
      lines.forEach(line => { this.text(line,x,this.y,size,bold,color); this.y += lineHeight; });
      return lines.length*lineHeight;
    }
    sectionTitle(title) { this.ensure(34); this.text(title,this.margin,this.y,16,true,this.dark); this.y += 24; }
    table(headers, rows, widths) {
      const total = this.width - this.margin*2; const cols = widths || headers.map(()=>total/headers.length);
      const drawHeader = () => { this.ensure(24); let x=this.margin; headers.forEach((h,i)=>{this.rect(x,this.y,cols[i],24,this.teal,this.teal);this.text(h,x+7,this.y+16,8.5,true,[255,255,255]);x+=cols[i];}); this.y+=24; };
      drawHeader();
      rows.forEach(row => {
        const wrapped = row.map((cell,i)=>this.wrap(cell,cols[i]-14,8.5)); const h=Math.max(24,...wrapped.map(lines=>lines.length*11+10));
        if (this.y+h > this.height-this.bottom) { this.addPage(); drawHeader(); }
        let x=this.margin; wrapped.forEach((lines,i)=>{this.rect(x,this.y,cols[i],h,null,this.border); lines.forEach((line,j)=>this.text(line,x+7,this.y+15+j*11,8.5,false,this.dark)); x+=cols[i];}); this.y+=h;
      }); this.y+=12;
    }
    build() {
      const objects=[]; const add=obj=>{objects.push(obj);return objects.length;};
      const f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      const f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const pagesId=objects.length+1; add(""); const pageIds=[];
      this.pages.forEach(commands=>{ const stream=commands.join("\n"); const contentId=add(`<< /Length ${pdfBytes(stream).length} >>\nstream\n${stream}\nendstream`); const pageId=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`); pageIds.push(pageId); });
      objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
      const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let bytes=pdfBytes("%PDF-1.4\n%âãÏÓ\n"), offsets=[0];
      objects.forEach((obj,i)=>{ offsets.push(bytes.length); bytes.push(...pdfBytes(`${i+1} 0 obj\n${obj}\nendobj\n`)); });
      const xref=bytes.length; bytes.push(...pdfBytes(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`));
      for(let i=1;i<offsets.length;i++) bytes.push(...pdfBytes(`${String(offsets[i]).padStart(10,"0")} 00000 n \n`));
      bytes.push(...pdfBytes(`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));
      return new Blob([new Uint8Array(bytes)],{type:"application/pdf"});
    }
  }

  function drawPdfHeader(doc, data) {
    doc.rect(0,0,doc.width,116,doc.teal,doc.teal);
    doc.text(data.title || "Acompanhamento com Tirzepatida", doc.margin, 49, 22, true, [255,255,255]);
    const subtitle=[data.profile?.name,data.profile?.age?`${data.profile.age} anos`:"",data.profile?.heightM?`${String(data.profile.heightM).replace(".",",")} m`:""].filter(Boolean).join(" • ");
    doc.text(subtitle,doc.margin,75,10.5,false,[255,255,255]);
    doc.text(`Atualizado em ${data.updatedAt || "-"}`,doc.width-doc.margin,49,9,true,[255,255,255],"right");
    doc.y=145;
  }

  async function exportPdfAdmin(selectedSections = getSelectedPdfSections()) {
    const button=$("generateSelectedPdf")||$("exportPdfAdmin"), originalText=button?.textContent||"Gerar relatório";
    try {
      if(!selectedSections.size) throw new Error("Selecione pelo menos uma seção para o relatório.");
      if(button){button.disabled=true;button.textContent="Gerando PDF...";}
      const data=prepareData(), doc=new TirzePdf(); drawPdfHeader(doc,data);
      const goal=data.goal||{}, initial=Number(goal.initialWeightKg), current=Number(goal.currentWeightKg), target=Number(goal.targetWeightKg);
      const lost=initial-current, remaining=current-target, progress=pdfProgress(initial,current,target);
      if(selectedSections.has("summary")){
        doc.sectionTitle("Resumo geral"); const labels=["PESO INICIAL","PESO ATUAL","PERDA ACUMULADA","META ATUAL"], vals=[pdfKg(initial),pdfKg(current),pdfKg(lost),pdfKg(target)], w=(doc.width-doc.margin*2)/4;
        labels.forEach((label,i)=>{doc.rect(doc.margin+i*w,doc.y,w,54,i===2?[217,241,238]:null,doc.border);doc.text(label,doc.margin+i*w+8,doc.y+17,7.5,true,doc.gray);doc.text(vals[i],doc.margin+i*w+8,doc.y+40,14,true,i===2?[8,110,102]:doc.dark);}); doc.y+=68;
        doc.rect(doc.margin,doc.y,doc.width-doc.margin*2,45,[248,251,250],doc.border);doc.text(`Progresso até ${pdfKg(target)}: ${progress.toFixed(1).replace(".",",")}%`,doc.margin+10,doc.y+17,9,true);doc.text(`Faltam ${pdfKg(remaining)}`,doc.width-doc.margin-10,doc.y+17,9,false,doc.gray,"right");doc.rect(doc.margin+10,doc.y+28,doc.width-doc.margin*2-20,7,[220,233,231],null);doc.rect(doc.margin+10,doc.y+28,(doc.width-doc.margin*2-20)*progress/100,7,[23,153,142],null);doc.y+=62;
      }
      if(selectedSections.has("treatment")){
        doc.sectionTitle("Tratamento"); doc.table(["Campo","Informação","Campo","Informação"],[
          ["Medicamento",pdfText(data.treatment?.medication)||"-","Concentração",pdfText(data.treatment?.concentration)||"-"],
          ["Dose semanal",pdfText(data.treatment?.weeklyDose)||"-","Início",pdfText(data.treatment?.startDate)||"-"],
          ["Aplicações registradas",String((data.applications||[]).length),"Atualização",data.updatedAt||"-"]
        ],[92,164,92,163]);
      }
      if(selectedSections.has("chart") && (data.weights||[]).length>1){
        doc.sectionTitle("Evolução do peso"); doc.ensure(190); const x0=doc.margin+35,y0=doc.y+12,w=doc.width-doc.margin*2-55,h=145,pts=data.weights.map(i=>({d:i.date,v:Number(i.valueKg)})).filter(i=>Number.isFinite(i.v)); const vals=pts.map(p=>p.v),min=Math.floor(Math.min(...vals)-1),max=Math.ceil(Math.max(...vals)+1),range=Math.max(1,max-min);
        for(let i=0;i<5;i++){const yy=y0+i*h/4;doc.line(x0,yy,x0+w,yy,[220,229,227],0.5);doc.text((max-range*i/4).toFixed(1).replace(".",","),x0-8,yy+3,8,false,doc.gray,"right");}
        const coords=pts.map((p,i)=>({x:x0+i*w/Math.max(1,pts.length-1),y:y0+(max-p.v)*h/range,p})); coords.forEach((c,i)=>{if(i)doc.line(coords[i-1].x,coords[i-1].y,c.x,c.y,doc.teal,3);doc.rect(c.x-2,c.y-2,4,4,[255,255,255],doc.teal);doc.text(`${c.p.v.toFixed(2).replace(".",",")} kg`,c.x,c.y-8,8,true,doc.dark,"center");doc.text(String(c.p.d).replace(/\/\d{4}$/,"") ,c.x,y0+h+17,8,false,doc.gray,"center");}); doc.y=y0+h+36;
      }
      if(selectedSections.has("weights") && (data.weights||[]).length){doc.sectionTitle("Histórico de pesagens");doc.table(["Data","Peso","Variação"],data.weights.map((item,i,list)=>{const v=Number(item.valueKg),p=i?Number(list[i-1].valueKg):v,d=v-p;return[item.date||"-",pdfKg(v),i?`${d>0?"+":""}${d.toFixed(2).replace(".",",")} kg`:"Início"]}),[170,170,171]);}
      if(selectedSections.has("applications") && (data.applications||[]).length){doc.sectionTitle("Linha do tempo das aplicações");doc.table(["Nº","Data","Hora","Dose","Local"],data.applications.map(i=>[String(i.number??"-"),i.date||"-",i.time||"-",i.dose||"-",pdfText(i.location)||"-"]),[38,82,62,64,265]);}
      if(selectedSections.has("weeks") && (data.weeks||[]).length){doc.sectionTitle("Resumo semanal");for(const week of data.weeks){const lines=(week.lines||[]).map(pdfText).filter(Boolean), title=`${week.title||"Semana"}${week.period?` - ${week.period}`:""}`, height=34+Math.max(1,lines.length)*15;doc.ensure(height+10);doc.rect(doc.margin,doc.y,doc.width-doc.margin*2,height,week.current?[228,245,242]:null,week.current?doc.teal:doc.border);doc.text(title,doc.margin+10,doc.y+20,12,true,[8,115,106]);let yy=doc.y+39;(lines.length?lines:["Sem informações registradas."]).forEach(line=>{doc.text(`• ${line}`,doc.margin+12,yy,9,false,doc.dark);yy+=15;});doc.y+=height+9;}}
      if(selectedSections.has("diary") && (data.diary||[]).length){doc.sectionTitle("Registros diários");const compact=$("pdfCompactDiary")?.checked!==false;for(const item of data.diary){doc.ensure(compact?92:112);doc.text(item.date||"Sem data",doc.margin,doc.y,12,true,[8,115,106]);doc.y+=10;doc.table(["Campo","Registro"],[["Refeições",pdfText(item.meals)||"-"],["Fome",pdfText(item.hunger)||"-"],["Efeitos",pdfText(item.effects)||"-"],["Observações",pdfText(item.notes)||"-"]],[85,426]);}}
      if(selectedSections.has("observations") && (data.generalObservation||data.medicalNotice)){doc.sectionTitle("Observação geral");doc.rect(doc.margin,doc.y,doc.width-doc.margin*2,1,null,null);doc.paragraph(data.generalObservation||"Sem observação geral.",doc.margin,doc.width-doc.margin*2,10,14);if(data.medicalNotice){doc.y+=6;doc.paragraph(data.medicalNotice,doc.margin,doc.width-doc.margin*2,9,13,doc.gray);}doc.y+=10;}
      const total=doc.pages.length;doc.pages.forEach((commands,index)=>{doc.page=index;doc.rgb(doc.border,true);doc.cmd(`0.7 w ${doc.margin} ${doc.height-815} m ${doc.width-doc.margin} ${doc.height-815} l S`);doc.text("Relatório gerado pelo TirzeTrack",doc.margin,826,8,false,doc.gray);doc.text(`Página ${index+1} de ${total}`,doc.width-doc.margin,826,8,false,doc.gray,"right");});doc.page=total-1;
      const blob=doc.build(),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=pdfFileName(data);document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);closePdfOptions();showToast("PDF gerado e baixado com sucesso.");
    }catch(error){console.error(error);showToast(error.message||"Não foi possível gerar o PDF.","error");}
    finally{if(button){button.disabled=false;button.textContent=originalText;}}
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
