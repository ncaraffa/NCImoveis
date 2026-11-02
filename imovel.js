// Página de um imóvel: imovel.html?id=<id da linha no Appwrite>.
const $ = (s) => document.querySelector(s);
let fotos = [];
let atual = 0;

function mostrarFoto(n) {
  atual = (n + fotos.length) % fotos.length;
  $("#foto-principal").src = $("#foto-fundo").src = fotos[atual];
  $("#contador").textContent = `${atual + 1} / ${fotos.length}`;
  document.querySelectorAll(".miniaturas button").forEach((b, k) => b.classList.toggle("ativa", k === atual));
}

function videoHtml(link) {
  const video = url(link);
  if (!video) return "";
  const youtube = video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return youtube
    ? `<iframe class="video" src="https://www.youtube-nocookie.com/embed/${youtube[1]}" title="Vídeo do imóvel" allowfullscreen></iframe>`
    : `<video class="video" src="${esc(video)}" controls preload="metadata"></video>`;
}

function semImovel() {
  $("#carregando").innerHTML = 'Este imóvel não está mais disponível. <a href="index.html#imoveis">Ver os outros imóveis</a>.';
}

async function carregar() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return semImovel();
  let i;
  try {
    // Só devolve imóvel público (disponível/reservado e autorizado); o resto dá 404.
    i = linha(await api().getRow({ databaseId: APPWRITE.banco, tableId: "imoveis", rowId: id }));
  } catch (e) {
    console.error(e);
    return semImovel();
  }

  document.title = `${i.titulo} | NCImóveis`;
  fotos = (i.fotos || []).map(url).filter(Boolean);
  $(".galeria-grande").hidden = !fotos.length;
  $("#miniaturas").innerHTML = fotos.map((f, k) => `<button aria-label="Foto ${k + 1}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join("");
  $("#miniaturas").hidden = fotos.length < 2;
  document.querySelectorAll(".seta").forEach((b) => (b.hidden = fotos.length < 2));
  if (fotos.length) mostrarFoto(0);

  $("#rotulo").textContent = [i.tipo, i.finalidade === "Venda" ? "à venda" : "para alugar", i.status === "reservado" ? "· reservado" : ""].join(" ");
  $("#titulo").textContent = i.titulo;
  $("#local").textContent = local(i);
  $("#info").innerHTML = infoHtml(i);
  $("#video").innerHTML = videoHtml(i.video_url);
  $("#descricao").textContent = i.descricao || "";
  $("#titulo-descricao").hidden = !i.descricao;
  $("#preco").innerHTML = precoHtml(i);
  $("#encargos").textContent = encargos(i);
  $("#codigo").textContent = `Código do imóvel: ${i.codigo}`;
  $("#whats").href = waLink(`Olá! Tenho interesse no imóvel ${i.codigo} (${i.titulo}).`);

  // Simulação só para imóvel à venda que aceita financiamento.
  const venda = i.finalidade === "Venda";
  $("#financia").innerHTML = venda ? financiamentoHtml(i) : "";
  $("#ir-simular").hidden = !(venda && i.aceita_financiamento);
  if (venda && i.aceita_financiamento) montarSimulacao(i);

  $("#carregando").hidden = true;
  $("#imovel").hidden = false;
  animar();
}

$("#anterior").addEventListener("click", () => mostrarFoto(atual - 1));
$("#proxima").addEventListener("click", () => mostrarFoto(atual + 1));
$("#miniaturas").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) mostrarFoto([...b.parentNode.children].indexOf(b));
});
// Arrastar o dedo na foto também troca.
let toqueX = null;
$("#foto-principal").addEventListener("touchstart", (e) => (toqueX = e.touches[0].clientX), { passive: true });
$("#foto-principal").addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - toqueX;
  if (Math.abs(dx) > 40 && fotos.length > 1) mostrarFoto(atual + (dx < 0 ? 1 : -1));
});

carregar();
