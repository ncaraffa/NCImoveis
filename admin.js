// Painel do corretor. Toda a proteção dos dados fica no Appwrite (permissões da
// equipe "admin" nas tabelas e na pasta midias); aqui é só a interface.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const reais = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// "450.000" ou "1.800,50" -> número; vazio -> null
const numero = (s) => {
  const t = String(s ?? "").replace(/[^\d,]/g, "").replace(",", ".");
  return t ? Number(t) : null;
};
const formatar = (n) => (n == null ? "" : Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
const BUCKET = "midias";
const MAX_VIDEO = 50_000_000; // mesmo teto da pasta midias no Appwrite

const telas = ["sem-banco", "login", "senha", "painel"];
function mostrarTela(nome) {
  telas.forEach((t) => ($(`#tela-${t}`).hidden = t !== nome));
}

let avisoTimer;
function aviso(texto, erro = false) {
  const el = $("#aviso");
  el.innerHTML = `${ic(erro ? "alerta" : "ok")} ${esc(texto)}`;
  el.classList.toggle("erro", erro);
  el.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (el.hidden = true), erro ? 7000 : 4000);
}

function msg(id, texto, tipo = "erro") {
  const el = $(id);
  el.textContent = texto;
  el.className = `msg ${tipo}`;
}

// Traduz os erros mais comuns para algo que o Nicola entenda.
function erroAmigavel(e) {
  const tipo = String(e?.type || "");
  const m = String(e?.message || e || "");
  if (tipo === "user_invalid_credentials") return "E-mail ou senha errados. Se é a primeira vez, clique em “Esqueci minha senha” para criar a sua.";
  if (tipo === "user_password_recently_used" || tipo === "password_recently_used") return "Use uma senha diferente das últimas.";
  if (/^user_(invalid_token|token_expired)/.test(tipo)) return "Esse link já venceu. Volte e clique de novo em “Esqueci minha senha”.";
  if (e?.code === 429) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/storage_(file_too_large|invalid_file_size)/.test(tipo)) return "Arquivo grande demais. Vídeos até 50 MB; use um link do YouTube para vídeos maiores.";
  if (/failed to fetch|network/i.test(m)) return "Sem internet ou o servidor não respondeu. Confira sua conexão.";
  if (e?.code === 401) return "Sua sessão expirou. Saia e entre de novo.";
  return "Algo deu errado. Tente de novo; se continuar, mande um print para o Nicolas.";
}

if (!APPWRITE.projeto) {
  mostrarTela("sem-banco");
  throw new Error("APPWRITE não configurado em dados.js");
}

const { Client, Account, TablesDB, Storage, Teams, ID, Query, Permission, Role } = Appwrite;
const client = new Client().setEndpoint(APPWRITE.endpoint).setProject(APPWRITE.projeto);
const account = new Account(client);
const tdb = new TablesDB(client);
const storage = new Storage(client);
const DB = APPWRITE.banco;
$$(".ano").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Entrar / sair ---------- */

// O link do e-mail de "Esqueci minha senha" volta para cá com userId e secret.
const recuperacao = Object.fromEntries(new URLSearchParams(location.search));

async function iniciar() {
  if (recuperacao.userId && recuperacao.secret) return mostrarTela("senha");
  try {
    await account.get();
  } catch {
    return mostrarTela("login");
  }
  const { teams } = await new Teams(client).list().catch(() => ({ teams: [] }));
  if (!teams.some((t) => t.$id === "admin")) {
    await sair();
    return msg("#msg-login", "Esta conta não tem acesso ao painel.");
  }
  mostrarTela("painel");
  await Promise.all([carregarImoveis(), carregarNegocios()]);
}

async function sair() {
  await account.deleteSession({ sessionId: "current" }).catch(() => {});
  mostrarTela("login");
}

$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const botao = $("button[type=submit]", f);
  botao.disabled = true;
  botao.textContent = "Entrando...";
  msg("#msg-login", "");
  try {
    await account.createEmailPasswordSession({ email: f.email.value.trim(), password: f.senha.value });
    f.senha.value = "";
    iniciar();
  } catch (error) {
    msg("#msg-login", erroAmigavel(error));
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});

