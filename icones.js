// Ícones em SVG (traço, cor do texto). No HTML: <i data-i="nome"></i>; no JS: ic("nome").
const ICONES = {
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  dica: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/>',
  autorizacao: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="m9 15 2 2 4-4"/>',
  salvar: '<path d="M5 3h11l5 5v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  etiqueta: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alerta: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  lixeira: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  video: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  vender: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M12 11v6M10 13.5c0-1 .9-1.5 2-1.5s2 .5 2 1.5-4 1-4 2 .9 1.5 2 1.5 2-.5 2-1.5"/>',
  documento: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M8 15v2M13 10v7M18 6v11"/>',
  voltar: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  carregando: '<path d="M21 12a9 9 0 1 1-9-9"/>',
  fone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  pino: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  conversa: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
};

const ic = (nome, classe = "") =>
  `<svg class="i ${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[nome]}</svg>`;

document.querySelectorAll("i[data-i]").forEach((el) => (el.outerHTML = ic(el.dataset.i, el.className)));
