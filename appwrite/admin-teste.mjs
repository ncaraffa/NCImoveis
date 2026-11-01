// Login de teste extra no painel.  node admin-teste.mjs criar <email>  |  node admin-teste.mjs tirar <email>
// "tirar" apaga o usuário e volta o limite para 1 (só o Nicola).
import { Client, Users, Teams, Project, Query, ID } from "node-appwrite";

const client = new Client().setEndpoint("https://nyc.cloud.appwrite.io/v1").setProject("6ae700a0003712b2e96c").setKey(process.env.APPWRITE_KEY);
const users = new Users(client);
const teams = new Teams(client);
const project = new Project(client);
const [acao, email] = process.argv.slice(2);

const achado = (await users.list({ queries: [Query.equal("email", email)] })).users[0];
if (acao === "criar") {
  await project.updateUserLimitPolicy({ total: 2 });
  const u = achado || (await users.create({ userId: ID.unique(), email, name: "Teste" }));
  await teams.createMembership({ teamId: "admin", roles: ["owner"], userId: u.$id }).catch((e) => {
    if (e.code !== 409) throw e;
  });
  console.log("criado", email);
} else if (acao === "tirar") {
  if (achado) await users.delete({ userId: achado.$id });
  await project.updateUserLimitPolicy({ total: 1 });
  console.log("tirado", email);
}