$("#esqueci").addEventListener("click", async () => {
  const email = $("#form-login").email.value.trim();
  if (!email) return msg("#msg-login", "Escreva seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.");
  try {
    await account.createRecovery({ email, url: location.origin + location.pathname });
    msg("#msg-login", "Pronto! Mandamos um link para o seu e-mail. Abra e crie uma senha nova.", "ok");
  } catch (error) {
    msg("#msg-login", erroAmigavel(error));
  }
});

$("#form-senha").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await account.updateRecovery({ userId: recuperacao.userId, secret: recuperacao.secret, password: e.target.senha.value });
  } catch (error) {
    return msg("#msg-senha", erroAmigavel(error));
  }
  recuperacao.userId = recuperacao.secret = null;
  history.replaceState(null, "", location.pathname);
  mostrarTela("login");
  msg("#msg-login", "Senha nova salva! Agora entre com ela.", "ok");
});

$("#sair").addEventListener("click", sair);

/* ---------- Abas ---------- */

function irPara(aba) {
  $$(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
  $$("[data-painel]").forEach((p) => (p.hidden = p.dataset.painel !== aba));
  window.scrollTo({ top: 0 });
}
$$(".aba").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.aba === "novo") limparForm();
    irPara(b.dataset.aba);
  })
);
$$("[data-ir]").forEach((b) =>
  b.addEventListener("click", () => {
    limparForm();
    irPara(b.dataset.ir);
  })
);

/* ---------- Meus imóveis ---------- */

