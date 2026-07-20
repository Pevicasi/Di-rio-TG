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
    const response = await fetch(`dados.json?v=${Date.now()}`, { cache: "no-store" });
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
    createdAt: item.createdAt || data.treatment?.startDate || data.updatedAt,
    achievedAt: item.achievedAt || null
  })).filter(item => Number.isFinite(item.targetWeightKg));
}

function renderGoalExtras(data, current, target) {
  const estimate = $("goalEstimate");
  const historyBox = $("goalsHistory");
  const weights = Array.isArray(data.weights) ? data.weights : [];
  const recent = weights.slice(-5).map(item => ({ date: parseBrDate(item.date), value: Number(item.valueKg) }))
    .filter(item => item.date && Number.isFinite(item.value));

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
      estimate.textContent = "Ainda não há ritmo de perda suficiente para calcular uma estimativa.";
    }
  } else {
    estimate.textContent = "A estimativa aparecerá após pelo menos duas pesagens.";
  }

  const history = normalizedGoalHistory(data);
  historyBox.innerHTML = history.length ? history.map(item => {
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
  const totalGoal = initial - target;
  const progress = totalGoal > 0 ? Math.max(0, Math.min(100, (loss / totalGoal) * 100)) : 0;
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
  $("goalScaleStart").textContent = kg(initial);
  $("goalScaleEnd").textContent = `${String(target).replace(".", ",")} kg`;
  renderGoalExtras(d, current, target);

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
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const width = rect.width, height = rect.height;
  const pad = { top: 38, right: 28, bottom: 50, left: 58 };
  const data = appData.weights.map(w => ({ label: w.date.slice(0, 5), value: Number(w.valueKg) }));
  const values = data.map(d => d.value);
  let min = Math.floor(Math.min(...values) - 2), max = Math.ceil(Math.max(...values) + 2);
  if (min === max) { min -= 1; max += 1; }
  const chartW = width - pad.left - pad.right, chartH = height - pad.top - pad.bottom;
  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#667b78"; ctx.strokeStyle = "#d8e3e1"; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const value = min + (max - min) * (i / 5);
    const y = pad.top + chartH - (i / 5) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(value.toFixed(0), pad.left - 10, y);
  }
  const points = data.map((item, index) => ({ ...item, x: data.length === 1 ? pad.left + chartW/2 : pad.left + (index/(data.length-1))*chartW, y: pad.top + ((max-item.value)/(max-min))*chartH }));
  ctx.strokeStyle = "#0f766e"; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
  points.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
  points.forEach(p => {
    ctx.beginPath(); ctx.fillStyle="#fff"; ctx.strokeStyle="#0f766e"; ctx.lineWidth=4; ctx.arc(p.x,p.y,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle="#17312f"; ctx.font="700 12px system-ui"; ctx.textAlign="center"; ctx.textBaseline="bottom"; ctx.fillText(`${p.value.toFixed(2).replace(".",",")} kg`, p.x, p.y-12);
    ctx.fillStyle="#667b78"; ctx.font="12px system-ui"; ctx.textBaseline="top"; ctx.fillText(p.label,p.x,height-pad.bottom+14);
  });
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
  status.className = "import-status loading";
  status.textContent = `Lendo ${file.name}...`;
  $("publishButton").disabled = true;
  try {
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
  const config = loadGithubConfig();
  const required = ["owner", "repo", "branch", "path", "token"];
  if (required.some(key => !config[key])) {
    $("adminPanel").classList.remove("hidden");
    status.className = "import-status error";
    status.textContent = "Preencha e salve a configuração do GitHub antes de publicar.";
    return;
  }

  status.className = "import-status loading";
  status.textContent = "Publicando dados no GitHub...";
  $("publishButton").disabled = true;
  const encodedPath = config.path.split("/").map(encodeURIComponent).join("/");
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;

  try {
    let sha;
    try {
      const current = await githubRequest(`${apiUrl}?ref=${encodeURIComponent(config.branch)}`, { method: "GET" }, config.token);
      sha = current.sha;
    } catch (error) {
      if (!String(error.message).startsWith("404")) throw error;
    }

    const body = {
      message: `Atualiza relatório TirzeTrack - ${pendingData.updatedAt}`,
      content: utf8ToBase64(JSON.stringify(pendingData, null, 2)),
      branch: config.branch,
      ...(sha ? { sha } : {})
    };
    await githubRequest(apiUrl, { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }, config.token);
    saveData(pendingData);
    appData = pendingData;
    pendingData = null;
    status.className = "import-status success";
    status.textContent = "Atualização publicada no GitHub. O site já mostra os novos dados; o GitHub Pages pode levar alguns instantes para liberar o novo dados.json para outros aparelhos.";
  } catch (error) {
    console.error(error);
    $("publishButton").disabled = false;
    status.className = "import-status error";
    status.textContent = `Falha ao publicar: ${error.message}`;
  }
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


window.addEventListener("resize", () => {
  clearTimeout(window.__chartTimer);
  window.__chartTimer = setTimeout(drawChart, 150);
});

loadPublishedData();
