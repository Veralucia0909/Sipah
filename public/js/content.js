/* Conteúdo do Sipah: edite aqui perguntas, arquétipos, conquistas e frases.
   Este arquivo é usado pelo jogo (index.html) e pelo telão (telao.html). */
'use strict';
/* ===================== CONTEÚDO ===================== */
const ATTR = {
  caos:{n:'Caos',c:'#ff3ea5'},
  criatividade:{n:'Criatividade',c:'#b04bff'},
  estrategia:{n:'Estratégia',c:'#2f7bff'},
  impulsividade:{n:'Impulsividade',c:'#ff7a1a'},
  social:{n:'Energia social',c:'#ffd21a'},
  teimosia:{n:'Teimosia',c:'#ff4b4b'},
  improviso:{n:'Improviso',c:'#21d4a8'},
  competitividade:{n:'Competitividade',c:'#c8f31d'}
};
const AK = Object.keys(ATTR);

const QUESTIONS = [
  {t:'Seu celular quebrou. O que você faz?', opts:[
    {t:'Abre o aparelho pra ver o que tem dentro.', p:{criatividade:1,improviso:1,caos:1}, r:'Sobrou um parafuso. Sempre sobra.'},
    {t:'Pesquisa um tutorial de 17 minutos e resolve sozinho.', p:{teimosia:2,estrategia:1}, r:'Pulou a intro? Mentira.'},
    {t:'Já desenha um modelo melhor, porque o atual é uma vergonha.', p:{criatividade:2,competitividade:1}, r:'Alguém liga pra essa pessoa.'},
    {t:'Vende o que sobrou e compra outro. Próximo problema.', p:{estrategia:1,impulsividade:2}, r:'Desapego nível monge capitalista.'}]},
  {t:'Trabalho em grupo. Qual é o seu papel?', opts:[
    {t:'Organiza tudo porque ninguém sabe fazer nada.', p:{estrategia:2,teimosia:1}, r:'E ainda faz o slide de agradecimento.'},
    {t:'Some e reaparece no dia da entrega.', p:{caos:1,improviso:2}, r:'Lenda urbana com nome no trabalho.'},
    {t:'Faz tudo sozinho e reclama de todo mundo.', p:{teimosia:2,competitividade:1}, r:'Herói incompreendido, versão PDF.'},
    {t:'Faz uma apresentação linda e esquece o conteúdo.', p:{social:2,criatividade:1}, r:'Transição nota 10. Conteúdo nota 3.'}]},
  {t:'Seu amigo manda: “precisamos conversar”. Você:', opts:[
    {t:'Já imagina 47 cenários diferentes.', p:{caos:1,estrategia:1,criatividade:1}, r:'O cenário 32 tinha até trilha sonora.'},
    {t:'Responde “fala” e volta a jogar.', p:{improviso:1,impulsividade:1,competitividade:1}, r:'Prioridades bem definidas.'},
    {t:'Manda um áudio de seis minutos.', p:{social:2,impulsividade:1}, r:'Ninguém vai ouvir em 1x.'},
    {t:'Pesquisa o significado psicológico da frase.', p:{estrategia:1,teimosia:1}, r:'Diagnóstico: ansiedade com fonte.'}]},
  {t:'Você ficou uma hora sem internet.', opts:[
    {t:'Reinicia o roteador 14 vezes.', p:{teimosia:2,impulsividade:1}, r:'A 15ª ia funcionar, com certeza.'},
    {t:'Começa a contemplar a existência.', p:{criatividade:2}, r:'Filósofo por necessidade.'},
    {t:'Descobre que tem família.', p:{social:2}, r:'Eles parecem legais, até.'},
    {t:'Considera seriamente morar na floresta.', p:{caos:1,impulsividade:1,improviso:1}, r:'Lá também não tem sinal, só avisando.'}]},
  {t:'Sobrou R$ 50.', opts:[
    {t:'Guarda pro futuro.', p:{estrategia:2}, r:'Daqui a 10 anos vale R$ 51.'},
    {t:'Compra algo que não precisava.', p:{impulsividade:2}, r:'Chega amanhã. Você nem vai lembrar o que é.'},
    {t:'Investe numa ideia duvidosa.', p:{criatividade:1,caos:1,competitividade:1}, r:'O próximo unicórnio. Ou o próximo golpe.'},
    {t:'Gasta tudo e chama de experiência.', p:{social:1,improviso:1,impulsividade:1}, r:'Experiência adquirida: sem dinheiro.'}]},
  {t:'Alguém discorda de você na internet.', opts:[
    {t:'Apresenta argumentos e fontes.', p:{estrategia:1,competitividade:2}, r:'Ninguém leu. Mas você ganhou.'},
    {t:'Manda um “fonte: vozes da sua cabeça”.', p:{caos:1,competitividade:1,impulsividade:1}, r:'Golpe crítico. 300 curtidas.'},
    {t:'Escreve um textão e apaga.', p:{criatividade:1,teimosia:1}, r:'O melhor texto que ninguém vai ler.'},
    {t:'Silencia a pessoa e segue vivendo.', p:{estrategia:1,improviso:1}, r:'Paz interior desbloqueada.'}]},
  {t:'Prova amanhã. São 23h. Você:', opts:[
    {t:'Faz resumo com marca-texto de quatro cores.', p:{estrategia:1,teimosia:2}, r:'O resumo ficou maior que o livro.'},
    {t:'Assiste uma videoaula em 2x e confia.', p:{improviso:2,impulsividade:1}, r:'A fé move montanhas. E notas.'},
    {t:'Cria um app pra estudar e não estuda.', p:{criatividade:2,caos:1}, r:'Pelo menos o app ficou bom.'},
    {t:'Monta grupo de estudo que vira grupo de meme.', p:{social:2,caos:1}, r:'400 figurinhas, zero matéria.'}]},
  {t:'Seu plano para o futuro é:', opts:[
    {t:'Tenho cinco planos e nenhum funcionando.', p:{estrategia:1,caos:2}, r:'Diversificação de fracassos.'},
    {t:'Vou descobrir no caminho.', p:{improviso:2}, r:'GPS da vida: recalculando.'},
    {t:'Ficar rico e desaparecer.', p:{competitividade:2,estrategia:1}, r:'Plano sólido. Só falta a parte do rico.'},
    {t:'Sobreviver até sexta-feira.', p:{teimosia:2}, r:'Meta realista. Respeito.'}]}
];

