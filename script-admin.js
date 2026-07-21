import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const STORAGE_KEY = "tirzetrack-data-v1";
const GITHUB_CONFIG_KEY = "tirzetrack-github-config-v1";
const PDF_START = "TIRZETRACK_DATA_START";
const PDF_END = "TIRZETRACK_DATA_END";

const defaultData = {
  schemaVersion: 1,
  title: "Acompanhamento com Tirzepatida",
  updatedAt: "20/07/2026",
  profile: { name: "Petrônio Vieira", age: 42, heightM: 1.59 },
  goal: { initialWeightKg: 117.5, currentWeightKg: 111.3, targetWeightKg: 100 },
  treatment: {
    medication: "TG (Indufar)", concentration: "15 mg / 0,5 mL",
    weeklyDose: "8 UI", startDate: "06/07/2026"
  },
  weights: [
    { date: "06/07/2026", valueKg: 117.5 },
    { date: "13/07/2026", valueKg: 113.95 },
    { date: "20/07/2026", valueKg: 111.3 }
  ],
  applications: [
    { number: 1, date: "06/07/2026", time: "10:00", dose: "8 UI", location: "Abdômen, lado esquerdo do umbigo" },
    { number: 2, date: "13/07/2026", time: "18:50", dose: "8 UI", location: "Abdômen, lado direito do umbigo" },
    { number: 3, date: "20/07/2026", time: "15:15", dose: "8 UI", location: "Abdômen, abaixo do umbigo" }
  ],
  weeks: [
    { title: "Semana 1", period: "06/07 a 12/07", current: false, lines: ["Peso: 117,50 → 113,95 kg", "Resultado: -3,55 kg", "Fome: intensa no início e progressivamente menor.", "Efeitos: boca seca, estufamento, arrotos com odor e salivação durante o sono.", "Observação: sintomas melhoraram ao longo dos dias."] },
    { title: "Semana 2", period: "13/07 a 19/07", current: false, lines: ["Peso: 113,95 → 111,30 kg", "Resultado: -2,65 kg", "Fome: ausência de fome na maior parte dos dias.", "Efeitos: praticamente nenhum efeito colateral relevante.", "Observação: apenas um episódio de fome leve em 19/07."] },
    { title: "Semana 3", period: "Iniciada em 20/07", current: true, lines: ["Peso inicial: 111,30 kg", "Aplicação: 20/07 às 15:15", "Fome: sem fome no momento do registro.", "Efeitos: nenhum relatado.", "Observação: aplicação abaixo do umbigo."] }
  ],
  diary: [
    { date: "06/07/2026", meals: "09:30: pesagem inicial; 20:00: jantar normal.", hunger: "Fome intensa à tarde, menor no jantar e forte vontade de comer às 22:39.", effects: "Leve dor de cabeça e boca muito seca.", notes: "1ª aplicação às 10:00, no lado esquerdo do umbigo." },
    { date: "07/07/2026", meals: "14:00: primeira refeição após longo jejum, em quantidade menor que a habitual.", hunger: "Fome forte antes do almoço.", effects: "Muita sede, salivação durante o sono, estufamento e arrotos com odor.", notes: "Dia com os sintomas digestivos mais marcantes." },
    { date: "08/07/2026", meals: "Almoço com carne, legumes e banana; jantar com talharim, carne e legumes.", hunger: "Menor que no dia anterior; jantar mais por vontade de comer.", effects: "Sem estufamento após o almoço.", notes: "Início de melhora clara dos sintomas." },
    { date: "09/07/2026", meals: "Pão com ovo; almoço; macarrão com frango e legumes; pão com frango e chá.", hunger: "Pouca fome ao acordar, moderada no jantar e lanche noturno por vontade.", effects: "Salivação muito menor e sem desconforto relevante.", notes: "Porções em torno de 40% a 50% do padrão anterior." },
    { date: "10/07/2026", meals: "Pão de queijo; almoço; pão doce com ovo e mortadela; pão doce com mortadela.", hunger: "Leve fome antes do almoço; demais refeições sem fome ou por vontade.", effects: "Sem efeitos relevantes.", notes: "Apetite já bastante reduzido." },
    { date: "11/07/2026", meals: "13:40: almoço; 21:15: jantar semelhante ao almoço.", hunger: "Sem fome antes das refeições.", effects: "Sem efeitos relevantes.", notes: "Comeu as refeições completas apesar da ausência de fome." },
    { date: "12/07/2026", meals: "Bebida láctea; frango, batatas, talharim e legumes; jantar semelhante.", hunger: "Sem fome.", effects: "Salivação excessiva considerada resolvida.", notes: "Fim da 1ª semana com boa adaptação." },
    { date: "13/07/2026", meals: "Feijão, macarrão, abóbora e verduras; pão francês com ovo e mortadela.", hunger: "Sem fome.", effects: "Dor de garganta, sem efeitos digestivos importantes.", notes: "Peso 113,95 kg. 2ª aplicação às 18:50." },
    { date: "14/07/2026", meals: "Pão de queijo; frango, batatas e legumes; frango, tomate e banana.", hunger: "Sem fome durante todo o dia.", effects: "Boca seca e garganta melhorando.", notes: "2ª aplicação melhor tolerada." },
    { date: "15/07/2026", meals: "Pão francês com mortadela; frango grelhado, legumes e vinagrete; jantar semelhante.", hunger: "Sem fome.", effects: "Sem efeitos colaterais.", notes: "Dia estável." },
    { date: "16/07/2026", meals: "14:10: almoço; 20:00: jantar.", hunger: "Não informado.", effects: "Sem efeitos colaterais.", notes: "Dia corrido; registro apenas dos horários." },
    { date: "17/07/2026", meals: "Bolinhos de caco e salsicha; carne moída, banana e legumes; jantar semelhante.", hunger: "Sem fome durante todo o dia.", effects: "Sem efeitos colaterais.", notes: "Boa tolerância e controle do apetite." },
    { date: "18/07/2026", meals: "Pão carteira com omelete; omelete com batata assada; 2 bolinhos de caco.", hunger: "Sem fome.", effects: "Sem efeitos colaterais.", notes: "Lanche noturno feito mesmo sem fome." },
    { date: "19/07/2026", meals: "Banana, pão com fiambre e bolinho de caco; pipoca; omelete com legumes.", hunger: "Um pouco de fome às 16:30.", effects: "Sem efeitos colaterais.", notes: "Primeiro episódio de fome em vários dias." },
    { date: "20/07/2026", meals: "14:15: frango, batata, cenoura, chuchu, cebola e pimentão.", hunger: "Sem fome.", effects: "Sem efeitos colaterais.", notes: "Peso 111,30 kg. 3ª aplicação às 15:15, abaixo do umbigo." }
  ],
  generalObservation: "Até 20/07/2026, o tratamento apresenta perda de peso consistente, forte controle do apetite e melhor tolerância após a segunda aplicação.",
  medicalNotice: "Este site organiza os registros informados e não substitui acompanhamento médico."
};

