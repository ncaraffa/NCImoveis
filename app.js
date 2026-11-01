const lista = document.getElementById("lista");
const vazio = document.getElementById("vazio");
const busca = document.getElementById("busca");
const chips = document.querySelectorAll(".chip");
let imoveis = [];
let filtro = { finalidade: "", cidade: "", bairro: "", tipo: "" };

async function carregar() {
  try {
    // O banco só devolve ao público os imóveis disponíveis/reservados e autorizados pelo dono.
    // ponytail: limite de 100 anúncios, paginar se ele passar disso.
    const { rows } = await api().listRows({
      databaseId: APPWRITE.banco,
      tableId: "imoveis",
      queries: [Appwrite.Query.orderDesc("destaque"), Appwrite.Query.orderDesc("$createdAt"), Appwrite.Query.limit(100)],
    });
    imoveis = rows.map(linha);
  } catch (error) {
    console.error(error);
    vazio.dataset.erro = 1;
    vazio.textContent = "Não foi possível carregar os imóveis agora. Tente de novo em instantes.";
  }
}

function render() {
  const itens = imoveis.filter(
    (i) =>
      (!filtro.finalidade || i.finalidade === filtro.finalidade) &&
      (!filtro.cidade || (filtro.cidade === OUTRAS ? !CIDADES[i.cidade] : i.cidade === filtro.cidade)) &&
      (!filtro.bairro || i.bairro === filtro.bairro) &&
      (!filtro.tipo || i.tipo === filtro.tipo)
  );
  vazio.hidden = itens.length > 0;
  if (!vazio.dataset.erro) vazio.innerHTML = imoveis.length
    ? 'Nenhum imóvel encontrado. <a href="#contato">Me conte o que procura</a> que eu busco pra você.'
    : "Os imóveis aparecerão aqui quando forem adicionados.";
  document.querySelector(".filtros").hidden = !imoveis.length;
  lista.innerHTML = itens
    .map((i, n) => {
      const capa = url(i.fotos?.[0]);
      const extra = encargos(i);
      return `
      <article class="card">
        <a class="card-foto" href="imovel.html?id=${encodeURIComponent(i.id)}" aria-label="Ver detalhes de ${esc(i.titulo)}">
          ${capa ? `<img src="${esc(capa)}" alt="" loading="lazy">` : `<span class="sem-foto">${ic("casa")}</span>`}
          <span class="selo ${i.finalidade === "Venda" ? "venda" : "aluguel"}">${esc(i.finalidade)}</span>
          ${i.status === "reservado" ? '<span class="selo reservado">Reservado</span>' : ""}
          ${i.fotos?.length > 1 || i.video_url ? `<span class="midia">${ic("camera")} ${i.fotos.length}${i.video_url ? ` · ${ic("video")} vídeo` : ""}</span>` : ""}
        </a>
        <div class="card-corpo">
          <div class="preco">${precoHtml(i)}</div>
          ${extra ? `<p class="encargos">${esc(extra)}</p>` : ""}
          <h3><a href="imovel.html?id=${encodeURIComponent(i.id)}">${esc(i.titulo)}</a></h3>
          <p class="bairro">${ic("pino")} ${esc(local(i))} · Cód. ${esc(i.codigo)}</p>
          ${infoHtml(i)}
          ${i.finalidade === "Venda" ? financiamentoHtml(i) : ""}
          <a class="btn btn-suave btn-cheio" href="imovel.html?id=${encodeURIComponent(i.id)}">Ver fotos e detalhes</a>
        </div>
      </article>`;
    })
    .join("");
  animar(lista);
}

function marcarChip() {
  chips.forEach((c) => c.classList.toggle("ativo", c.dataset.f === filtro.finalidade));
}

chips.forEach((c) =>
  c.addEventListener("click", () => {
    filtro.finalidade = c.dataset.f;
    busca.finalidade.value = c.dataset.f;
    marcarChip();
    render();
  })
);

// Busca do topo: cidade -> bairros da mesma lista que o painel usa (CIDADES em dados.js).
const opcoes = (lista, primeira) => `<option value="">${primeira}</option>` + lista.map((v) => `<option value="${esc(v.valor ?? v)}">${esc(v.nome ?? v)}</option>`).join("");
busca.cidade.innerHTML = opcoes([...Object.keys(CIDADES), { valor: OUTRAS, nome: "Outras cidades" }], "Todas as cidades");
busca.tipo.innerHTML = opcoes(TIPOS, "Todos os tipos");
function bairrosDaBusca() {
  const cidade = busca.cidade.value;
  // Lista oficial + algum bairro fora dela que o Nicola tenha cadastrado, para nada ficar sem filtro.
  const lista = CIDADES[cidade]
    ? [...new Set([...CIDADES[cidade], ...imoveis.filter((i) => i.cidade === cidade).map((i) => i.bairro)])].sort((x, y) => x.localeCompare(y, "pt-BR"))
    : [];
  busca.bairro.innerHTML = opcoes(lista, lista.length ? "Todos os bairros" : "Escolha a cidade");
  busca.bairro.disabled = !lista.length;
}
busca.cidade.addEventListener("change", bairrosDaBusca);
bairrosDaBusca();

busca.addEventListener("submit", (e) => {
  e.preventDefault();
  filtro = { finalidade: busca.finalidade.value, cidade: busca.cidade.value, bairro: busca.bairro.value, tipo: busca.tipo.value };
  marcarChip();
  render();
  document.getElementById("imoveis").scrollIntoView({ behavior: "smooth" });
});

carregar().then(() => {
  bairrosDaBusca();
  render();
});
