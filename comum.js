// Funções usadas no site público (página inicial e página do imóvel).
const waLink = (msg) => `https://wa.me/${CORRETOR.whatsapp}?text=${encodeURIComponent(msg)}`;
const reais = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Tira acentos para a busca achar "sao paulo" em "São Paulo".
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Só aceita links http(s) vindos do banco, para não virar javascript: no href.
const url = (s) => (/^https:\/\//i.test(s || "") ? s : "");
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Preenche os dados do corretor.
document.querySelectorAll("[data-c]").forEach((el) => (el.textContent = CORRETOR[el.dataset.c]));
document.querySelectorAll("[data-c-src]").forEach((el) => (el.src = CORRETOR[el.dataset.cSrc]));
document.querySelectorAll("[data-c-tel]").forEach((el) => (el.href = `tel:+${CORRETOR.whatsapp}`));
document.querySelectorAll("[data-c-mail]").forEach((el) => (el.href = `mailto:${CORRETOR.email}`));
document.querySelectorAll("[data-c-insta]").forEach((el) => {
  el.href = CORRETOR.instagram;
  el.target = "_blank";
  el.rel = "noopener noreferrer";
});
document.querySelectorAll("[data-wa]").forEach((el) => {
  el.href = waLink(el.dataset.wa);
  el.target = "_blank";
  el.rel = "noopener noreferrer";
});
document.querySelectorAll("#ano").forEach((el) => (el.textContent = new Date().getFullYear()));


function precoHtml(i) {
  return reais(i.preco) + (i.finalidade === "Aluguel" ? "<small>/mês</small>" : "");
}

function encargos(i) {
  const e = [];
  if (i.condominio) e.push(`Condomínio ${reais(i.condominio)}`);
  if (i.iptu) e.push(`IPTU ${reais(i.iptu)}`);
  return e.join(" · ");
}

function local(i) {
  return [i.bairro, i.cidade].filter(Boolean).join(", ");
}

const api = () => new Appwrite.TablesDB(new Appwrite.Client().setEndpoint(APPWRITE.endpoint).setProject(APPWRITE.projeto));

function infoHtml(i) {
  return `<ul class="info">
    <li>${plural(i.quartos, "quarto", "quartos")}</li>
    <li>${plural(i.banheiros, "banheiro", "banheiros")}</li>
    <li>${plural(i.vagas, "vaga", "vagas")}</li>
    ${i.area ? `<li>${esc(i.area)} m²</li>` : ""}
  </ul>`;
}

function financiamentoHtml(i) {
  return i.aceita_financiamento
    ? `<p class="financia sim">${ic("ok")} Aceita financiamento</p>`
    : `<p class="financia nao">${ic("dinheiro")} Somente à vista</p>`;
}

// Animação ao rolar: cada bloco sobe e aparece quando entra na tela (uma vez só).
// Itens lado a lado entram em sequência (--i). Sem JS ou com "reduzir movimento", tudo já aparece.
const ANIMADOS = ".secao .rotulo, .secao h2, .secao-intro, .secao-topo .filtros, .passos li, .servicos article, .aviso-seguranca, .sobre-foto, .lista-check li, .contato-card, .card, .rodape-colunas > *, .galeria-grande, .imovel-texto > *, .imovel-lateral, .simulacao";
const observador = "IntersectionObserver" in window &&
  new IntersectionObserver(
    (entradas) => entradas.forEach((e) => e.isIntersecting && (e.target.classList.add("visivel"), observador.unobserve(e.target))),
    { rootMargin: "0px 0px -8% 0px" }
  );
function animar(raiz = document) {
  if (!observador) return;
  raiz.querySelectorAll(ANIMADOS).forEach((el) => {
    if (el.classList.contains("revelar")) return;
    const irmaos = [...el.parentNode.children].filter((x) => x.matches(ANIMADOS));
    el.style.setProperty("--i", Math.min(irmaos.indexOf(el), 5));
    el.classList.add("revelar");
    observador.observe(el);
  });
}
if (observador) document.documentElement.classList.add("anima");
animar();