let imoveis = [];
const STATUS = { disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido", alugado: "Alugado" };

// Só aparece no site o que está disponível/reservado e tem autorização do dono.
const permissoes = (i) =>
  i.autorizacao_proprietario && ["disponivel", "reservado"].includes(i.status) ? [Permission.read(Role.any())] : [];

async function mudarImovel(i, dados) {
  await tdb.updateRow({ databaseId: DB, tableId: "imoveis", rowId: i.id, data: dados, permissions: permissoes({ ...i, ...dados }) });
  await sincronizarArquivos({ ...i, ...dados });
}

// Fotos e vídeo só ficam abertos ao público enquanto o anúncio está no site;
// saiu do site (vendido, sem autorização...), os arquivos voltam a ser só do admin.
async function sincronizarArquivos(i) {
  const permissions = permissoes(i);
  for (const fileId of [...(i.fotos || []), i.video_url].map(idArquivo).filter(Boolean)) {
    await storage.updateFile({ bucketId: BUCKET, fileId, permissions }).catch((e) => {
      if (e.code !== 404) throw e;
    });
  }
}

async function carregarImoveis() {
  try {
    // ponytail: até 500 imóveis, paginar se passar disso.
    const { rows } = await tdb.listRows({ databaseId: DB, tableId: "imoveis", queries: [Query.orderDesc("$createdAt"), Query.limit(500)] });
    imoveis = rows.map(linha);
  } catch (error) {
    return aviso(erroAmigavel(error), true);
  }
  desenharImoveis();
  atualizarSelectNegocio();
}

function desenharImoveis() {
  const q = norm($("#filtro-imoveis").value);
  const itens = imoveis.filter((i) => !q || norm(`${i.titulo} ${i.bairro} ${i.cidade} ${i.codigo}`).includes(q));
  $("#sem-imoveis").hidden = imoveis.length > 0;
  $("#lista-admin").innerHTML = itens
    .map(
      (i) => `
    <article class="item" data-id="${esc(i.id)}">
      ${i.fotos?.[0] ? `<img src="${esc(i.fotos[0])}" alt="">` : `<div class="sem-foto">${ic("casa")}</div>`}
      <div>
        <h3>${esc(i.titulo)}</h3>
        <div class="preco">${reais(i.preco)}${i.finalidade === "Aluguel" ? "<small>/mês</small>" : ""}</div>
        <p>${esc(i.bairro)}, ${esc(i.cidade)} · ${esc(i.finalidade)} · Cód. ${esc(i.codigo)} · ${i.fotos?.length || 0} foto(s)</p>
        ${i.autorizacao_proprietario ? "" : `<p class="alerta-aut">${ic("alerta")} Fora do site: falta marcar a autorização do dono</p>`}
      </div>
      <div class="item-acoes">
        <select class="st-${esc(i.status)}" data-acao="status" aria-label="Situação">
          ${Object.entries(STATUS).map(([v, t]) => `<option value="${v}" ${v === i.status ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <button class="btn btn-suave" data-acao="editar">${ic("editar")} Editar</button>
        <button class="btn btn-perigo" data-acao="apagar">${ic("lixeira")} Apagar</button>
      </div>
    </article>`
    )
    .join("");
}

$("#filtro-imoveis").addEventListener("input", desenharImoveis);

$("#lista-admin").addEventListener("change", async (e) => {
  if (e.target.dataset.acao !== "status") return;
  const imovel = imoveis.find((i) => i.id === e.target.closest(".item").dataset.id);
  const status = e.target.value;
  try {
    await mudarImovel(imovel, { status });
  } catch (error) {
    aviso(erroAmigavel(error), true);
    return carregarImoveis();
  }
  aviso(status === "vendido" || status === "alugado" ? "Situação salva. O imóvel saiu do site." : "Situação salva.");
  carregarImoveis();
});

$("#lista-admin").addEventListener("click", async (e) => {
  const acao = e.target.closest("button")?.dataset.acao;
  if (!acao) return;
  const imovel = imoveis.find((i) => i.id === e.target.closest(".item").dataset.id);
  if (acao === "editar") {
    preencherForm(imovel);
    irPara("novo");
  }
  if (acao === "apagar") {
    if (!confirm(`Apagar "${imovel.titulo}"?\n\nIsso tira o imóvel do site e apaga as fotos. Não dá para desfazer.\n\nSe ele só foi vendido, é melhor mudar a situação para "Vendido".`)) return;
    // Arquivos antes do registro: se falhar no meio, o imóvel continua na lista para tentar de novo.
    try {
      await apagarArquivos([...(imovel.fotos || []), imovel.video_url]);
      await tdb.deleteRow({ databaseId: DB, tableId: "imoveis", rowId: imovel.id });
      aviso("Imóvel apagado.");
    } catch (err) {
      aviso(erroAmigavel(err), true);
    }
    carregarImoveis();
  }
});

/* ---------- Cadastro / edição ---------- */

const form = $("#form-imovel");
let editando = null; // imóvel em edição, ou null para novo
let fotos = []; // { url } já enviada ou { file, preview } nova
let removidos = []; // URLs a apagar do storage ao salvar
let videoAtual = null;
let salvando = false;

function limparForm() {
  form.reset();
  cidadeDoForm();
  mostrarFinanciamento();
  editando = null;
  fotos.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
  fotos = [];
  removidos = [];
  videoAtual = null;
  $("#titulo-form").textContent = "Cadastrar novo imóvel";
  $("#salvar").innerHTML = `${ic("salvar")} Salvar e publicar`;
  msg("#msg-imovel", "");
  desenharFotos();
  desenharVideo();
}

function preencherForm(i) {
  limparForm();
  editando = i;
  $("#titulo-form").textContent = `Editando: ${i.titulo}`;
  $("#salvar").innerHTML = `${ic("salvar")} Salvar alterações`;
  form.titulo.value = i.titulo;
  form.finalidade.value = i.finalidade;
  form.tipo.value = i.tipo;
  form.preco.value = formatar(i.preco);
  form.cidade_lista.value = CIDADES[i.cidade] ? i.cidade : OUTRAS;
  form.outra_cidade.value = CIDADES[i.cidade] ? "" : i.cidade;
  cidadeDoForm();
  form.bairro.value = i.bairro;
  if (i.finalidade === "Venda") form.aceita_financiamento.value = i.aceita_financiamento ? "sim" : "nao";
  mostrarFinanciamento();
  form.quartos.value = i.quartos ?? 0;
  form.banheiros.value = i.banheiros ?? 0;
  form.vagas.value = i.vagas ?? 0;
  form.area.value = formatar(i.area);
  form.descricao.value = i.descricao || "";
  form.condominio.value = formatar(i.condominio);
  form.iptu.value = formatar(i.iptu);
  form.destaque.checked = !!i.destaque;
  form.autorizacao_proprietario.checked = !!i.autorizacao_proprietario;
  fotos = (i.fotos || []).map((url) => ({ url }));
  const ehArquivo = !!idArquivo(i.video_url);
  if (ehArquivo) videoAtual = i.video_url;
  else form.video_url.value = i.video_url || "";
  desenharFotos();
  desenharVideo();
}

// Deixa os campos de dinheiro no formato 450.000 ao sair deles.
["preco", "condominio", "iptu"].forEach((n) =>
  form[n].addEventListener("blur", () => (form[n].value = formatar(numero(form[n].value))))
);

function desenharFotos() {
  $("#fotos").innerHTML = fotos
    .map(
      (f, n) => `
    <div class="foto">
      <img src="${esc(f.preview || f.url)}" alt="Foto ${n + 1}">
      ${n === 0 ? `<span class="capa">${ic("estrela", "cheio")} Capa</span>` : ""}
      <div class="foto-acoes">
        ${n > 0 ? `<button type="button" data-capa="${n}">${ic("estrela")} Capa</button>` : ""}
        <button type="button" class="tirar" data-tirar="${n}">${ic("fechar")} Tirar</button>
      </div>
    </div>`
    )
    .join("");
}

$("#fotos").addEventListener("click", (e) => {
  const capa = e.target.dataset.capa;
  const tirar = e.target.dataset.tirar;
  if (capa) fotos.unshift(...fotos.splice(Number(capa), 1));
  if (tirar) {
    const [f] = fotos.splice(Number(tirar), 1);
    if (f.url) removidos.push(f.url);
    if (f.preview) URL.revokeObjectURL(f.preview);
  }
  desenharFotos();
});

function adicionarFotos(lista) {
  [...lista]
    .filter((f) => f.type.startsWith("image/"))
    .forEach((file) => fotos.push({ file, preview: URL.createObjectURL(file) }));
  desenharFotos();
}
$("#arquivos-fotos").addEventListener("change", (e) => {
  adicionarFotos(e.target.files);
  e.target.value = "";
});
const soltar = $("#soltar");
soltar.addEventListener("dragover", (e) => {
  e.preventDefault();
  soltar.classList.add("arrastando");
});
soltar.addEventListener("dragleave", () => soltar.classList.remove("arrastando"));
soltar.addEventListener("drop", (e) => {
  e.preventDefault();
  soltar.classList.remove("arrastando");
  adicionarFotos(e.dataTransfer.files);
});

function desenharVideo() {
  const el = $("#video-atual");
  el.hidden = !videoAtual;
  el.innerHTML = videoAtual ? `${ic("video")} Este imóvel já tem um vídeo. <button type="button" class="btn btn-perigo" id="tirar-video">Tirar vídeo</button>` : "";
}
$("#video-atual").addEventListener("click", (e) => {
  if (e.target.id !== "tirar-video") return;
  removidos.push(videoAtual);
  videoAtual = null;
  desenharVideo();
});

// Fotos de celular chegam com 5-10 MB; reduzimos para no máximo 1600px em WebP.
async function comprimir(file) {
  const img = await createImageBitmap(file);
  const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob(ok, "image/webp", 0.82));
}

// Todo arquivo enviado fica público para leitura (é foto de anúncio); só o admin envia ou apaga.
async function enviar(nome, arquivo, tipo) {
  const file = new File([arquivo], nome, { type: tipo });
  const f = await storage.createFile({ bucketId: BUCKET, fileId: ID.unique(), file, permissions: [Permission.read(Role.any())] });
  return storage.getFileView({ bucketId: BUCKET, fileId: f.$id });
}

// ID do arquivo dentro de um link nosso, ou null para links de fora (YouTube).
const idArquivo = (url) => url?.match(new RegExp(`/storage/buckets/${BUCKET}/files/([^/]+)/view`))?.[1] || null;

async function apagarArquivos(urls) {
  for (const fileId of urls.map(idArquivo).filter(Boolean)) {
    await storage.deleteFile({ bucketId: BUCKET, fileId }).catch((e) => {
      if (e.code !== 404) throw e; // já não existia: tudo bem
    });
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const preco = numero(form.preco.value);
  const faltando = [];
  if (!form.titulo.value.trim()) faltando.push("nome do anúncio");
  if (preco == null) faltando.push("preço");
  const cidade = form.cidade_lista.value === OUTRAS ? form.outra_cidade.value.trim() : form.cidade_lista.value;
  if (!cidade) faltando.push("cidade");
  if (!form.bairro.value.trim()) faltando.push("bairro");
  const venda = form.finalidade.value === "Venda";
  if (venda && !form.aceita_financiamento.value) faltando.push("se aceita financiamento");
  if (faltando.length) return msg("#msg-imovel", `Falta preencher: ${faltando.join(", ")}.`);
  // Bairro com a grafia da lista oficial (a mesma do filtro do site).
  const oficial = (CIDADES[cidade] || []).find((b) => norm(b) === norm(form.bairro.value.trim()));
  if (oficial) form.bairro.value = oficial;
  else if (CIDADES[cidade] && !confirm(`O bairro "${form.bairro.value.trim()}" não está na lista de ${cidade}.

Confira se não é um da lista com outro nome. Salvar assim mesmo?`)) return;
  const autorizado = form.autorizacao_proprietario.checked;
  if (!autorizado && !confirm("A caixa da autorização do dono (item 5) não está marcada.\n\nO imóvel vai ficar salvo, mas FORA do site até você marcar.\n\nSalvar assim?")) return;
  if (!fotos.length && !confirm("Você não colocou nenhuma foto. Imóvel sem foto chama pouca atenção.\n\nSalvar mesmo assim?")) return;
  const video = $("#arquivo-video").files[0];
  if (video && video.size > MAX_VIDEO) return msg("#msg-imovel", "Esse vídeo passa de 50 MB. Coloque no YouTube e cole o link no campo de baixo.");

  // Trava o painel inteiro enquanto envia, para não trocar de imóvel no meio do upload.
  if (salvando) return;
  salvando = true;
  $("#tela-painel").inert = true;
  const botao = $("#salvar");
  botao.disabled = true;
  const id = editando?.id || ID.unique();
  try {
    const urls = [];
    for (const [n, f] of fotos.entries()) {
      botao.innerHTML = `${ic("carregando", "girando")} Enviando foto ${n + 1} de ${fotos.length}...`;
      urls.push(f.url || (await enviar(`${id}-${n}.webp`, await comprimir(f.file), "image/webp")));
    }
    let video_url = form.video_url.value.trim() || videoAtual || null;
    if (video) {
      botao.innerHTML = `${ic("carregando", "girando")} Enviando vídeo (pode demorar)...`;
      const ext = (video.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (videoAtual) removidos.push(videoAtual);
      video_url = await enviar(`${id}-video.${ext}`, video, video.type);
    }
    if (video_url && !/^https:\/\//i.test(video_url)) throw new Error("O link do vídeo precisa começar com https://");

    const dados = {
      titulo: form.titulo.value.trim(),
      finalidade: form.finalidade.value,
      tipo: form.tipo.value,
      preco,
      cidade,
      bairro: form.bairro.value.trim(),
      aceita_financiamento: venda && form.aceita_financiamento.value === "sim",
      quartos: Number(form.quartos.value) || 0,
      banheiros: Number(form.banheiros.value) || 0,
      vagas: Number(form.vagas.value) || 0,
      area: numero(form.area.value),
      descricao: form.descricao.value.trim() || null,
      condominio: numero(form.condominio.value),
      iptu: numero(form.iptu.value),
      fotos: urls,
      video_url,
      destaque: form.destaque.checked,
      autorizacao_proprietario: autorizado,
    };
    botao.innerHTML = `${ic("carregando", "girando")} Salvando...`;
    if (editando) await mudarImovel(editando, dados);
    else {
      await tdb.createRow({ databaseId: DB, tableId: "imoveis", rowId: id, data: dados, permissions: permissoes({ ...dados, status: "disponivel" }) });
      await sincronizarArquivos({ ...dados, status: "disponivel" });
    }
    await apagarArquivos(removidos);
    if (!autorizado) aviso("Salvo, mas fora do site (falta a autorização do dono).");
    else aviso(editando ? "Alterações salvas! Já estão no site." : "Imóvel salvo! Já está no site.");
    limparForm();
    await carregarImoveis();
    irPara("imoveis");
  } catch (err) {
    console.error(err);
    msg("#msg-imovel", /https:\/\//.test(err.message) ? err.message : erroAmigavel(err));
  } finally {
    salvando = false;
    $("#tela-painel").inert = false;
    botao.disabled = false;
    botao.innerHTML = `${ic("salvar")} ${editando ? "Salvar alterações" : "Salvar e publicar"}`;
  }
});

$("#cancelar").addEventListener("click", () => {
  limparForm();
  irPara("imoveis");
});

// Cidade e bairro usam as mesmas listas da busca do site (CIDADES em dados.js).
form.cidade_lista.innerHTML =
  Object.keys(CIDADES).map((c) => `<option>${esc(c)}</option>`).join("") + `<option value="${OUTRAS}">Outra cidade</option>`;
form.tipo.innerHTML = TIPOS.map((t) => `<option>${esc(t)}</option>`).join("");

function cidadeDoForm() {
  const lista = CIDADES[form.cidade_lista.value] || [];
  $("#campo-outra-cidade").hidden = form.cidade_lista.value !== OUTRAS;
  $("#bairros").innerHTML = lista.map((b) => `<option value="${esc(b)}">`).join("");
  $("#dica-bairro").textContent = lista.length ? "Digite as primeiras letras e escolha na lista." : "Escreva o nome do bairro.";
}
form.cidade_lista.addEventListener("change", () => {
  form.bairro.value = "";
  cidadeDoForm();
});

// Financiamento só se pergunta para venda.
function mostrarFinanciamento() {
  $("#campo-financiamento").hidden = form.finalidade.value !== "Venda";
}
form.querySelectorAll("[name=finalidade]").forEach((r) => r.addEventListener("change", mostrarFinanciamento));
cidadeDoForm();

/* ---------- Meu dinheiro ---------- */

let negocios = [];
const fn = $("#form-negocio");
let comissaoManual = false;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

async function carregarNegocios() {
  try {
    // ponytail: até 1000 negócios, paginar se passar disso.
    const { rows } = await tdb.listRows({ databaseId: DB, tableId: "negocios", queries: [Query.orderDesc("data"), Query.limit(1000)] });
    negocios = rows.map(linha);
  } catch (error) {
    return aviso(erroAmigavel(error), true);
  }
  desenharDinheiro();
}

function desenharDinheiro() {
  const ano = String(new Date().getFullYear());
  const doAno = negocios.filter((n) => n.data.startsWith(ano));
  const soma = (l) => l.reduce((t, n) => t + Number(n.comissao_valor), 0);
  $("#r-recebido").textContent = reais(soma(doAno.filter((n) => n.recebido)));
  $("#r-areceber").textContent = reais(soma(negocios.filter((n) => !n.recebido)));
  $("#r-qtd").textContent = doAno.length;

  const porMes = MESES.map((_, m) => soma(doAno.filter((n) => Number(n.data.slice(5, 7)) === m + 1)));
  const maior = Math.max(...porMes, 1);
  $("#meses").innerHTML = porMes
    .map((v, m) => `<div class="mes"><span>${MESES[m]}</span><div class="mes-barra"><i style="width:${(v / maior) * 100}%"></i></div><b>${reais(v)}</b></div>`)
    .join("");

  $("#lista-negocios").innerHTML = negocios.length
    ? negocios
        .map(
          (n) => `
    <div class="negocio" data-id="${esc(n.id)}">
      <div>
        <strong>${esc(n.descricao)}</strong>
        <p>${new Date(n.data + "T12:00").toLocaleDateString("pt-BR")} · ${esc(n.tipo)}${Number(n.valor_negocio) ? ` · negócio de ${reais(n.valor_negocio)}` : ""}</p>
      </div>
      <strong>${reais(n.comissao_valor)}</strong>
      <div class="item-acoes">
        <button class="pilula ${n.recebido ? "sim" : "nao"}" data-acao="recebido" title="Clique para mudar">${n.recebido ? `${ic("ok")} Recebido` : `${ic("relogio")} A receber`}</button>
        <button class="btn btn-perigo" data-acao="apagar" aria-label="Apagar">${ic("lixeira")}</button>
      </div>
    </div>`
        )
        .join("")
    : '<p class="vazio">Nenhum negócio anotado ainda.</p>';
}

function atualizarSelectNegocio() {
  const sel = $("#neg-imovel");
  const atual = sel.value;
  sel.innerHTML =
    '<option value="">Outro (não está no site)</option>' +
    imoveis.map((i) => `<option value="${esc(i.id)}">${esc(i.codigo)} · ${esc(i.titulo)}</option>`).join("");
  sel.value = atual;
}

function calcularComissao() {
  if (comissaoManual) return;
  const v = numero(fn.valor_negocio.value);
  const p = numero(fn.comissao_pct.value);
  fn.comissao_valor.value = v != null && p != null ? formatar(Math.round(v * p) / 100) : "";
}
fn.valor_negocio.addEventListener("input", calcularComissao);
fn.comissao_pct.addEventListener("input", calcularComissao);
fn.comissao_valor.addEventListener("input", () => (comissaoManual = fn.comissao_valor.value !== ""));
["valor_negocio", "comissao_valor"].forEach((n) => fn[n].addEventListener("blur", () => (fn[n].value = formatar(numero(fn[n].value)))));

$("#neg-imovel").addEventListener("change", (e) => {
  const i = imoveis.find((x) => x.id === e.target.value);
  $("#tirar-do-site").hidden = !i;
  if (!i) return;
  fn.descricao.value = `${i.finalidade} ${i.codigo} · ${i.titulo}`;
  fn.tipo.value = i.finalidade;
  fn.valor_negocio.value = formatar(i.preco);
  calcularComissao();
});

function limparNegocio() {
  fn.reset();
  comissaoManual = false;
  fn.data.value = new Date().toLocaleDateString("sv-SE");
  $("#tirar-do-site").hidden = true;
}

fn.addEventListener("submit", async (e) => {
  e.preventDefault();
  const comissao = numero(fn.comissao_valor.value);
  if (!fn.descricao.value.trim() || comissao == null) return msg("#msg-negocio", "Preencha a descrição e o valor da comissão.");
  if (salvandoNegocio) return;
  salvandoNegocio = true;
  const botao = $("button[type=submit]", fn);
  botao.disabled = true;
  try {
    await salvarNegocio();
  } finally {
    salvandoNegocio = false;
    botao.disabled = false;
  }
});

let salvandoNegocio = false;
async function salvarNegocio() {
  const comissao = numero(fn.comissao_valor.value);
  const imovel_id = fn.imovel_id.value || null;
  const dados = {
    imovel_id,
    descricao: fn.descricao.value.trim(),
    tipo: fn.tipo.value,
    valor_negocio: numero(fn.valor_negocio.value) || 0,
    comissao_pct: numero(fn.comissao_pct.value),
    comissao_valor: comissao,
    data: fn.data.value,
    recebido: fn.recebido.checked,
  };
  try {
    await tdb.createRow({ databaseId: DB, tableId: "negocios", rowId: ID.unique(), data: dados });
  } catch (error) {
    return msg("#msg-negocio", erroAmigavel(error));
  }
  let avisoFinal = "Negócio anotado!";
  if (imovel_id && fn.tirar.checked) {
    const status = fn.tipo.value === "Aluguel" ? "alugado" : "vendido";
    const erroStatus = await mudarImovel(imoveis.find((i) => i.id === imovel_id), { status }).catch((e) => e);
    if (erroStatus) avisoFinal = "Negócio anotado, mas o imóvel continua no site. Mude a situação dele em “Meus imóveis”.";
    carregarImoveis();
  }
  msg("#msg-negocio", "");
  aviso(avisoFinal, avisoFinal !== "Negócio anotado!");
  limparNegocio();
  carregarNegocios();
}

$("#lista-negocios").addEventListener("click", async (e) => {
  const acao = e.target.closest("button")?.dataset.acao;
  if (!acao) return;
  const n = negocios.find((x) => x.id === e.target.closest(".negocio").dataset.id);
  if (acao === "recebido") {
    try {
      await tdb.updateRow({ databaseId: DB, tableId: "negocios", rowId: n.id, data: { recebido: !n.recebido } });
    } catch (error) {
      return aviso(erroAmigavel(error), true);
    }
    aviso(n.recebido ? "Marcado como “a receber”." : "Marcado como recebido!");
  }
  if (acao === "apagar") {
    if (!confirm(`Apagar o negócio "${n.descricao}"? Não dá para desfazer.`)) return;
    try {
      await tdb.deleteRow({ databaseId: DB, tableId: "negocios", rowId: n.id });
    } catch (error) {
      return aviso(erroAmigavel(error), true);
    }
    aviso("Negócio apagado.");
  }
  carregarNegocios();
});

limparNegocio();
iniciar();