const ARCH = [
  {id:'caos', name:'O Caos Ambulante', w:{caos:1.6,impulsividade:1.4}, b:.47, color:'#ff3ea5', acc:'spikes',
   desc:'Você não resolve problemas. Você cria situações que depois chama de aprendizado.',
   quote:'Se deu errado, pelo menos foi rápido.',
   area:'Eletromecânica', areaWhy:'Quem vive no meio do caos acha o defeito que ninguém mais viu.'},
  {id:'ceo', name:'O CEO do Nada', w:{estrategia:1.6,social:1.4,competitividade:.4}, b:-.06, color:'#2f6bff', acc:'tie',
   desc:'Tem planilha pra tudo, reunião pra tudo e resultado pra quase nada. Mas a apresentação ficou linda.',
   quote:'Vamos alinhar isso numa call.',
   area:'Logística', areaWhy:'Organizar gente, prazo e caminhão já é o seu dom não remunerado.'},
  {id:'genio', name:'O Gênio Questionável', w:{criatividade:2,improviso:.8,caos:.4}, b:-.16, color:'#8b3dff', acc:'goggles',
   desc:'Dez ideias por minuto. Uma é genial. As outras nove explodem.',
   quote:'Confia, eu vi num vídeo.',
   area:'Automação Industrial', areaWhy:'Inventar a máquina que faz o trabalho por você é o sonho de todo gênio.'},
  {id:'prota', name:'O Protagonista', w:{competitividade:2,social:1.2,impulsividade:.6}, b:.28, color:'#ffb800', acc:'crown',
   desc:'Você não entra num lugar. Você faz uma entrada. A trilha sonora toca só na sua cabeça, mas toca alto.',
   quote:'Isso vai pro meu story.',
   area:'Design e Multimídia', areaWhy:'Se todo mundo vai olhar pra você, que olhe pra algo bem feito.'},
  {id:'clt', name:'O Sobrevivente do CLT', w:{teimosia:2,estrategia:.8}, b:-.97, color:'#5b7fe0', acc:'mug',
   desc:'Atrasado pra tudo, cansado de tudo, mas entrega. Sempre entrega. Às 23h59.',
   quote:'Só mais cinco minutinhos.',
   area:'Segurança do Trabalho', areaWhy:'Ninguém sabe melhor tudo o que pode dar errado num dia de trabalho.'},
  {id:'npc', name:'O NPC Premium', w:{improviso:2.2,teimosia:.6,social:-.4}, b:.45, color:'#21d4a8', acc:'npc',
   desc:'Parece uma pessoa comum. Repete as mesmas falas. Mas às vezes faz algo tão absurdo que vira lenda.',
   quote:'Bom dia. Bom dia. Bom dia.',
   area:'Eletricidade', areaWhy:'Calmo por fora, 220 volts por dentro.'},
  {id:'hacker', name:'O Hacker de Pijama', w:{estrategia:1.4,teimosia:1.6,social:-1,criatividade:.6}, b:-.18, color:'#00b7ff', acc:'headphones',
   desc:'Fala pouco, resolve muito, dorme às 4h. A luz da tela é o seu único bronzeado.',
   quote:'Na minha máquina funciona.',
   area:'Desenvolvimento de Sistemas', areaWhy:'Teimosia mais estratégia: a pessoa que caça um bug até as 3h e gosta.'},
  {id:'maker', name:'O Mestre da Gambiarra', w:{improviso:1.6,criatividade:1.1,impulsividade:1.1}, b:.18, color:'#ff7a1a', acc:'hardhat',
   desc:'Fita isolante, um clipe e muita fé. Se não tem a peça, você inventa a peça.',
   quote:'Não é gambiarra, é engenharia alternativa.',
   area:'Mecânica e Fabricação', areaWhy:'Transformar gambiarra em projeto de verdade é exatamente o que se aprende lá.'}
];
const archById = id => ARCH.find(a => a.id === id) || ARCH[0];

const ACH = [
  {id:'first', n:'Saiu do sofá', test:(p,r)=>p.runs>=1},
  {id:'s500', n:'500 pontos', test:(p,r)=>r.score>=500},
  {id:'s1500', n:'Imparável (por enquanto)', test:(p,r)=>r.score>=1500},
  {id:'c30', n:'Pix recebido: 30 moedas', test:(p,r)=>r.coins>=30},
  {id:'runs5', n:'Viciado(a) em boleto', test:(p,r)=>p.runs>=5}
];

const DEATH = {
  boleto:['Atropelado(a) por um boleto. Clássico.','Um boleto venceu. Literalmente.'],
  grupo:['O grupo da família te pegou. Bom dia com foto de flor pra você.','Travou no áudio de 9 minutos da tia.'],
  segunda:['Bateu de cara na segunda-feira. Todo mundo bate.','A segunda-feira chegou antes de você.']
};

const BAD = /\b(porra|caralho|merda|puta|puto|buceta|fdp|viado|bosta|cu|pau|pinto|corno|vagabund\w*|arrombad\w*|retardad\w*)\b/i;

