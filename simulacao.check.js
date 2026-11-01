// Conferência das contas do simulador:  node simulacao.check.js
const fs = require("fs");
const vm = require("vm");
// Roda dados.js + simulacao.js como no navegador (scripts no mesmo escopo global).
const ctx = vm.createContext({});
for (const f of ["dados.js", "simulacao.js"]) vm.runInContext(fs.readFileSync(`${__dirname}/${f}`, "utf8"), ctx);
const { parcelas, taxa, simular, FINANCIAMENTO } = vm.runInContext("({ parcelas, taxa, simular, FINANCIAMENTO })", ctx);
const assert = require("assert");
const perto = (a, b) => assert(Math.abs(a - b) < 1, `${a} != ${b}`);

// PRICE: 100 mil, 1% ao mês, 12 meses -> 8.884,88 (tabela clássica)
perto(parcelas(100000, 12, 0.01, "PRICE").primeira, 8884.88);
// SAC: 120 mil, 1% ao mês, 12 meses -> 1ª 11.200, última 10.100
perto(parcelas(120000, 12, 0.01, "SAC").primeira, 11200);
perto(parcelas(120000, 12, 0.01, "SAC").ultima, 10100);
// Renda 4 mil e imóvel de 200 mil -> MCMV Faixa 2 (6%); imóvel de 300 mil -> SBPE
assert.equal(taxa(4000, 200000).anual, 6);
assert.equal(taxa(4000, 300000).anual, FINANCIAMENTO.sbpe);
assert.equal(taxa(20000, 200000).mcmv, false);
// Imóvel de 500 mil, entrada 50 mil no SAC: banco financia no máximo 80% (400 mil), faltam 50 mil
const r = simular(500000, { renda: 15000, idade: 30, entrada: 50000, fgts: 0, anos: 35, sistema: "SAC" });
assert.equal(r.financiado, 400000);
assert.equal(r.falta, 50000);
assert.equal(r.meses, 420);
// 70 anos: idade + prazo até 80,5 -> 126 meses
assert.equal(simular(500000, { renda: 15000, idade: 70, entrada: 100000, fgts: 0, anos: 35, sistema: "SAC" }).meses, 126);
console.log("simulador ok");
