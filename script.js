
const diaryData = [
  {
    date: "06/07/2026",
    meals: "09:30: pesagem inicial; 20:00: jantar normal.",
    hunger: "Fome intensa à tarde, menor no jantar e forte vontade de comer às 22:39.",
    effects: "Leve dor de cabeça e boca muito seca.",
    notes: "1ª aplicação às 10:00, no lado esquerdo do umbigo."
  },
  {
    date: "07/07/2026",
    meals: "14:00: primeira refeição após longo jejum, em quantidade menor que a habitual.",
    hunger: "Fome forte antes do almoço.",
    effects: "Muita sede, salivação durante o sono, estufamento e arrotos com odor.",
    notes: "Dia com os sintomas digestivos mais marcantes."
  },
  {
    date: "08/07/2026",
    meals: "Almoço com carne, legumes e banana; jantar com talharim, carne e legumes.",
    hunger: "Menor que no dia anterior; jantar mais por vontade de comer.",
    effects: "Sem estufamento após o almoço.",
    notes: "Início de melhora clara dos sintomas."
  },
  {
    date: "09/07/2026",
    meals: "Pão com ovo; almoço; macarrão com frango e legumes; pão com frango e chá.",
    hunger: "Pouca fome ao acordar, moderada no jantar e lanche noturno por vontade.",
    effects: "Salivação muito menor e sem desconforto relevante.",
    notes: "Porções em torno de 40% a 50% do padrão anterior."
  },
  {
    date: "10/07/2026",
    meals: "Pão de queijo; almoço; pão doce com ovo e mortadela; pão doce com mortadela.",
    hunger: "Leve fome antes do almoço; demais refeições sem fome ou por vontade.",
    effects: "Sem efeitos relevantes.",
    notes: "Apetite já bastante reduzido."
  },
  {
    date: "11/07/2026",
    meals: "13:40: almoço; 21:15: jantar semelhante ao almoço.",
    hunger: "Sem fome antes das refeições.",
    effects: "Sem efeitos relevantes.",
    notes: "Comeu as refeições completas apesar da ausência de fome."
  },
  {
    date: "12/07/2026",
    meals: "Bebida láctea; frango, batatas, talharim e legumes; jantar semelhante.",
    hunger: "Sem fome.",
    effects: "Salivação excessiva considerada resolvida.",
    notes: "Fim da 1ª semana com boa adaptação."
  },
  {
    date: "13/07/2026",
    meals: "Feijão, macarrão, abóbora e verduras; pão francês com ovo e mortadela.",
    hunger: "Sem fome.",
    effects: "Dor de garganta, sem efeitos digestivos importantes.",
    notes: "Peso 113,95 kg. 2ª aplicação às 18:50."
  },
  {
    date: "14/07/2026",
    meals: "Pão de queijo; frango, batatas e legumes; frango, tomate e banana.",
    hunger: "Sem fome durante todo o dia.",
    effects: "Boca seca e garganta melhorando.",
    notes: "2ª aplicação melhor tolerada."
  },
  {
    date: "15/07/2026",
    meals: "Pão francês com mortadela; frango grelhado, legumes e vinagrete; jantar semelhante.",
    hunger: "Sem fome.",
    effects: "Sem efeitos colaterais.",
    notes: "Dia estável."
  },
  {
    date: "16/07/2026",
    meals: "14:10: almoço; 20:00: jantar.",
    hunger: "Não informado.",
    effects: "Sem efeitos colaterais.",
    notes: "Dia corrido; registro apenas dos horários."
  },
  {
    date: "17/07/2026",
    meals: "Bolinhos de caco e salsicha; carne moída, banana e legumes; jantar semelhante.",
    hunger: "Sem fome durante todo o dia.",
    effects: "Sem efeitos colaterais.",
    notes: "Boa tolerância e controle do apetite."
  },
  {
    date: "18/07/2026",
    meals: "Pão carteira com omelete; omelete com batata assada; 2 bolinhos de caco.",
    hunger: "Sem fome.",
    effects: "Sem efeitos colaterais.",
    notes: "Lanche noturno feito mesmo sem fome."
  },
  {
    date: "19/07/2026",
    meals: "Banana, pão com fiambre e bolinho de caco; pipoca; omelete com legumes.",
    hunger: "Um pouco de fome às 16:30.",
    effects: "Sem efeitos colaterais.",
    notes: "Primeiro episódio de fome em vários dias."
  },
  {
    date: "20/07/2026",
    meals: "14:15: frango, batata, cenoura, chuchu, cebola e pimentão.",
    hunger: "Sem fome.",
    effects: "Sem efeitos colaterais.",
    notes: "Peso 111,30 kg. 3ª aplicação às 15:15, abaixo do umbigo."
  }
];

const diaryList = document.getElementById("diaryList");
let showAll = false;

function renderDiary() {
  diaryList.innerHTML = "";
  const visible = showAll ? diaryData : diaryData.slice(-5).reverse();

  visible.forEach((item) => {
    const article = document.createElement("article");
    article.className = "diary-item";
    article.innerHTML = `
      <button class="diary-toggle">
        <strong>${item.date}</strong>
        <span>Ver detalhes</span>
      </button>
      <div class="diary-content">
        <div class="diary-grid">
          <div class="diary-field"><b>Refeições</b><p>${item.meals}</p></div>
          <div class="diary-field"><b>Fome</b><p>${item.hunger}</p></div>
          <div class="diary-field"><b>Efeitos</b><p>${item.effects}</p></div>
          <div class="diary-field"><b>Observações</b><p>${item.notes}</p></div>
        </div>
      </div>
    `;
    article.querySelector(".diary-toggle").addEventListener("click", () => {
      article.classList.toggle("open");
      article.querySelector(".diary-toggle span").textContent =
        article.classList.contains("open") ? "Ocultar" : "Ver detalhes";
    });
    diaryList.appendChild(article);
  });
}

document.getElementById("toggleAll").addEventListener("click", (event) => {
  showAll = !showAll;
  event.currentTarget.textContent = showAll ? "Mostrar recentes" : "Mostrar todos";
  renderDiary();
});

function drawChart() {
  const canvas = document.getElementById("weightChart");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const pad = { top: 34, right: 24, bottom: 46, left: 52 };

  const data = [
    { label: "06/07", value: 117.50 },
    { label: "13/07", value: 113.95 },
    { label: "20/07", value: 111.30 }
  ];

  const min = 109;
  const max = 119;
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

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

  const points = data.map((item, index) => {
    const x = pad.left + (index / (data.length - 1)) * chartW;
    const y = pad.top + ((max - item.value) / (max - min)) * chartH;
    return { ...item, x, y };
  });

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  points.forEach((point) => {
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 4;
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#17312f";
    ctx.font = "700 12px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${point.value.toFixed(2).replace(".", ",")} kg`, point.x, point.y - 12);

    ctx.fillStyle = "#667b78";
    ctx.font = "12px system-ui";
    ctx.textBaseline = "top";
    ctx.fillText(point.label, point.x, height - pad.bottom + 14);
  });
}

renderDiary();
drawChart();

window.addEventListener("resize", () => {
  clearTimeout(window.__chartTimer);
  window.__chartTimer = setTimeout(drawChart, 150);
});
