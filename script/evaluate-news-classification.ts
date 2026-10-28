/**
 * Opt-in semantic smoke test. Makes exactly one request per fixture (no retries),
 * uses synthetic news and never writes to the database.
 * Run: npx tsx script/evaluate-news-classification.ts --live
 */
import assert from "node:assert/strict";
import { generateAiSummary } from "../server/services/ai-news-summary";

if (!process.argv.includes("--live")) {
  console.log("Use --live para executar 8 chamadas de IA. Nenhuma notícia será salva.");
  process.exit(0);
}

const fixtures = [
  {
    name: "incêndio incidental durante ação militar",
    title: "Bombardeio militar atinge base durante guerra",
    content: "Durante a guerra, forças militares bombardearam uma base do exército adversário. O ataque com bombas causou um incêndio em um depósito de munições dentro da base. Os combates prosseguem na região. Não houve danos a florestas ou contaminação ambiental relatada.",
    required: ["conflito_guerra"], forbidden: ["incendio", "poluicao_radiacao", "terrorismo"],
  },
  {
    name: "vírus digital",
    title: "Ciberataque com vírus de computador paralisa rede elétrica nacional",
    content: "Um vírus de computador foi instalado por hackers nos servidores da rede elétrica nacional. O ciberataque comprometeu os sistemas de controle e paralisou a operação digital da rede. As autoridades investigam a invasão e trabalham na restauração dos sistemas.",
    required: ["ciberataque"], forbidden: ["epidemia_virus"],
  },
  {
    name: "incêndio ambiental de origem humana",
    title: "Incêndio criminoso destrói 20 mil hectares de floresta",
    content: "Um incêndio florestal iniciado de forma criminosa já consumiu 20 mil hectares de floresta e ameaça uma reserva ambiental. A propagação do fogo provoca danos graves à fauna e à vegetação. Equipes evacuaram comunidades próximas e combatem as chamas.",
    required: ["incendio"], forbidden: ["conflito_guerra", "terrorismo"],
  },
  {
    name: "surto biológico real",
    title: "Autoridades de saúde confirmam epidemia de vírus respiratório",
    content: "As autoridades de saúde confirmaram uma epidemia causada por um vírus respiratório com transmissão entre pessoas. Hospitais registraram milhares de internações e a saúde pública decretou emergência sanitária. A população deve seguir medidas de prevenção.",
    required: ["epidemia_virus"], forbidden: ["ciberataque"],
  },
  {
    name: "dois eventos naturais substanciais",
    title: "Terremoto e tsunami devastam cidades costeiras",
    content: "Um terremoto de magnitude 8 destruiu milhares de edifícios e deixou cidades sem acesso. Um tsunami gerado pelo sismo inundou várias cidades costeiras com ondas de dez metros. Milhares de moradores foram retirados e equipes de resgate atuam nas duas áreas atingidas.",
    required: ["terremoto", "tsunami"], forbidden: ["conflito_guerra"],
  },
  {
    name: "clima com expressão ambígua em inglês",
    title: "Rescue teams fighting to reach villages after cyclone",
    content: "Rescue teams are fighting to reach isolated villages after a powerful cyclone struck the coast. Hurricane-force winds damaged homes and roads. Emergency services evacuated thousands of people ahead of the tropical storm.",
    required: ["ciclone_tornado"], forbidden: ["conflito_guerra"],
  },
  {
    name: "vitória eleitoral não é deslizamento",
    title: "Opposition wins landslide victory in contested national election",
    content: "The opposition won a landslide victory in a contested national election. Electoral authorities ordered a nationwide recount after documented fraud allegations. The result may change the country's democratic institutions and the government has agreed to an independent electoral review.",
    required: ["eleicoes_democracia"], forbidden: ["deslizamento"],
  },
  {
    name: "evidência insuficiente exige abstenção",
    title: "Autoridades investigam incidente",
    content: "As autoridades receberam relatos sobre um incidente. Ainda não se sabe o que aconteceu, onde ocorreu ou se houve algum dano. Não foram divulgados detalhes que permitam identificar o tipo de acontecimento.",
    required: [], forbidden: [], empty: true,
  },
];

let failures = 0;
for (const fixture of fixtures) {
  const result = await generateAiSummary(fixture.title, fixture.content, !fixture.title.match(/^(Rescue|Opposition)/));
  try {
    assert.ok(result, "a chamada precisa retornar JSON válido");
    for (const tag of fixture.required) assert.ok(result.tags.includes(tag), `tema obrigatório ausente: ${tag}`);
    for (const tag of fixture.forbidden) assert.ok(!result.tags.includes(tag), `tema indevido: ${tag}`);
    if (fixture.empty) assert.deepEqual(result.tags, []);
    console.log(`PASS ${fixture.name}: ${result.tags.join(", ") || "sem classificação"}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${fixture.name}: ${error instanceof Error ? error.message : error}`);
    console.error(JSON.stringify(result?.decisions ?? []));
  }
}
console.log(`${fixtures.length - failures}/${fixtures.length} casos semânticos aprovados; ${fixtures.length} chamadas, sem gravar no banco.`);
process.exitCode = failures ? 1 : 0;
