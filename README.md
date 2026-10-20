# Sipah

Corre que o algoritmo tá te julgando.

O visitante lê o QR code, responde um quiz sarcástico de 8 perguntas, descobre que tipo de problema ele é (e qual área do SENAI combina com ele), ganha um avatar 3D e corre contra o estande inteiro. O telão mostra o ranking ao vivo.

- **PWA:** dá para instalar no celular como app e funciona offline.
- **Responsivo:** celular em pé e deitado, tablet, notebook e TV.
- **Sem cadastro:** só um apelido, sem nome, e-mail ou telefone (LGPD tranquila para público menor de idade).

---

## Como rodar

Precisa do **Node.js 18 ou mais novo** ([nodejs.org](https://nodejs.org)).

```bash
npm install
npm start
```

O terminal mostra dois endereços:

```
  Jogo (celulares):  http://192.168.0.10:3000/
  Telão:             http://192.168.0.10:3000/telao.html
```

1. Abra o endereço do **telão** no computador ligado à TV e aperte F11 (tela cheia).
2. Os visitantes escaneiam o **QR code** do telão. Ele já aponta para o endereço certo.

Os celulares precisam estar **na mesma rede Wi-Fi** do computador.

---

## Duas formas de usar no Mundo SENAI

### A) Rede local no estande (recomendado para o dia)

Leve um **roteador próprio**. O Wi-Fi de evento costuma ser lotado e às vezes bloqueia conexões entre aparelhos.

1. Ligue o notebook no roteador e rode `npm start`.
2. Deixe o telão aberto. Os visitantes conectam no Wi-Fi do estande e escaneiam o QR.

Tudo funciona **sem internet**: Three.js, fontes e Socket.io são servidos pelo próprio notebook.

> **Limitação:** no endereço `http://192.168...` o navegador **não oferece "Instalar app"**. Os navegadores só permitem instalar PWA em **HTTPS**. O jogo funciona normalmente, só sem o botão de instalar.

### B) Online com HTTPS (para instalar como app)

Publique num serviço gratuito com HTTPS e WebSocket, como o [Render](https://render.com):

1. Suba esta pasta num repositório no GitHub.
2. No Render: **New → Web Service**, escolha o repositório.
   - Build command: `npm install`
   - Start command: `npm start`
3. Em **Environment**, crie `PUBLIC_URL` com o endereço que o Render der (ex.: `https://sipah.onrender.com/`). É esse endereço que vai no QR code.

Aí o celular mostra **"Instalar o app"** (Android/Chrome) ou a dica **"Adicionar à Tela de Início"** (iPhone/Safari).

> No plano grátis do Render, o servidor "dorme" depois de 15 minutos parado e o arquivo de ranking é apagado quando o servidor reinicia. Para o dia do evento, abra o telão antes e mantenha alguém jogando. Para guardar dados de verdade, troque o arquivo JSON por um banco (ex.: Supabase/PostgreSQL).

---

## Estrutura

```
sipah/
├── server.js              Servidor: Express + Socket.io, valida pontuação, salva o ranking
├── package.json
├── data/sipah.json        Jogadores e corridas (criado automaticamente)
└── public/
    ├── index.html         O jogo
    ├── telao.html         Tela do telão (ranking ao vivo + QR code)
    ├── manifest.webmanifest   Configuração do PWA (nome, ícones, cores)
    ├── sw.js              Service worker (cache offline)
    ├── icons/             Ícones do app
    ├── css/style.css      Visual e layout responsivo
    └── js/
        ├── content.js     ← PERGUNTAS, ARQUÉTIPOS, CONQUISTAS E FRASES (edite aqui!)
        ├── game.js        Quiz, avatar 3D, corrida, telas
        ├── net.js         Conexão com o servidor (e modo offline)
        ├── pwa.js         Instalação do app
        └── telao.js       Lógica do telão
```

---

## Como editar o conteúdo

Quase tudo que a equipe vai querer mudar está em **`public/js/content.js`**.

**Mudar uma pergunta:** cada alternativa tem o texto (`t`), os pontos que soma em cada atributo (`p`) e o comentário zoeiro que aparece depois (`r`):

```js
{t:'Abre o aparelho pra ver o que tem dentro.', p:{criatividade:1,improviso:1,caos:1}, r:'Sobrou um parafuso. Sempre sobra.'},
```

Atributos disponíveis: `caos`, `criatividade`, `estrategia`, `impulsividade`, `social`, `teimosia`, `improviso`, `competitividade`.

**Mudar a área do SENAI de um arquétipo:** altere `area` e `areaWhy` no arquétipo, dentro de `ARCH`.

**Como o arquétipo é escolhido:** cada arquétipo tem pesos (`w`) por atributo e um ajuste (`b`). O jogo soma os pontos das respostas, calcula a nota de cada arquétipo e escolhe a maior. Os ajustes `b` foram calibrados testando todas as 65.536 combinações possíveis de respostas, para que cada um dos 8 arquétipos saia em ~12,5% dos casos. **Se mudar perguntas ou pesos, a distribuição muda.** Vale testar com a turma para ver se algum perfil está saindo demais.

> **Depois de editar qualquer arquivo de `public/`,** abra `public/sw.js` e aumente a versão (`sipah-v1` → `sipah-v2`). Senão os celulares que já abriram o jogo continuam com a versão antiga guardada.

---

## Regras da pontuação

- **Pontos** = metros corridos + 10 × moedas.
- A velocidade começa em 14 m/s e sobe até 34 m/s.
- **O servidor mede o tempo da corrida sozinho** e recusa distâncias impossíveis para aquele tempo. Mandar pontuação falsa pelo console não funciona.
- O ranking do telão mostra a **melhor corrida de cada jogador no dia**.

## Comandos úteis no dia

**Zerar o ranking de hoje:** inicie com uma senha de administrador:

```bash
ADMIN_KEY=minhasenha npm start
```

e depois:

```bash
curl -X POST http://localhost:3000/api/reset -H "Content-Type: application/json" -d '{"key":"minhasenha"}'
```

No Windows (PowerShell): `$env:ADMIN_KEY="minhasenha"; npm start`

**Zerar tudo:** pare o servidor e apague `data/sipah.json`.

**Próximo visitante no mesmo celular:** no lobby, toque duas vezes em "Novo jogador".

---

## O que já está pronto e o que não está

| Pronto | Ainda não |
|---|---|
| Quiz com 8 perguntas e 8 arquétipos | Multiplayer na mesma corrida (cada um corre sozinho e compete no ranking) |
| Avatar 3D modular gerado pelas respostas | Frase personalizada por IA (as frases são fixas por arquétipo) |
| Corrida de 3 faixas com 3 tipos de obstáculo | Loja e cosméticos |
| Ranking ao vivo no telão, validado pelo servidor | Amigos e salas privadas |
| XP, nível, recorde e conquistas | Sons |
| Card 9:16 para story | |
| PWA instalável e offline | |

## Controles

| | Celular | Teclado |
|---|---|---|
| Trocar de faixa | Deslizar ← → | ← → ou A D |
| Pular | Deslizar ↑ ou tocar | ↑, W ou espaço |
| Deslizar | Deslizar ↓ | ↓ ou S |

Obstáculos: **Boleto** (pule), **Grupo da Família** (deslize por baixo), **Segunda-feira** (troque de faixa).
