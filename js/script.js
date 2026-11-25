/* ==========================================================
   AquaBrilho — site do lava-rápido
   Serviços com preço por porte, galeria antes/depois e
   agendamento com vagas por horário (localStorage).
   ========================================================== */

// ---------- Configuração ----------
const WHATSAPP = '5551999999999'; // troque pelo número real
const BOXES = 2;                  // carros atendidos ao mesmo tempo
const TAXA_LEVA_TRAZ = 20;
const HORARIOS = {               // dia da semana: [abre, última entrada]
  1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 13]
};
const ENTRADA_MAX_SERVICO_LONGO = 13; // serviços de 4h+ precisam entrar até 13h

const PACOTES = [
  { id: 'simples', nome: 'Lavagem simples', tempo: '40 min', horas: 1, preco: { pequeno: 50, grande: 65 },
    itens: ['Lavagem externa com shampoo neutro', 'Secagem com microfibra', 'Pretinho nos pneus', 'Aspiração rápida'] },
  { id: 'completa', nome: 'Lavagem completa', tempo: '1h', horas: 1, destaque: 'Mais pedida', preco: { pequeno: 80, grande: 100 },
    itens: ['Tudo da lavagem simples', 'Aspiração completa', 'Limpeza de painel e plásticos', 'Vidros por dentro', 'Cera líquida protetora'] },
  { id: 'polimento', nome: 'Polimento + cera', tempo: '4h', horas: 4, preco: { pequeno: 250, grande: 320 },
    itens: ['Lavagem completa', 'Descontaminação da pintura', 'Polimento que tira riscos leves', 'Cera de carnaúba'] },
  { id: 'higienizacao', nome: 'Higienização interna', tempo: '5h', horas: 5, preco: { pequeno: 220, grande: 280 },
    itens: ['Extração em bancos e carpetes', 'Limpeza do teto e portas', 'Hidratação de couro ou tecido', 'Ozônio contra odores'] },
  { id: 'vitrificacao', nome: 'Vitrificação de pintura', tempo: '1 dia', horas: 8, preco: { pequeno: 900, grande: 1200 },
    itens: ['Polimento técnico completo', 'Vitrificador com proteção de até 3 anos', 'Brilho e repelência à água', 'Certificado de aplicação'] }
];

// Galeria: troque "antes"/"depois" pelos caminhos das suas fotos (ex.: 'img/civic-antes.jpg').
// Enquanto estiverem vazios, o site desenha uma ilustração no lugar.
const GALERIA = [
  { titulo: 'Lavagem completa', legenda: 'Hatch prata depois de uma semana de chuva', desenho: 'externo', cor: '#b9c2cf', antes: '', depois: '' },
  { titulo: 'Polimento + cera', legenda: 'Sedã preto com marcas de lavagem automática', desenho: 'externo', cor: '#1d2230', antes: '', depois: '' },
  { titulo: 'Higienização interna', legenda: 'Banco de tecido com manchas de café', desenho: 'banco', cor: '#5a6478', antes: '', depois: '' },
  { titulo: 'Revitalização de faróis', legenda: 'Faróis amarelados e opacos', desenho: 'farol', cor: '#c9302c', antes: '', depois: '' }
];

// ---------- Utilitários ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pad = (n) => String(n).padStart(2, '0');
const chave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deChave = (k) => { const [a, m, d] = k.split('-').map(Number); return new Date(a, m - 1, d); };
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hash(texto) {
  // FNV-1a com mistura final: espalha bem os valores
  let h = 2166136261;
  for (const c of texto) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return h >>> 0;
}

const banco = {
  ler() { try { return JSON.parse(localStorage.getItem('aquabrilho_agenda')) || []; } catch { return []; } },
  salvar(v) { try { localStorage.setItem('aquabrilho_agenda', JSON.stringify(v)); } catch { /* sem storage */ } }
};
let agenda = banco.ler();
let porte = 'pequeno';

// ---------- Menu mobile ----------
$('#menu-btn').addEventListener('click', () => {
  const aberto = $('#menu').classList.toggle('aberto');
  $('#menu-btn').setAttribute('aria-expanded', aberto);
});
$$('#menu a').forEach((a) => a.addEventListener('click', () => {
  $('#menu').classList.remove('aberto'); $('#menu-btn').setAttribute('aria-expanded', false);
}));

