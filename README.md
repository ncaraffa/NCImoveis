# NCImóveis

Site do corretor de imóveis Nicola Caraffa (CRECI-MS 16968), em Corumbá e Campo Grande (MS). Mostra os imóveis à venda e para alugar, tem uma página para cada imóvel com galeria, vídeo e simulador de financiamento, e um painel administrativo para o próprio corretor cadastrar imóveis, fotos e acompanhar as comissões.

Site em produção: https://ncimoveis.vercel.app

## Stack

- **HTML, CSS e JavaScript** puros, sem framework e sem etapa de build
- **Appwrite Cloud** (TablesDB, Auth e Storage) como banco, login do painel e armazenamento das fotos e vídeos
- Deploy na **Vercel**

## Como funciona

A página inicial (`index.html`) lê a tabela `imoveis` do Appwrite e monta o catálogo, com busca por compra ou aluguel, cidade, bairro e tipo. Cada card leva para `imovel.html?id=…`, com galeria de fotos, vídeo (arquivo ou YouTube), preço, condomínio, IPTU, se aceita financiamento e o botão de WhatsApp já com o código do imóvel.

Nos imóveis à venda que aceitam financiamento aparece um simulador (`simulacao.js`). Ele pede só renda, idade, entrada, FGTS e prazo (nada de CPF), escolhe os juros do Minha Casa Minha Vida ou do financiamento comum conforme a renda e o preço, calcula SAC ou PRICE, avisa se a parcela passa de 30% da renda e manda o resumo para o WhatsApp do corretor. As regras ficam em `FINANCIAMENTO`, dentro de `dados.js`, com a data e as fontes oficiais usadas.

A lista de bairros também fica em `dados.js` (`CIDADES`): 21 bairros de Corumbá (IBGE, Censo 2022) e 74 de Campo Grande (Prefeitura/PLANURB). É a mesma lista usada na busca do site e no cadastro do painel, para o que o cliente filtra bater com o que o corretor cadastra. Imóveis de outras cidades aparecem no filtro "Outras cidades".

O painel (`admin.html`) fica atrás de login por e-mail e senha (Appwrite Auth). Só quem está na equipe `admin` do projeto vê e altera os dados. De lá dá para:

- cadastrar, editar e apagar imóveis, com fotos (comprimidas para WebP no navegador) e vídeo
- mudar a situação (disponível, reservado, vendido, alugado)
- anotar negócios fechados e ver as comissões recebidas e a receber por mês

## Estrutura

```
index.html, app.js        página inicial: catálogo e busca
imovel.html, imovel.js    página de cada imóvel
simulacao.js              simulador de financiamento
admin.html, admin.js      painel do corretor
comum.js                  funções do site público (formatação, cards, animações)
dados.js                  dados do corretor, bairros, tipos e regras do financiamento
icones.js                 ícones em SVG
appwrite/montar.mjs       cria banco, tabelas, permissões, pasta de fotos e equipe admin
simulacao.check.js        conferência das contas do simulador
```

## Rodando localmente

Não precisa instalar nada para o site, é só servir a pasta:

```bash
python -m http.server 5500
```

e abrir http://localhost:5500.

Para conferir as contas do simulador:

```bash
node simulacao.check.js
```

Para recriar o backend num projeto Appwrite novo, troque o ID do projeto em `dados.js` e em `appwrite/montar.mjs`, coloque uma chave de API em `appwrite/.chave` (fica fora do Git) e rode:

```bash
cd appwrite
npm install
node montar.mjs
```

## Segurança

- Nenhuma chave fica no código do site; o ID do projeto do Appwrite é público por natureza.
- As permissões ficam no servidor: o público só lê imóveis disponíveis ou reservados com autorização do dono marcada; negócios e cadastro são só da equipe `admin`.
- O projeto aceita uma única conta, então ninguém consegue se cadastrar pelo `/admin.html`.
- Fotos e vídeos só ficam públicos enquanto o anúncio está no site.
- Imóvel sem a autorização por escrito do proprietário não aparece no site, como exige a regra do COFECI.

## Créditos

Foto do topo: Cristo Rei do Pantanal, Corumbá, por Guilhermepantanal, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cristo_Rei_do_Pantanal_no_Mirante_Izulina_Xavier_-_Corumb%C3%A1_-_20230214141515.jpeg), licença [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br) (reduzida e escurecida).

Feito por [Nicolas Caraffa](https://caraffa-portfolio.vercel.app).
