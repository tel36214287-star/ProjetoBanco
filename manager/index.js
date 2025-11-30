(function() {
/* ---------- Estado ---------- */
let categorias = [];
let valores = [];
let backgroundColors = [];

/* ---------- Persistência ---------- */
function salvarLocalStorage() {
  localStorage.setItem('dadosFinanceiros', JSON.stringify({ categorias, valores }));
  localStorage.setItem('temaMoneyControl', document.body.className);
}
function carregarLocalStorage() {
  const dados = JSON.parse(localStorage.getItem('dadosFinanceiros'));
  if (dados) { categorias = dados.categorias || []; valores = dados.valores || []; }
  const temaSalvo = localStorage.getItem('temaMoneyControl');
  if (temaSalvo) { document.body.className = temaSalvo; }
}
carregarLocalStorage();

/* ---------- Paletas por tema ---------- */
const paletasPorTema = {
  'theme-valentine': [
    '#ff2e63','#ff5a8a','#ff9db8','#ffb3c6',
    '#c74b7c','#ff6f91','#b31b3f','#7a0f29'
  ],
  'theme-halloween': [
    '#ff7a00','#f4c27a','#6a1b9a','#4a148c',
    '#8e24aa','#c04300','#ffd166','#2d1b46'
  ],
  'theme-brasil': [
    '#009b3a','#ffdf00','#002776','#00c851',
    '#ffd166','#0050a0','#7ab800','#003366'
  ]
};

/* ---------- Gráfico ---------- */
const ctx = document.getElementById('graficoPizza').getContext('2d');
const grafico = new Chart(ctx, {
  type: 'pie',
  data: { labels: categorias, datasets: [{ data: valores, backgroundColor: backgroundColors }] },
  options: {
    responsive: true,
    animation: { animateScale: true, animateRotate: true },
    plugins: {
      legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).getPropertyValue('--subtext').trim() } },
      title: { display: true, text: 'Distribuição de Gastos', color: getComputedStyle(document.body).getPropertyValue('--accent').trim(), font: { size: 18 } },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a,b)=>a+b,0);
            const value = context.raw;
            const percent = total ? ((value/total)*100).toFixed(1) : '0.0';
            return `${context.label}: ${formatarMoeda(value)} (${percent}%)`;
          }
        }
      }
    }
  }
});

/* ---------- Funções util ---------- */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function mostrarErro(msg) {
  const erroDiv = document.getElementById('erro');
  erroDiv.textContent = msg;
  setTimeout(() => erroDiv.textContent = '', 3000);
}
function paletaAtual() {
  const tema = document.body.className || 'theme-halloween';
  return paletasPorTema[tema] || paletasPorTema['theme-halloween'];
}
function rebuildBackgroundColors() {
  const paleta = paletaAtual();
  backgroundColors = categorias.map((_, i) => paleta[i % paleta.length]);
}

/* ---------- CRUD ---------- */
function atualizarLista() {
  const lista = document.getElementById('lista');
  lista.innerHTML = '';
  let total = 0;
  categorias.forEach((cat,i) => {
    const li = document.createElement('li');
    li.textContent = `${cat}: ${formatarMoeda(valores[i])}`;
    const removeBtn = document.createElement('span');
    removeBtn.textContent = '✖';
    removeBtn.classList.add('remove');
    removeBtn.onclick = () => removerDado(i);
    li.appendChild(removeBtn);
    lista.appendChild(li);
    total += valores[i];
  });
  document.getElementById('total').textContent = `Total: ${formatarMoeda(total)}`;
}

function adicionarDados() {
  const categoria = document.getElementById('categoria').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  if(!categoria || isNaN(valor)){
    mostrarErro("⚠️ Preencha categoria e valor corretamente.");
    return;
  }
  categorias.push(categoria);
  valores.push(valor);
  rebuildBackgroundColors();
  salvarLocalStorage();
  atualizarGrafico();
  document.getElementById('categoria').value = '';
  document.getElementById('valor').value = '';
}

function removerDado(index) {
  categorias.splice(index,1);
  valores.splice(index,1);
  rebuildBackgroundColors();
  salvarLocalStorage();
  atualizarGrafico();
}

function resetarDados() {
  if(confirm("Deseja realmente resetar todos os dados?")) {
    categorias = [];
    valores = [];
    rebuildBackgroundColors();
    salvarLocalStorage();
    atualizarGrafico();
  }
}

/* ---------- Tema ---------- */
const selectTema = document.getElementById('tema');
function aplicarTema(classeTema) {
  document.body.className = classeTema;
  salvarLocalStorage();
  // atualizar paleta e estilos do gráfico
  rebuildBackgroundColors();
  grafico.data.datasets[0].backgroundColor = backgroundColors;
  grafico.options.plugins.legend.labels.color = getComputedStyle(document.body).getPropertyValue('--subtext').trim();
  grafico.options.plugins.title.color = getComputedStyle(document.body).getPropertyValue('--accent').trim();
  grafico.update();
}
selectTema.value = document.body.className || 'theme-halloween';
selectTema.addEventListener('change', (e) => aplicarTema(e.target.value));

/* ---------- UX extra ---------- */
document.getElementById('valor').addEventListener('keypress', e => {
  if(e.key === 'Enter') adicionarDados();
});

/* ---------- Som de clique ---------- */
const somClique = new Audio('Bell.ogg'); // coloque o arquivo na mesma pasta
document.querySelectorAll('button').forEach(botao => {
  botao.addEventListener('click', () => {
    somClique.currentTime = 0;
    somClique.play();
  });
});

/* ---------- Exportação PDF ---------- */
async function salvarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const content = document.body;
  const canvas = await html2canvas(content);
  const imgData = canvas.toDataURL('image/png');

  const imgWidth = 210; 
  const pageHeight = 295;  
  const imgHeight = canvas.height * imgWidth / canvas.width;
  let heightLeft = imgHeight;

  let position = 0;

  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  doc.save('money_control.pdf');
}

/* ---------- Boot ---------- */
rebuildBackgroundColors();
function atualizarGrafico() {
  atualizarLista();
  grafico.data.labels = categorias;
  grafico.data.datasets[0].data = valores;
  grafico.data.datasets[0].backgroundColor = backgroundColors;
  grafico.update();
}
atualizarGrafico();
})();