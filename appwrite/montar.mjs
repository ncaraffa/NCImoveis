// Monta o projeto Appwrite do NCImóveis: banco, tabelas, fotos, equipe admin e login do Nicola.
// Rodar uma vez (pode repetir sem estragar nada):  cd appwrite && npm install && node montar.mjs
// A chave de API fica em appwrite/.chave (nunca publique esse arquivo).
import { readFileSync } from "node:fs";
import { Client, TablesDB, Storage, Teams, Users, Project, Permission, Role, ID, Query } from "node-appwrite";

const ENDPOINT = "https://nyc.cloud.appwrite.io/v1";
const PROJETO = "6ae700a0003712b2e96c";
const EMAIL_ADMIN = "nicolacaraffa@gmail.com";
const DB = "site";

const chave = process.env.APPWRITE_KEY || readFileSync(new URL(".chave", import.meta.url), "utf8").trim();
const client = new Client().setEndpoint(ENDPOINT).setProject(PROJETO).setKey(chave);
const tdb = new TablesDB(client);
const storage = new Storage(client);
const teams = new Teams(client);
const users = new Users(client);
const project = new Project(client);

// Ignora "já existe" para o script poder rodar de novo.
async function criar(nome, fn) {
  try {
    await fn();
    console.log("ok      ", nome);
  } catch (e) {
    if (e.code === 409) console.log("já tinha", nome);
    else throw new Error(`${nome}: ${e.message}`);
  }
}

const admin = Role.team("admin");
const soAdmin = [Permission.create(admin), Permission.read(admin), Permission.update(admin), Permission.delete(admin)];

// No plano grátis, recriar um banco que já existe dá erro de limite em vez de 409.
await criar("banco", () => tdb.get({ databaseId: DB }).then(() => Promise.reject({ code: 409 }), () => tdb.create({ databaseId: DB, name: "Site" })));

// imoveis: o público só lê linhas com read("any"); o painel põe/tira essa permissão
// conforme situação + autorização do dono (mesma regra do antigo RLS).
await criar("tabela imoveis", () => tdb.createTable({ databaseId: DB, tableId: "imoveis", name: "Imóveis", permissions: soAdmin, rowSecurity: true }));
const im = { databaseId: DB, tableId: "imoveis" };
const colunasImoveis = [
  () => tdb.createVarcharColumn({ ...im, key: "titulo", size: 120, required: true }),
  () => tdb.createEnumColumn({ ...im, key: "finalidade", elements: ["Venda", "Aluguel"], required: true }),
  () => tdb.createEnumColumn({ ...im, key: "tipo", elements: ["Casa", "Apartamento", "Terreno", "Comercial", "Rural"], required: true }),
  () => tdb.createFloatColumn({ ...im, key: "preco", required: true, min: 0 }),
  () => tdb.createVarcharColumn({ ...im, key: "cidade", size: 80, required: true }),
  () => tdb.createVarcharColumn({ ...im, key: "bairro", size: 80, required: true }),
  () => tdb.createIntegerColumn({ ...im, key: "quartos", required: false, min: 0, max: 50, xdefault: 0 }),
  () => tdb.createIntegerColumn({ ...im, key: "banheiros", required: false, min: 0, max: 50, xdefault: 0 }),
  () => tdb.createIntegerColumn({ ...im, key: "vagas", required: false, min: 0, max: 50, xdefault: 0 }),
  () => tdb.createFloatColumn({ ...im, key: "area", required: false, min: 0 }),
  () => tdb.createTextColumn({ ...im, key: "descricao", required: false }),
  () => tdb.createFloatColumn({ ...im, key: "condominio", required: false, min: 0 }),
  () => tdb.createFloatColumn({ ...im, key: "iptu", required: false, min: 0 }),
  () => tdb.createVarcharColumn({ ...im, key: "fotos", size: 500, required: false, array: true }),
  () => tdb.createVarcharColumn({ ...im, key: "video_url", size: 500, required: false }),
  () => tdb.createBooleanColumn({ ...im, key: "destaque", required: false, xdefault: false }),
  () => tdb.createBooleanColumn({ ...im, key: "autorizacao_proprietario", required: false, xdefault: false }),
  () => tdb.createBooleanColumn({ ...im, key: "aceita_financiamento", required: false, xdefault: false }),
  () => tdb.createEnumColumn({ ...im, key: "status", elements: ["disponivel", "reservado", "vendido", "alugado"], required: false, xdefault: "disponivel" }),
];
for (const [n, c] of colunasImoveis.entries()) await criar(`imoveis coluna ${n + 1}`, c);

await criar("tabela negocios", () => tdb.createTable({ databaseId: DB, tableId: "negocios", name: "Negócios", permissions: soAdmin, rowSecurity: false }));
const ng = { databaseId: DB, tableId: "negocios" };
const colunasNegocios = [
  () => tdb.createVarcharColumn({ ...ng, key: "imovel_id", size: 36, required: false }),
  () => tdb.createVarcharColumn({ ...ng, key: "descricao", size: 160, required: true }),
  () => tdb.createEnumColumn({ ...ng, key: "tipo", elements: ["Venda", "Aluguel", "Outro"], required: true }),
  () => tdb.createFloatColumn({ ...ng, key: "valor_negocio", required: false, min: 0, xdefault: 0 }),
  () => tdb.createFloatColumn({ ...ng, key: "comissao_pct", required: false, min: 0, max: 100 }),
  () => tdb.createFloatColumn({ ...ng, key: "comissao_valor", required: true, min: 0 }),
  () => tdb.createVarcharColumn({ ...ng, key: "data", size: 10, required: true }),
  () => tdb.createBooleanColumn({ ...ng, key: "recebido", required: false, xdefault: false }),
];
for (const [n, c] of colunasNegocios.entries()) await criar(`negocios coluna ${n + 1}`, c);

// Fotos e vídeos: só o admin envia; cada arquivo recebe read("any") ao ser enviado.
await criar("pasta midias", () =>
  storage.createBucket({
    bucketId: "midias",
    name: "Fotos e vídeos",
    permissions: soAdmin,
    fileSecurity: true,
    maximumFileSize: 50_000_000, // teto do plano grátis
    allowedFileExtensions: ["webp", "jpg", "jpeg", "png", "mp4", "mov", "webm"],
  })
);

await criar("equipe admin", () => teams.create({ teamId: "admin", name: "Admin" }));

// Login do Nicola sem senha: ele cria a dele pelo "Esqueci minha senha" do painel.
let nicola = (await users.list({ queries: [Query.equal("email", EMAIL_ADMIN)] })).users[0];
if (!nicola) {
  nicola = await users.create({ userId: ID.unique(), email: EMAIL_ADMIN, name: "Nicola Caraffa" });
  console.log("ok       usuário", EMAIL_ADMIN);
} else console.log("já tinha usuário", EMAIL_ADMIN);
await criar("Nicola na equipe admin", () => teams.createMembership({ teamId: "admin", roles: ["owner"], userId: nicola.$id }));

// Navegadores que podem falar com o projeto. Adicione o domínio do site quando publicar.
// (localhost já é liberado por padrão; IDs simples como "vercel" dão 409 falso, por isso o "2".)
await criar("plataforma vercel", () => project.createWebPlatform({ platformId: "vercel2", name: "Vercel", hostname: "ncimoveis.vercel.app" }));

// Ninguém mais consegue criar conta: o limite é 1 usuário (o Nicola).
await project.updateUserLimitPolicy({ total: 1 });
console.log("ok       limite de 1 usuário");
console.log("\nPronto.");
