import fs from "node:fs/promises";
const snapshot = JSON.parse(await fs.readFile("generated-artifacts/gemini-comparison-real/rss-snapshot.json","utf8"));
// Human labels and facts fixed before either model is called on this corpus.
const choices = [
  ["G1 - Globo",44,"pt",true,["chuva_enchente"],[],"Ponte submersa não é ponte desabada",
    ["Ponte da PR-554 submersa em Doutor Camargo, Paraná","Transbordamento por chuva; caminhão ficou preso","Trecho até São Jorge do Ivaí bloqueado sem previsão de liberação","84 residências sem energia; não afirmar colapso da ponte"]],
  ["G1 - Globo",77,"pt",true,["onda_calor_seca"],[],"Seca com consequência econômica",
    ["Seca e mortandade de peixes no Amapá, incluindo Bailique e Calçoene","Emergência estadual por 180 dias","Pelo menos 28 mil pescadores artesanais cadastrados; sustento ameaçado","Auxílio federal é buscado, não está anunciado como já pago"]],
  ["G1 - Globo",1,"pt",true,["chuva_enchente"],["granizo","onda_calor_seca"],"Previsão não pode virar desastre já ocorrido",
    ["Inmet alerta 69 municípios de Mato Grosso","Risco de temporais a partir de terça-feira, 27","Chuva, rajadas de até 60 km/h e possibilidade de granizo, não ocorrência confirmada","Previsão semanal de 20–60 mm; mais de 80 mm em pontos isolados; não misturar janelas"]],
  ["ONU News",10,"pt",true,["epidemia_virus"],[],"Surto humano transfronteiriço",
    ["Casos de ebola confirmados na Nigéria e no Quênia","Mais de 9,7 mil infecções e 4,7 mil mortes no surto","OMS mantém 22 países em alerta máximo","Vírus atinge novas províncias congolesas; não atribuir todos os números só à Nigéria"]],
  ["Al Jazeera",9,"en",true,["acidente_transporte"],[],"Ônibus cai em talude; não é deslizamento",
    ["80 pessoas feridas","Ônibus caiu em um talude/barranco","Perto de Barcelona","Trecho não informa causa, mortos, nacionalidades nem data exata do acidente"]],
  ["BBC News Brasil",10,"pt",false,["eleicoes_democracia"],[],"Exército digital como metáfora política",
    ["Janones e mobilização no WhatsApp na reta final da campanha de Lula","A mobilização projetou o deputado","Vitória abre disputa sobre seu peso político e lugar no novo mandato","Não descreve exército militar, guerra nem ataque hacker"]],
  ["BBC News Brasil",6,"pt",false,["eleicoes_democracia"],[],"Alegação de fraude sem evidência",
    ["Declaração de Trump sobre eleição brasileira","Manifestação na segunda-feira; disse gostar de Lula","A eleição pareceu com fraude é fala atribuída a Trump","Não apresentou evidência; não tratar fraude como fato comprovado"]],
  ["BBC News – Science",5,"en",false,[],[],"Lua cheia não é eclipse nem aurora",
    ["Fotos da Lua de outubro pelo mundo","Lua cheia apelidada Hunter's Moon","Iluminou o céu no fim de semana","Não informa eclipse, aurora ou risco espacial"]],
  ["Space.com",6,"en",false,[],[],"Explosão cósmica fora dos temas cadastrados",
    ["Astrônomos observaram uma explosão cósmica","Fenômeno é um surto de raios gama","Durou 27 dias, segundo o título","Não informa ameaça à Terra, tempestade solar ou impacto de meteoro"]],
  ["The Guardian",25,"en",true,["conflito_guerra"],["terrorismo"],"Ataque militar e atribuição à fonte",
    ["Jordânia diz ter feito ataques aéreos contra grupos armados na Síria","Retaliação por ataque de sexta-feira a igreja ortodoxa grega em Karak, que matou nove","Força aérea alega mortos, feridos e destruição de veículos","Grupos e localização precisa não especificados; alegações devem permanecer atribuídas"]],
  ["Al Jazeera",5,"en",false,[],[],"Explosão em depósito com contexto insuficiente",
    ["Grande explosão","Depósito de armas","Na Síria","Trecho não informa causa, autoria, feridos ou confronto confirmado; não inventar"]],
  ["BBC News Brasil",9,"pt",true,["crise_economica"],["eleicoes_democracia"],"Crise financeira após eleição",
    ["Dólar acima de R$ 5,40","Negociação da bolsa foi interrompida","Analistas dizem que conter a sangria depende de sinalização de ajuste nas contas públicas","Notícia aborda impactos após vitória de Lula; não inventar medidas já adotadas"]],
];
const anchors = [
  "Ribeirão transborda", "Seca provoca mortandade", "Temporais colocam 69", "Com ebola avançando",
  "80 injured after bus", "Como Janones montou", "Como governo Lula avalia",
  "Stunning photos capture", "Record breaker! Astronomers", "Jordan attacks militants",
  "Huge explosion at a weapons depot", "O que vai acontecer com dólar",
];
const cases = choices.map(([part,index,language,approved,themes,optionalThemes,scenario,facts],i)=>{
  const source=snapshot.find(f=>f.source.includes(part));
  const item=source?.items?.find(item=>item.title.includes(anchors[i]));
  if(!item?.content || !item.url) throw new Error(`Missing source ${part}:${index}`);
  return {id:String(i+1).padStart(2,"0"),scenario,language,approved,themes,optionalThemes,facts,
    source:source.source,rssUrl:source.rssUrl,retrievedAt:source.retrievedAt,...item};
});
await fs.writeFile("generated-artifacts/gemini-comparison-real/cases.json",JSON.stringify(cases,null,2));
console.log(cases.map(c=>`${c.id} | ${c.source} | ${c.publishedAt} | ${c.title} | ${c.content.length} chars`).join("\n"));
