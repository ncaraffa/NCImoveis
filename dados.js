// Tudo que muda no site fica aqui: dados do corretor e conexão com o banco.

// Projeto no Appwrite. O ID é público por natureza; quem protege os dados são as
// permissões das tabelas (ver appwrite/montar.mjs).
const APPWRITE = { endpoint: "https://nyc.cloud.appwrite.io/v1", projeto: "6ae700a0003712b2e96c", banco: "site" };

// Código curto do anúncio a partir do contador automático da linha: NC-101, NC-102...
const linha = (r) => ({ ...r, id: r.$id, codigo: r.$sequence ? `NC-${100 + Number(r.$sequence)}` : "" });

const CORRETOR = {
  nome: "Nicola Caraffa",
  creci: "CRECI-MS 16968",
  whatsapp: "5567984845256", // só números: 55 + DDD + número
  telefone: "(67) 98484-5256",
  email: "nicolacaraffa@gmail.com",
  regiao: "Corumbá, Campo Grande e região",
  instagram: "https://instagram.com/nicolaimoveis",
};

// Tipos de imóvel e bairros: a MESMA lista vale para a busca do site e para o cadastro no painel.
const TIPOS = ["Casa", "Apartamento", "Terreno", "Comercial", "Rural"];
const OUTRAS = "outras"; // valor do filtro "Outras cidades" (tudo que não está em CIDADES)
// Bairros oficiais (pesquisa do Codex, 01/11/2026): Corumbá pelo IBGE/Censo 2022 (SIDRA tabela 9923);
// Campo Grande pela Prefeitura/PLANURB (LC 74/2005 e alterações). Para incluir um bairro, é só por aqui.
const CIDADES = {
  "Corumbá": [
    "Aeroporto", "Arthur Marinho", "Beira-Rio", "Borrowsky", "Centro", "Centro-América", "Cervejaria",
    "Cristo Redentor", "Dom Bosco", "Generoso", "Guarani", "Guatós", "Industrial", "Jardim dos Estados",
    "Maria Leite", "Nossa Senhora de Fátima", "Nova Corumbá", "Popular Nova", "Popular Velha", "Previsul",
    "Universitário",
  ],
  "Campo Grande": [
    "Aero Rancho", "Alves Pereira", "Amambaí", "América", "Autonomista", "Bandeirantes", "Batistão",
    "Bela Vista", "Cabreúva", "Caiçara", "Caiobá", "Carandá", "Carlota", "Carvalho", "Centenário", "Centro",
    "Centro-Oeste", "Chácara Cachoeira", "Chácara dos Poderes", "Coophavila II", "Coronel Antonino",
    "Cruzeiro", "Dr. Albuquerque", "Estrela Dalva", "Glória", "Guanandi", "Itanhangá", "Jacy",
    "Jardim dos Estados", "Jardim Paulista", "Jockey Club", "José Abrão", "Lageado", "Leblon", "Los Angeles",
    "Margarida", "Maria Aparecida Pedrossian", "Mata do Jacinto", "Mata do Segredo", "Monte Castelo",
    "Monte Líbano", "Moreninha", "Nasser", "Noroeste", "Nova Campo Grande", "Nova Lima", "Novos Estados",
    "Núcleo Industrial", "Panamá", "Parati", "Pioneiros", "Piratininga", "Planalto", "Popular",
    "Rita Vieira", "Santa Fé", "Santo Amaro", "Santo Antônio", "São Bento", "São Conrado", "São Francisco",
    "São Lourenço", "Seminário", "Sobrinho", "Taquarussu", "Tarumã", "Taveirópolis", "Tijuca", "Tiradentes",
    "TV Morena", "União", "Universitário", "Veraneio", "Vilasboas",
  ],
};

// Regras do simulador de financiamento (pesquisa do Codex em 01/11/2026, fontes oficiais:
// Caixa, Banco Central, Ministério das Cidades). Atualizar quando os bancos mudarem as taxas.
const FINANCIAMENTO = {
  atualizado: "novembro de 2026",
  sbpe: 10.99, // % ao ano efetiva + TR, "a partir de" na Caixa
  // Minha Casa Minha Vida, Centro-Oeste, taxa de quem não é cotista do FGTS (% ao ano nominal).
  // teto = valor máximo do imóvel; nas faixas 1/2 usamos o menor teto de MS (210 mil) por segurança.
  mcmv: [
    { ate: 2160, juros: 4.75, faixa: "Faixa 1", teto: 210000 },
    { ate: 2850, juros: 5.0, faixa: "Faixa 1", teto: 210000 },
    { ate: 3200, juros: 5.25, faixa: "Faixa 1", teto: 210000 },
    { ate: 3500, juros: 5.5, faixa: "Faixa 2", teto: 210000 },
    { ate: 4000, juros: 6.0, faixa: "Faixa 2", teto: 210000 },
    { ate: 5000, juros: 7.0, faixa: "Faixa 2", teto: 210000 },
    { ate: 9600, juros: 8.16, faixa: "Faixa 3", teto: 400000 },
    { ate: 13000, juros: 10.0, faixa: "Classe Média", teto: 600000 },
  ],
  cota: { SAC: 0.8, PRICE: 0.7 }, // parte do imóvel que o banco costuma financiar
  rendaMax: 0.3, // parcela até 30% da renda bruta
  prazoMax: 420, // meses
  idadeMaisPrazo: 80.5, // anos
};
