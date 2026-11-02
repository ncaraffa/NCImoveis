// Simulador de financiamento da página do imóvel. Só estimativa: não pede CPF nem guarda nada;
// tudo é calculado aqui no navegador com as regras de FINANCIAMENTO (dados.js).

// "450.000" ou "1.800,50" -> número
const dinheiro = (s) => Number(String(s ?? "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
const formatar = (n) => (n ? Math.round(n).toLocaleString("pt-BR") : "");

// Escolhe a taxa: Minha Casa Minha Vida quando renda e preço cabem, senão a taxa normal (SBPE).
function taxa(renda, preco) {
  const faixa = FINANCIAMENTO.mcmv.find((f) => renda <= f.ate);
  if (faixa && preco <= faixa.teto) {
    return { anual: faixa.juros, mensal: faixa.juros / 100 / 12, nome: `Minha Casa Minha Vida, ${faixa.faixa}`, mcmv: true, renda };
  }
  const j = FINANCIAMENTO.sbpe / 100;
  return { anual: FINANCIAMENTO.sbpe, mensal: (1 + j) ** (1 / 12) - 1, nome: "financiamento comum (SBPE)", mcmv: false };
}

// Primeira e última parcela, sem seguros, taxas e TR.
function parcelas(valor, meses, i, sistema) {
  if (sistema === "PRICE") {
    const p = (valor * i) / (1 - (1 + i) ** -meses);
    return { primeira: p, ultima: p };
  }
  const amortizacao = valor / meses;
  return { primeira: amortizacao + i * valor, ultima: amortizacao * (1 + i) };
}

function simular(preco, d) {
  const t = taxa(d.renda, preco);
  const idadeMax = Math.floor((FINANCIAMENTO.idadeMaisPrazo - d.idade) * 12);
  const meses = Math.max(12, Math.min(d.anos * 12, FINANCIAMENTO.prazoMax, idadeMax));
  const maxBanco = preco * FINANCIAMENTO.cota[d.sistema];
  const precisa = Math.max(0, preco - d.entrada - d.fgts);
  const financiado = Math.min(precisa, maxBanco);
  const falta = precisa - financiado; // entrada que ainda falta para fechar a conta
  const p = parcelas(financiado, meses, t.mensal, d.sistema);
  return { t, meses, financiado, falta, ...p, limiteParcela: d.renda * FINANCIAMENTO.rendaMax };
}

function montarSimulacao(i) {
  const caixa = document.getElementById("simulacao");
  const entradaSugerida = i.preco * (1 - FINANCIAMENTO.cota.SAC);
  caixa.innerHTML = `
    <span class="rotulo">Simulação</span>
    <h2>Quanto ficaria a parcela?</h2>
    <p class="sim-intro">Faça uma conta rápida para este imóvel de <b>${reais(i.preco)}</b>. Não pedimos CPF nem guardamos nada: a conta é feita aqui no seu celular.</p>
    <form class="sim-form" id="sim-form" novalidate>
      <label>Renda bruta da família por mês (R$)
        <input name="renda" inputmode="numeric" placeholder="Ex.: 6.000" required>
        <small>Some a renda de quem vai comprar junto.</small>
      </label>
      <label>Idade de quem é mais velho
        <input name="idade" type="number" min="18" max="80" inputmode="numeric" placeholder="Ex.: 35" required>
        <small>O banco limita o prazo pela idade.</small>
      </label>
      <label>Entrada em dinheiro (R$)
        <input name="entrada" inputmode="numeric" value="${formatar(entradaSugerida)}">
        <small>Normalmente pelo menos 20% do valor.</small>
      </label>
      <label>FGTS que pretende usar (R$)
        <input name="fgts" inputmode="numeric" placeholder="Se tiver">
        <small>Opcional. Soma com a entrada.</small>
      </label>
      <label>Prazo
        <select name="anos">${[35, 30, 25, 20, 15, 10].map((a) => `<option value="${a}">${a} anos</option>`).join("")}</select>
      </label>
      <div class="sim-sistema" role="radiogroup" aria-label="Tipo de parcela">
        <span>Tipo de parcela</span>
        <label><input type="radio" name="sistema" value="SAC" checked> SAC <small>começa maior e vai diminuindo</small></label>
        <label><input type="radio" name="sistema" value="PRICE"> PRICE <small>parcelas iguais</small></label>
      </div>
      <button class="btn btn-forte btn-cheio" type="submit">Simular</button>
    </form>
    <div id="sim-resultado" class="sim-resultado" hidden aria-live="polite"></div>
    <p class="sim-aviso">Estimativa independente, sem aprovação de crédito. Valores sujeitos às regras vigentes, análise do banco, avaliação do imóvel e elegibilidade ao FGTS/Minha Casa Minha Vida. Juros, TR, seguros e tarifas podem alterar o resultado. ITBI, registro e demais despesas de compra não estão incluídos. Taxas de referência de ${FINANCIAMENTO.atualizado}.</p>`;
  caixa.hidden = false;

  const form = document.getElementById("sim-form");
  ["renda", "entrada", "fgts"].forEach((n) => form[n].addEventListener("blur", () => (form[n].value = formatar(dinheiro(form[n].value)))));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = {
      renda: dinheiro(form.renda.value),
      idade: Number(form.idade.value),
      entrada: dinheiro(form.entrada.value),
      fgts: dinheiro(form.fgts.value),
      anos: Number(form.anos.value),
      sistema: form.sistema.value,
    };
    const out = document.getElementById("sim-resultado");
    out.hidden = false;
    if (!d.renda || !d.idade || d.idade < 18 || d.idade > 80) {
      out.innerHTML = `<p class="sim-alerta">Preencha a renda e a idade (entre 18 e 80 anos) para simular.</p>`;
      return;
    }
    const r = simular(i.preco, d);
    const cabe = r.primeira <= r.limiteParcela;
    const anosReais = r.meses / 12;
    const msg = `Olá! Fiz uma simulação no site para o imóvel ${i.codigo} (${i.titulo}): renda de ${reais(d.renda)}, entrada de ${reais(d.entrada + d.fgts)}, ${d.sistema} em ${anosReais.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} anos, primeira parcela de uns ${reais(r.primeira)}. Pode me ajudar?`;
    out.innerHTML = `
      ${r.financiado ? `
      <div class="sim-numeros">
        <div><span>Primeira parcela</span><strong>${reais(r.primeira)}</strong>${d.sistema === "SAC" ? `<small>a última fica perto de ${reais(r.ultima)}</small>` : ""}</div>
        <div><span>Valor financiado</span><strong>${reais(r.financiado)}</strong><small>em ${anosReais.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} anos</small></div>
        <div><span>Juros usados</span><strong>${r.t.anual.toLocaleString("pt-BR")}% ao ano</strong><small>${r.t.nome}</small></div>
      </div>` : `<p>Com essa entrada você paga o imóvel à vista, sem financiamento.</p>`}
      ${r.falta > 0 ? `<p class="sim-alerta">O banco costuma financiar até ${Math.round(FINANCIAMENTO.cota[d.sistema] * 100)}% do imóvel no ${d.sistema}. Para fechar a conta, faltariam mais ${reais(r.falta)} de entrada.</p>` : ""}
      ${r.financiado && cabe ? `<p class="sim-ok">${ic("ok")} A parcela cabe nos 30% da sua renda (até ${reais(r.limiteParcela)}), que é o que o banco costuma aceitar.</p>` : ""}
      ${r.meses < d.anos * 12 ? `<p class="sim-nota">Pela idade, o prazo máximo fica em ${anosReais.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} anos.</p>` : ""}
      ${r.t.mcmv && d.renda <= 5000 ? `<p class="sim-nota">Com essa renda você pode ter <b>subsídio do Minha Casa Minha Vida</b>, o que baixa ainda mais a conta. O Nicola confere para você.</p>` : ""}
      <p class="sim-nota">A parcela real ainda tem seguros obrigatórios e taxas do banco.</p>
      <a class="btn btn-forte btn-cheio" href="${esc(waLink(msg))}" target="_blank" rel="noopener noreferrer">Mandar esta simulação para o Nicola</a>`;
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