// ---------- Links de WhatsApp ----------
const linkWhats = (msg) => `https://wa.me/${WHATSAPP}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
$('#link-whats').href = linkWhats('Olá! Quero saber mais sobre os serviços.');
$('#whats-flutuante').href = linkWhats('Olá! Quero agendar uma lavagem.');

// ---------- Bolhas do hero ----------
(function bolhas() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const alvo = $('#bolhas');
  alvo.innerHTML = Array.from({ length: 16 }, (_, i) => {
    const t = 10 + (i * 7) % 26, x = (i * 37) % 100, dur = 5 + (i % 5), atraso = (i * 0.7) % 6, dx = ((i % 3) - 1) * 30;
    return `<span class="bolha" style="width:${t}px;height:${t}px;left:${x}%;animation-duration:${dur}s;animation-delay:-${atraso}s;--x:${dx}px"></span>`;
  }).join('');
})();

// ---------- Pacotes ----------
function renderPacotes() {
  $('#pacotes').innerHTML = PACOTES.map((p) => `
    <article class="pacote ${p.destaque ? 'pacote--destaque' : ''}">
      ${p.destaque ? `<span class="pacote__fita">${p.destaque}</span>` : ''}
      <h3>${p.nome}</h3>
      <p class="tempo">Duração: ${p.tempo}</p>
      <p class="preco">${brl(p.preco[porte])}</p>
      <ul>${p.itens.map((i) => `<li>${i}</li>`).join('')}</ul>
      <button class="btn btn--linha" data-escolher="${p.id}">Agendar este</button>
    </article>`).join('');
}
$('.porte').addEventListener('click', (e) => {
  const b = e.target.closest('.porte__btn'); if (!b) return;
  porte = b.dataset.porte;
  $$('.porte__btn').forEach((x) => { x.classList.toggle('ativo', x === b); x.setAttribute('aria-checked', x === b); });
  $('#f-porte').value = porte;
  renderPacotes(); renderTicket();
});
$('#pacotes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-escolher]'); if (!b) return;
  $('#f-pacote').value = b.dataset.escolher; $('#f-porte').value = porte;
  renderHorarios(); renderTicket();
  $('#agendar').scrollIntoView({ behavior: 'smooth' });
});

// ---------- Ilustrações da galeria ----------
function ilustracao(tipo, cor, limpo) {
  const sujeira = limpo ? '' : `
    <g fill="#6b4f2a" opacity=".55">
      ${Array.from({ length: 26 }, (_, i) => `<circle cx="${40 + (i * 53) % 330}" cy="${120 + (i * 29) % 130}" r="${3 + (i % 5) * 2}"/>`).join('')}
    </g>`;
  const fundo = `<rect width="400" height="300" fill="${limpo ? '#dfe9ff' : '#cfc8bb'}"/><rect y="230" width="400" height="70" fill="${limpo ? '#9fb0d4' : '#8d8577'}"/>`;
  const brilho = limpo ? `<g fill="#fff"><path d="M300 70 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5z"/><path d="M90 110 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/></g>` : '';

  if (tipo === 'banco') {
    const manchas = limpo ? '' : `<g fill="#5b3a1e" opacity=".45"><ellipse cx="185" cy="205" rx="34" ry="18"/><ellipse cx="230" cy="120" rx="20" ry="26"/><ellipse cx="160" cy="150" rx="12" ry="9"/></g>`;
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">${fundo}
      <path d="M130 40 Q200 20 270 40 L285 175 Q200 190 115 175 Z" fill="${cor}"/>
      <path d="M150 60 L250 60 M145 95 L255 95 M140 130 L260 130" stroke="#000" stroke-opacity=".15" stroke-width="3"/>
      <path d="M95 185 Q200 160 305 185 L315 245 Q200 262 85 245 Z" fill="${cor}" style="filter:brightness(.9)"/>
      ${manchas}${limpo ? '<path d="M150 50 Q190 40 220 45" stroke="#fff" stroke-opacity=".5" stroke-width="6" fill="none" stroke-linecap="round"/>' : ''}${brilho}</svg>`;
  }
  if (tipo === 'farol') {
    const lente = limpo ? '#eaf6ff' : '#d9b85e';
    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="${cor}"/>
      <path d="M40 90 Q200 40 360 100 L340 220 Q200 250 60 210 Z" fill="#1a1c22"/>
      <path d="M60 100 Q200 60 340 110 L325 205 Q200 232 75 200 Z" fill="${lente}" opacity="${limpo ? 1 : .85}"/>
      <circle cx="140" cy="150" r="38" fill="${limpo ? '#ffffff' : '#c7a24a'}" opacity=".9"/><circle cx="255" cy="155" r="30" fill="${limpo ? '#ffffff' : '#c7a24a'}" opacity=".9"/>
      ${limpo ? '<path d="M90 110 Q180 85 290 105" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".9"/>' : '<g stroke="#8a6d2b" stroke-opacity=".5" stroke-width="2"><path d="M80 120 l60 10 M160 180 l80 -15 M220 120 l70 25 M100 190 l40 -30"/></g>'}
      ${brilho}</svg>`;
  }
  // Carro de lado
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">${fundo}
    <path d="M40 190 Q44 158 86 150 L126 116 Q142 104 168 102 L246 102 Q272 104 290 120 L322 150 Q356 156 360 184 L362 208 Q362 220 348 220 L58 220 Q44 220 44 208 Z" fill="${cor}" ${limpo ? '' : 'style="filter:saturate(.4) brightness(.85)"'}/>
    <path d="M138 124 Q150 114 170 113 L210 113 L210 150 L114 150 Z M222 113 L246 113 Q266 115 280 130 L300 150 L222 150 Z" fill="${limpo ? '#a8cdfa' : '#8f9aa6'}"/>
    ${limpo ? '<path d="M100 140 Q150 112 210 108" stroke="#fff" stroke-opacity=".75" stroke-width="5" fill="none" stroke-linecap="round"/>' : ''}
    <circle cx="110" cy="220" r="30" fill="#15171d"/><circle cx="110" cy="220" r="13" fill="${limpo ? '#d5dae3' : '#7d7a73'}"/>
    <circle cx="295" cy="220" r="30" fill="#15171d"/><circle cx="295" cy="220" r="13" fill="${limpo ? '#d5dae3' : '#7d7a73'}"/>
    ${sujeira}${brilho}</svg>`;
}

function camadaImagem(src, tipo, cor, limpo, classe) {
  return src
    ? `<img class="${classe}" src="${escapar(src)}" alt="" loading="lazy">`
    : `<div class="${classe}">${ilustracao(tipo, cor, limpo)}</div>`;
}

function renderGaleria() {
  $('#lista-galeria').innerHTML = GALERIA.map((g, i) => `
    <figure class="comparar">
      <div class="comparar__quadro" style="--corte:50%">
        ${camadaImagem(g.antes, g.desenho, g.cor, false, 'comparar__antes')}
        ${camadaImagem(g.depois, g.desenho, g.cor, true, 'comparar__depois')}
        <span class="rotulo-foto rotulo-foto--antes">Antes</span>
        <span class="rotulo-foto rotulo-foto--depois">Depois</span>
        <span class="comparar__linha"></span>
        <input class="comparar__range" type="range" min="0" max="100" value="50" aria-label="Comparar antes e depois: ${escapar(g.titulo)}">
      </div>
      <figcaption>${escapar(g.titulo)}<small>${escapar(g.legenda)}</small></figcaption>
    </figure>`).join('');
}
$('#lista-galeria').addEventListener('input', (e) => {
  if (!e.target.classList.contains('comparar__range')) return;
  e.target.parentElement.style.setProperty('--corte', `${e.target.value}%`);
});
$('.galeria__nav').addEventListener('click', (e) => {
  const b = e.target.closest('.seta'); if (!b) return;
  const g = $('#lista-galeria');
  g.scrollBy({ left: Number(b.dataset.dir) * (g.firstElementChild.offsetWidth + 16), behavior: 'smooth' });
});
$('#lista-galeria').addEventListener('keydown', (e) => {
  if (e.target.classList.contains('comparar__range')) return; // setas controlam o slider
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') $(`.seta[data-dir="${e.key === 'ArrowRight' ? 1 : -1}"]`).click();
});

// ---------- Agendamento ----------
const estado = { hora: null };
$('#f-pacote').innerHTML = PACOTES.map((p) => `<option value="${p.id}">${p.nome} (${p.tempo})</option>`).join('');
$('#f-pacote').value = 'completa';

// Data mínima = hoje; pula domingos
const hoje = new Date();
$('#f-data').min = chave(hoje);
const max = new Date(); max.setDate(max.getDate() + 30); $('#f-data').max = chave(max);
let inicial = new Date(hoje);
while (!HORARIOS[inicial.getDay()] || (chave(inicial) === chave(hoje) && hoje.getHours() >= HORARIOS[hoje.getDay()][1])) inicial.setDate(inicial.getDate() + 1);
$('#f-data').value = chave(inicial);

function vagas(data, hora) {
  const demo = hash(data + hora) % 100 < 30 ? 1 : 0; // ocupação de demonstração
  const reais = agenda.filter((a) => a.data === data && a.hora === hora).length;
  return Math.max(0, BOXES - demo - reais);
}

function renderHorarios() {
  const alvo = $('#horarios');
  const data = $('#f-data').value;
  if (!data) { alvo.innerHTML = '<p class="vazio">Escolha um dia.</p>'; return; }
  const dia = deChave(data);
  const janela = HORARIOS[dia.getDay()];
  if (!janela) { alvo.innerHTML = '<p class="vazio">Fechado aos domingos. Escolha outro dia.</p>'; estado.hora = null; return; }

  const pacote = PACOTES.find((p) => p.id === $('#f-pacote').value);
  const longo = pacote.horas >= 4;
  const agora = new Date();
  let html = '', algum = false;
  for (let h = janela[0]; h <= janela[1]; h++) {
    const hora = `${pad(h)}:00`;
    const passou = data === chave(agora) && h <= agora.getHours();
    const tarde = longo && h > Math.min(ENTRADA_MAX_SERVICO_LONGO, janela[1] - 2);
    const v = vagas(data, hora);
    const ok = !passou && !tarde && v > 0;
    if (ok) algum = true; else if (estado.hora === hora) estado.hora = null;
    const info = passou ? 'encerrado' : tarde ? 'muito tarde' : v ? `${v} vaga${v > 1 ? 's' : ''}` : 'lotado';
    html += `<button type="button" class="horario ${estado.hora === hora ? 'ativo' : ''}" data-hora="${hora}" ${ok ? '' : 'disabled'}>${hora}<small>${info}</small></button>`;
  }
  alvo.innerHTML = algum ? html : '<p class="vazio">Sem vagas neste dia. Tente o próximo.</p>';
}

function calcular() {
  const pacote = PACOTES.find((p) => p.id === $('#f-pacote').value);
  const p = $('#f-porte').value;
  const leva = $('#f-leva').checked;
  return { pacote, porte: p, leva, total: pacote.preco[p] + (leva ? TAXA_LEVA_TRAZ : 0) };
}

function renderTicket() {
  const c = calcular();
  const data = $('#f-data').value;
  const linhas = [
    ['Serviço', c.pacote.nome],
    ['Veículo', c.porte === 'pequeno' ? 'Hatch / Sedã' : 'SUV / Picape'],
    ['Quando', data && estado.hora ? `${deChave(data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${estado.hora}` : 'Escolha o horário'],
    ['Leva e traz', c.leva ? brl(TAXA_LEVA_TRAZ) : 'Não']
  ];
  $('#t-itens').innerHTML = linhas.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('');
  $('#t-total').textContent = brl(c.total);
  $('#campo-endereco').hidden = !c.leva;
}

$('#form').addEventListener('change', (e) => {
  if (['f-pacote', 'f-data'].includes(e.target.id)) renderHorarios();
  if (e.target.id === 'f-porte') {
    porte = e.target.value;
    $$('.porte__btn').forEach((x) => { const a = x.dataset.porte === porte; x.classList.toggle('ativo', a); x.setAttribute('aria-checked', a); });
    renderPacotes();
  }
  renderTicket();
});
$('#horarios').addEventListener('click', (e) => {
  const b = e.target.closest('.horario'); if (!b || b.disabled) return;
  estado.hora = b.dataset.hora;
  $$('.horario').forEach((x) => x.classList.toggle('ativo', x === b));
  renderTicket();
});
$('#f-placa').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('#f-tel').addEventListener('input', (e) => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 11);
  e.target.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});

$('#form').addEventListener('submit', (e) => {
  e.preventDefault();
  const erro = $('#erro');
  const c = calcular();
  const nome = $('#f-nome').value.trim(), tel = $('#f-tel').value.replace(/\D/g, '');
  const placa = $('#f-placa').value.trim(), endereco = $('#f-endereco').value.trim(), data = $('#f-data').value;
  const campos = { 'f-nome': !nome, 'f-tel': tel.length < 10, 'f-placa': placa.length < 7, 'f-endereco': c.leva && !endereco };
  Object.entries(campos).forEach(([id, inv]) => $(`#${id}`).classList.toggle('invalido', inv));

  if (!data || !estado.hora) return (erro.textContent = 'Escolha o dia e o horário.');
  if (placa.length < 7) return (erro.textContent = 'Informe a placa do veículo.');
  if (c.leva && !endereco) return (erro.textContent = 'Informe o endereço para buscarmos o carro.');
  if (!nome || tel.length < 10) return (erro.textContent = 'Preencha nome e WhatsApp com DDD.');
  if (vagas(data, estado.hora) < 1) { erro.textContent = 'Esse horário acabou de lotar.'; return renderHorarios(); }
  erro.textContent = '';

  const ag = { id: Date.now(), pacote: c.pacote.id, porte: c.porte, data, hora: estado.hora, placa, leva: c.leva, endereco, nome, tel: $('#f-tel').value, total: c.total };
  agenda.push(ag); banco.salvar(agenda);

  const quando = `${deChave(data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às ${ag.hora}`;
  $('#modal-texto').textContent = `${c.pacote.nome} para o carro ${placa}\n${quando}\nTotal ${brl(c.total)}`;
  $('#modal-whats').href = linkWhats(`Olá! Agendei pelo site:\n${c.pacote.nome} (${c.porte === 'pequeno' ? 'hatch/sedã' : 'SUV/picape'})\nPlaca ${placa}\n${quando}\n${c.leva ? `Leva e traz: ${endereco}\n` : ''}Nome: ${nome}`);
  $('#modal').showModal();

  estado.hora = null;
  ['f-placa', 'f-endereco'].forEach((id) => { $(`#${id}`).value = ''; });
  $('#f-leva').checked = false;
  renderHorarios(); renderTicket(); renderMeus();
});
$('#modal-fechar').addEventListener('click', () => $('#modal').close());

function renderMeus() {
  const futuros = agenda.filter((a) => new Date(`${a.data}T${a.hora}`) >= new Date())
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  $('#meus').hidden = !futuros.length;
  $('#lista-meus').innerHTML = futuros.map((a) => {
    const p = PACOTES.find((x) => x.id === a.pacote);
    return `<div class="agendado"><b>${p.nome} · ${escapar(a.placa)}</b>
      <span>${deChave(a.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${a.hora} · ${brl(a.total)}${a.leva ? ' · leva e traz' : ''}</span>
      <button class="btn btn--linha" data-cancelar="${a.id}">Cancelar</button></div>`;
  }).join('');
}
$('#lista-meus').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cancelar]'); if (!b) return;
  if (!b.dataset.ok) {
    b.dataset.ok = '1'; b.textContent = 'Toque de novo para cancelar';
    setTimeout(() => { if (b.isConnected) { delete b.dataset.ok; b.textContent = 'Cancelar'; } }, 3000);
    return;
  }
  agenda = agenda.filter((a) => a.id !== Number(b.dataset.cancelar));
  banco.salvar(agenda); renderMeus(); renderHorarios();
});

// ---------- Início ----------
renderPacotes();
renderGaleria();
renderHorarios();
renderTicket();
renderMeus();