let appData = defaultData;
let pendingData = null;
let showAll = false;
let publicationComplete = false;

const $ = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const kg = (value, decimals = 2) => `${Number(value).toFixed(decimals).replace(".", ",")} kg`;

function loadSavedData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadGithubConfig() {
  try { return JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY)) || {}; } catch { return {}; }
}

function saveGithubConfig(config) {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

async function loadPublishedData() {
  const status = $("importStatus");
  try {
    const response = await fetch(`../dados.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const published = await response.json();
    validateData(published);
    appData = published;
    saveData(published);
    renderAll();
    status.className = "import-status success";
    status.textContent = `Dados publicados carregados: ${published.updatedAt}.`;
  } catch (error) {
    const cached = loadSavedData();
    if (cached) {
      appData = cached;
      renderAll();
      status.className = "import-status";
      status.textContent = "Sem acesso ao arquivo publicado. Exibindo a última versão salva neste navegador.";
    } else {
      appData = defaultData;
      renderAll();
      status.className = "import-status error";
      status.textContent = "Não foi possível carregar dados.json. Envie esse arquivo junto com o site.";
    }
  }
}

function validateData(data) {
  const errors = [];
  if (!data || typeof data !== "object") errors.push("dados ausentes");
  if (Number(data?.schemaVersion) !== 1) errors.push("schemaVersion deve ser 1");
  if (!data?.profile?.name) errors.push("nome ausente");
  ["initialWeightKg", "currentWeightKg", "targetWeightKg"].forEach(key => {
    if (!Number.isFinite(Number(data?.goal?.[key]))) errors.push(`${key} inválido`);
  });
  if (!Array.isArray(data?.weights) || data.weights.length < 1) errors.push("histórico de pesos ausente");
  if (!Array.isArray(data?.applications)) errors.push("aplicações inválidas");
  if (!Array.isArray(data?.weeks)) errors.push("semanas inválidas");
  if (!Array.isArray(data?.diary)) errors.push("diário inválido");
  if (errors.length) throw new Error(errors.join("; "));
}


function parseBrDate(value) {
  const [day, month, year] = String(value || "").split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatBrDate(date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function normalizedGoalHistory(data) {
  const history = Array.isArray(data?.goal?.history) ? data.goal.history.filter(Boolean) : [];
  return history.map(item => ({
    targetWeightKg: Number(item.targetWeightKg),
    startWeightKg: Number(item.startWeightKg),
    createdAt: item.createdAt || data.treatment?.startDate || data.updatedAt,
    achievedAt: item.achievedAt || null
  })).filter(item => Number.isFinite(item.targetWeightKg));
}

function currentGoalStage(data, current, target) {
  const history = normalizedGoalHistory(data);
  const configuredStart = Number(data?.goal?.stageStartWeightKg);
  let startWeight = Number.isFinite(configuredStart) ? configuredStart : Number(data?.goal?.initialWeightKg);
  let startDate = data?.goal?.stageStartDate || data?.treatment?.startDate || data?.updatedAt;

  if (!Number.isFinite(configuredStart) && history.length) {
    const latestAchieved = [...history].reverse().find(item => item.achievedAt);
    if (latestAchieved) {
      startWeight = latestAchieved.targetWeightKg;
      startDate = latestAchieved.achievedAt;
    }
  }

  if (!Number.isFinite(startWeight) || startWeight <= target) startWeight = Math.max(current, target);
  return { startWeight, startDate, history };
}

function renderGoalExtras(data, current, target, stage) {
  const estimate = $("goalEstimate");
  const historyBox = $("goalsHistory");
  const weights = Array.isArray(data.weights) ? data.weights : [];
  const stageStartDate = parseBrDate(stage.startDate);
  const stageWeights = weights.map(item => ({ date: parseBrDate(item.date), value: Number(item.valueKg) }))
    .filter(item => item.date && Number.isFinite(item.value) && (!stageStartDate || item.date >= stageStartDate));
  const recent = stageWeights.slice(-5);

  if (current <= target) {
    estimate.innerHTML = `<strong>Meta alcançada.</strong> Você chegou a ${kg(target)}.`;
  } else if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const elapsedWeeks = Math.max(1 / 7, (last.date - first.date) / 604800000);
    const weeklyLoss = (first.value - last.value) / elapsedWeeks;
    if (weeklyLoss > 0.05) {
      const weeksRemaining = Math.max(1, Math.ceil((current - target) / weeklyLoss));
      const estimateDate = addDays(last.date, weeksRemaining * 7);
      estimate.innerHTML = `Estimativa: <strong>${weeksRemaining} ${weeksRemaining === 1 ? "semana" : "semanas"}</strong> — por volta de <strong>${formatBrDate(estimateDate)}</strong>.`;
    } else {
      estimate.textContent = "Ainda não há ritmo de perda suficiente nesta nova etapa para calcular uma estimativa.";
    }
  } else {
    estimate.textContent = "A estimativa desta etapa aparecerá após pelo menos duas pesagens.";
  }

  historyBox.innerHTML = stage.history.length ? stage.history.map(item => {
    const achieved = Boolean(item.achievedAt);
    const status = achieved ? `Alcançada em ${escapeHtml(item.achievedAt)}` : `Criada em ${escapeHtml(item.createdAt)}`;
    return `<div class="goal-history-item${achieved ? " achieved" : ""}"><strong>${kg(item.targetWeightKg)}</strong><span>${status}</span></div>`;
  }).join("") : "";
}
function renderAll() {
  const d = appData;
  const initial = Number(d.goal.initialWeightKg);
  const current = Number(d.goal.currentWeightKg);
  const target = Number(d.goal.targetWeightKg);
  const loss = initial - current;
  const stage = currentGoalStage(d, current, target);
  const stageTotal = stage.startWeight - target;
  const stageLoss = stage.startWeight - current;
  const progress = stageTotal > 0 ? Math.max(0, Math.min(100, (stageLoss / stageTotal) * 100)) : (current <= target ? 100 : 0);
  const remaining = Math.max(0, current - target);

  $("siteTitle").textContent = d.title || "Acompanhamento com Tirzepatida";
  $("profileSubtitle").textContent = `${d.profile.name} • ${d.profile.age} anos • ${String(d.profile.heightM).replace(".", ",")} m`;
  $("updatedAt").textContent = `Atualizado em ${d.updatedAt}`;
  $("initialWeight").textContent = kg(initial);
  $("currentWeight").textContent = kg(current);
  $("totalLoss").textContent = kg(loss);
  $("goalWeight").textContent = kg(target);
  $("goalLabel").textContent = `Progresso até ${String(target).replace(".", ",")} kg`;
  $("goalPercent").textContent = `${progress.toFixed(1).replace(".", ",")}%`;
  $("remainingWeight").textContent = kg(remaining);
  $("progressBar").style.width = `${progress}%`;
  $("goalScaleStart").textContent = kg(stage.startWeight);
  $("goalScaleEnd").textContent = `${String(target).replace(".", ",")} kg`;
  renderGoalExtras(d, current, target, stage);

  const treatmentRows = [
    ["Medicamento", d.treatment.medication], ["Concentração", d.treatment.concentration],
    ["Dose semanal", d.treatment.weeklyDose], ["Início", d.treatment.startDate],
    ["Aplicações", `${d.applications.length} registradas`]
  ];
  $("treatmentDetails").innerHTML = treatmentRows.map(([k,v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("");

  $("timeline").innerHTML = d.applications.map((a, i) => `<article class="timeline-item"><div class="timeline-dot">${escapeHtml(a.number ?? i + 1)}</div><div><h3>${escapeHtml(a.number ?? i + 1)}ª aplicação</h3><p>${escapeHtml(a.date)} às ${escapeHtml(a.time)}</p><span>${escapeHtml(a.dose)} • ${escapeHtml(a.location)}</span></div></article>`).join("");

  $("weeksGrid").innerHTML = d.weeks.map(w => `<article class="week-card${w.current ? " current" : ""}"><div class="week-header"><span>${escapeHtml(w.title)}</span><strong>${escapeHtml(w.period)}</strong></div>${w.lines.map(line => { const idx = line.indexOf(":"); return idx > -1 ? `<p><b>${escapeHtml(line.slice(0, idx + 1))}</b>${escapeHtml(line.slice(idx + 1))}</p>` : `<p>${escapeHtml(line)}</p>`; }).join("")}</article>`).join("");

  $("generalObservation").textContent = d.generalObservation || "";
  $("medicalNotice").textContent = d.medicalNotice || "";
  $("footerText").textContent = `Acompanhamento iniciado em ${d.treatment.startDate}`;

  renderDiary();
  drawChart();
  renderWeightSummary();
}

function renderWeightSummary() {
  const weights = appData.weights;
  $("weightSummary").innerHTML = weights.slice(1).map((item, i) => {
    const delta = Number(item.valueKg) - Number(weights[i].valueKg);
    const sign = delta > 0 ? "+" : "";
    return `<span>${i + 1}ª semana: <b>${sign}${delta.toFixed(2).replace(".", ",")} kg</b></span>`;
  }).join("");
}

function renderDiary() {
  const list = showAll ? [...appData.diary].reverse() : appData.diary.slice(-5).reverse();
  $("diaryList").innerHTML = list.map(item => `<article class="diary-item"><button class="diary-toggle"><strong>${escapeHtml(item.date)}</strong><span>Ver detalhes</span></button><div class="diary-content"><div class="diary-grid"><div class="diary-field"><b>Refeições</b><p>${escapeHtml(item.meals)}</p></div><div class="diary-field"><b>Fome</b><p>${escapeHtml(item.hunger)}</p></div><div class="diary-field"><b>Efeitos</b><p>${escapeHtml(item.effects)}</p></div><div class="diary-field"><b>Observações</b><p>${escapeHtml(item.notes)}</p></div></div></div></article>`).join("");
  document.querySelectorAll(".diary-toggle").forEach(button => button.addEventListener("click", () => {
    const item = button.closest(".diary-item");
    item.classList.toggle("open");
    button.querySelector("span").textContent = item.classList.contains("open") ? "Ocultar" : "Ver detalhes";
  }));
}

function drawChart() {
  const canvas = $("weightChart");
  const wrap = canvas.closest(".chart-wrap");
  const weights = Array.isArray(appData.weights) ? appData.weights : [];
  if (!weights.length || !wrap) return;

  const minPointSpacing = 42;
  const visibleWidth = Math.max(320, wrap.clientWidth || 320);
  const cssWidth = Math.max(visibleWidth, 120 + (weights.length - 1) * minPointSpacing);
  const cssHeight = Math.max(280, wrap.clientHeight || 300);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const pad = { top: 42, right: 34, bottom: 54, left: 58 };
  const data = weights.map((w, index) => ({
    index,
    label: String(w.date || "").slice(0, 5),
    fullDate: String(w.date || ""),
    value: Number(w.valueKg)
  })).filter(item => Number.isFinite(item.value));
  if (!data.length) return;

  const values = data.map(item => item.value);
  const goalValues = [];
  const currentTarget = Number(appData?.goal?.targetWeightKg);
  if (Number.isFinite(currentTarget)) goalValues.push(currentTarget);
  const history = Array.isArray(appData?.goal?.history) ? appData.goal.history : [];
  history.forEach(item => {
    const target = Number(item?.targetWeightKg);
    if (Number.isFinite(target)) goalValues.push(target);
  });

  let min = Math.floor(Math.min(...values, ...goalValues) - 2);
  let max = Math.ceil(Math.max(...values, ...goalValues) + 2);
  if (min === max) { min -= 1; max += 1; }
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const xFor = index => data.length === 1 ? pad.left + chartW / 2 : pad.left + (index / (data.length - 1)) * chartW;
  const yFor = value => pad.top + ((max - value) / (max - min)) * chartH;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#667b78";
  ctx.strokeStyle = "#d8e3e1";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const value = min + (max - min) * (i / 5);
    const y = pad.top + chartH - (i / 5) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(value.toFixed(0), pad.left - 10, y);
  }

  const uniqueGoals = [...new Set(goalValues)].sort((a, b) => b - a);
  uniqueGoals.forEach(goal => {
    if (goal < min || goal > max) return;
    const y = yFor(goal);
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = "#8aa9a5";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#55716d";
    ctx.font = "700 11px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`Meta ${String(goal).replace(".", ",")} kg`, pad.left + 6, y - 4);
  });

  const points = data.map((item, index) => ({ ...item, x: xFor(index), y: yFor(item.value) }));
  const stageTargets = uniqueGoals;
  const colors = ["#0f766e", "#159a8c", "#3182a0", "#7a6bb7"];
  const colorForSegment = (a, b) => {
    const mid = (a.value + b.value) / 2;
    let stage = 0;
    for (const target of stageTargets) if (mid <= target) stage += 1;
    return colors[Math.min(stage, colors.length - 1)];
  };

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 4;
  for (let i = 1; i < points.length; i++) {
    ctx.strokeStyle = colorForSegment(points[i - 1], points[i]);
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  points.forEach((point, index) => {
    const isLast = index === points.length - 1;
    ctx.beginPath();
    ctx.fillStyle = isLast ? "#0f766e" : "#ffffff";
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = isLast ? 4 : 3;
    ctx.arc(point.x, point.y, isLast ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const maxLabels = Math.max(2, Math.floor(chartW / 85));
  const labelStep = Math.max(1, Math.ceil((data.length - 1) / (maxLabels - 1)));
  data.forEach((item, index) => {
    if (index !== 0 && index !== data.length - 1 && index % labelStep !== 0) return;
    const x = xFor(index);
    ctx.fillStyle = "#667b78";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(item.label, x, height - pad.bottom + 15);
  });

  const last = points[points.length - 1];
  ctx.fillStyle = "#17312f";
  ctx.font = "700 12px system-ui";
  ctx.textAlign = last.x > width - 110 ? "right" : "left";
  ctx.textBaseline = "bottom";
  const labelX = last.x > width - 110 ? last.x - 10 : last.x + 10;
  ctx.fillText(`${last.value.toFixed(2).replace(".", ",")} kg (atual)`, labelX, last.y - 9);

  canvas.__chartPoints = points;
  if (!canvas.__tooltipBound) {
    const showTooltip = event => {
      const rect = canvas.getBoundingClientRect();
      const clientX = event.touches?.[0]?.clientX ?? event.clientX;
      const clientY = event.touches?.[0]?.clientY ?? event.clientY;
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const candidates = canvas.__chartPoints || [];
      let nearest = null;
      let distance = Infinity;
      candidates.forEach(point => {
        const d = Math.hypot(point.x - x, point.y - y);
        if (d < distance) { nearest = point; distance = d; }
      });
      if (!nearest || distance > 28) return;
      let tooltip = wrap.querySelector(".chart-tooltip");
      if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.className = "chart-tooltip";
        wrap.appendChild(tooltip);
      }
      tooltip.innerHTML = `<strong>${nearest.value.toFixed(2).replace(".", ",")} kg</strong><span>${escapeHtml(nearest.fullDate)}</span>`;
      const left = Math.min(Math.max(nearest.x - 55, 8), canvas.offsetWidth - 118);
      const top = Math.max(8, nearest.y - 66);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add("show");
      clearTimeout(canvas.__tooltipTimer);
      canvas.__tooltipTimer = setTimeout(() => tooltip.classList.remove("show"), 2600);
    };
    canvas.addEventListener("click", showTooltip);
    canvas.addEventListener("touchstart", showTooltip, { passive: true });
    canvas.__tooltipBound = true;
  }

  if (!wrap.dataset.initialScrollDone && width > visibleWidth) {
    wrap.scrollLeft = width - visibleWidth;
    wrap.dataset.initialScrollDone = "1";
  }
}
async function extractPdfText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }
  return text;
}

function decodeBase64Utf8(value) {
  const normalized = value.replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function parsePdfPayload(text) {
  const start = text.indexOf(PDF_START);
  const end = text.indexOf(PDF_END);
  if (start === -1 || end === -1 || end <= start) throw new Error("Bloco TirzeTrack não encontrado no PDF.");
  const payload = text.slice(start + PDF_START.length, end).replace(/[^A-Za-z0-9+/=]/g, "");
  if (!payload) throw new Error("Bloco de dados vazio.");
  const data = JSON.parse(decodeBase64Utf8(payload));
  validateData(data);
  return data;
}

async function handlePdfImport(file) {
  const status = $("importStatus");
  publicationComplete = false;
  $("publishButton").textContent = "Publicar atualização";
  status.className = "import-status loading";
  status.textContent = `Lendo ${file.name}...`;
  $("publishButton").disabled = true;
  try {
    publicationComplete = false;
    $("publishButton").textContent = "Publicar atualização";
    const text = await extractPdfText(file);
    const imported = parsePdfPayload(text);
    pendingData = imported;
    appData = imported;
    renderAll();
    $("publishButton").disabled = false;
    status.className = "import-status success";
    status.textContent = `Relatório validado: ${imported.updatedAt}. Toque em Publicar atualização.`;
  } catch (error) {
    pendingData = null;
    console.error(error);
    status.className = "import-status error";
    status.textContent = `Não foi possível importar: ${error.message}`;
  }
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function githubRequest(url, options, token) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.headers || {})
    }
  });
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json()).message || ""; } catch {}
    throw new Error(`${response.status} ${detail || response.statusText}`.trim());
  }
  return response.status === 204 ? null : response.json();
}

async function publishPendingData() {
  if (!pendingData) return;

  const status = $("importStatus");
  const button = $("publishButton");
  const config = loadGithubConfig();
  const required = ["owner", "repo", "branch", "path", "token"];

  if (required.some(key => !config[key])) {
    $("adminPanel").classList.remove("hidden");
    status.className = "import-status error";
    status.textContent = "Preencha e salve a configuração do GitHub antes de publicar.";
    return;
  }

  status.className = "import-status loading";
  status.textContent = "Publicando o relatório no GitHub...";
  button.disabled = true;

  const encodedPath = config.path.split("/").map(encodeURIComponent).join("/");
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;

  async function getCurrentSha() {
    try {
      const current = await githubRequest(
        `${apiUrl}?ref=${encodeURIComponent(config.branch)}`,
        { method: "GET", cache: "no-store" },
        config.token
      );
      return current.sha;
    } catch (error) {
      if (String(error.message).startsWith("404")) return undefined;
      throw error;
    }
  }

  async function sendUpdate(sha) {
    const body = {
      message: `Atualiza relatório TirzeTrack - ${pendingData.updatedAt}`,
      content: utf8ToBase64(JSON.stringify(pendingData, null, 2)),
      branch: config.branch,
      ...(sha ? { sha } : {})
    };

    return githubRequest(
      apiUrl,
      {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      },
      config.token
    );
  }

  try {
    let sha = await getCurrentSha();

    try {
      await sendUpdate(sha);
    } catch (error) {
      if (!String(error.message).startsWith("409")) throw error;
      status.textContent = "Atualizando a versão do arquivo e tentando novamente...";
      sha = await getCurrentSha();
      await sendUpdate(sha);
    }

    saveData(pendingData);
    appData = pendingData;
    pendingData = null;
    publicationComplete = true;

    button.disabled = false;
    button.textContent = "Ir para o site";
    status.className = "import-status success";
    status.textContent = "Relatório publicado com sucesso. O site pode levar alguns instantes para atualizar em outros dispositivos.";
  } catch (error) {
    console.error(error);
    button.disabled = false;
    status.className = "import-status error";
    status.textContent = `Falha ao publicar: ${error.message}`;
  }
}


async function setNewGoal() {
  const input = $("newGoalWeight");
  const newTarget = Number(String(input.value).replace(",", "."));
  if (!Number.isFinite(newTarget) || newTarget < 30 || newTarget > 300) {
    $("importStatus").className = "import-status error";
    $("importStatus").textContent = "Informe uma nova meta válida entre 30 e 300 kg.";
    return;
  }

  const base = pendingData ? structuredClone(pendingData) : structuredClone(appData);
  const current = Number(base.goal.currentWeightKg);
  const oldTarget = Number(base.goal.targetWeightKg);
  const history = normalizedGoalHistory(base);
  const alreadyStored = history.some(item => Math.abs(item.targetWeightKg - oldTarget) < 0.001);
  if (!alreadyStored) {
    history.push({
      targetWeightKg: oldTarget,
      createdAt: base.treatment?.startDate || base.updatedAt,
      achievedAt: current <= oldTarget ? base.updatedAt : null
    });
  } else if (current <= oldTarget) {
    const old = history.find(item => Math.abs(item.targetWeightKg - oldTarget) < 0.001);
    if (old && !old.achievedAt) old.achievedAt = base.updatedAt;
  }

  base.goal.history = history;
  base.goal.stageStartWeightKg = current <= oldTarget ? oldTarget : current;
  base.goal.stageStartDate = base.updatedAt;
  base.goal.targetWeightKg = newTarget;
  pendingData = base;
  appData = base;
  renderAll();
  input.value = "";
  $("publishButton").disabled = false;
  $("publishButton").textContent = "Publicar atualização";
  publicationComplete = false;
  $("importStatus").className = "import-status loading";
  $("importStatus").textContent = `Salvando a nova meta de ${kg(newTarget)}...`;

  // Publica imediatamente para que a nova meta permaneça após atualizar a página.
  await publishPendingData();
}

function fillGithubForm() {
  const config = loadGithubConfig();
  const pagesOwner = location.hostname.endsWith("github.io") ? location.hostname.split(".")[0] : "";
  const pagesRepo = location.hostname.endsWith("github.io") ? location.pathname.split("/").filter(Boolean)[0] || "" : "";
  $("githubOwner").value = config.owner || pagesOwner;
  $("githubRepo").value = config.repo || pagesRepo;
  $("githubBranch").value = config.branch || "main";
  $("githubPath").value = config.path || "dados.json";
  $("githubToken").value = config.token || "";
}

function persistGithubForm() {
  const config = {
    owner: $("githubOwner").value.trim(),
    repo: $("githubRepo").value.trim(),
    branch: $("githubBranch").value.trim() || "main",
    path: $("githubPath").value.trim() || "dados.json",
    token: $("githubToken").value.trim()
  };
  if (!config.owner || !config.repo || !config.token) {
    $("importStatus").className = "import-status error";
    $("importStatus").textContent = "Informe usuário, repositório e token.";
    return;
  }
  saveGithubConfig(config);
  $("adminPanel").classList.add("hidden");
  $("importStatus").className = "import-status success";
  $("importStatus").textContent = "Configuração do GitHub salva neste navegador.";
}

$("toggleAll").addEventListener("click", event => {
  showAll = !showAll;
  event.currentTarget.textContent = showAll ? "Mostrar recentes" : "Mostrar todos";
  renderDiary();
});

$("pdfInput").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) handlePdfImport(file);
  event.target.value = "";
});

$("publishButton").addEventListener("click", () => {
  if (publicationComplete) {
    window.location.href = "../";
    return;
  }
  publishPendingData();
});
$("openAdmin").addEventListener("click", () => { fillGithubForm(); $("adminPanel").classList.remove("hidden"); });
$("closeAdmin").addEventListener("click", () => $("adminPanel").classList.add("hidden"));
$("saveGithubConfig").addEventListener("click", persistGithubForm);
$("setNewGoal").addEventListener("click", setNewGoal);

window.addEventListener("resize", () => {
  clearTimeout(window.__chartTimer);
  window.__chartTimer = setTimeout(drawChart, 150);
});

fillGithubForm();
loadPublishedData();
