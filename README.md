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

## Ranking global (Supabase) e modo estande

O jogo escolhe sozinho onde guardar o ranking:

| Modo | Quando | Onde fica o ranking |
|---|---|---|
| **Global** | Tem internet (Vercel, celular com 4G, Wi-Fi do evento) | Banco **Supabase**, projeto `sipah`. Todo mundo vê o mesmo ranking, de qualquer lugar |
| **Estande** | Sem internet, com o notebook rodando `npm start` | Servidor local com Socket.io, arquivo `data/sipah.json` |
| **Offline** | Nenhum dos dois responde | Só no próprio celular |

A configuração fica em **`public/js/config.js`**. Para forçar o modo estande, deixe `supabaseUrl: ''`.

### Como o banco protege o ranking

- As tabelas (`sipah_players`, `sipah_runs`, `sipah_run_tokens`) ficam **fechadas**: ninguém lê nem grava direto nelas.
- O jogo só consegue chamar 4 funções: `sipah_join`, `sipah_run_start`, `sipah_run_finish` e `sipah_state`.
- Ao começar a corrida, o banco entrega um "bilhete" com a hora. Ao terminar, ele mede o tempo sozinho e **recusa pontuação impossível**. Cada bilhete vale uma vez só.
- A chave em `config.js` é do tipo *publishable*: foi feita para ficar no navegador e só dá acesso a essas funções.

### Publicar na Vercel

O arquivo `vercel.json` manda a Vercel publicar a pasta `public/` como site. É só enviar para o GitHub (`git push`) e a Vercel atualiza sozinha. O QR code do telão usa o endereço do próprio site (ex.: `https://sipah.vercel.app/`).

### No estande sem internet

Leve um roteador próprio, ligue o notebook nele e rode `npm start`. Abra o telão pelo endereço que aparece no terminal. Se não houver internet, o jogo cai sozinho para o servidor local.

> No endereço `http://192.168...` o navegador não oferece "Instalar app" (PWA só instala em HTTPS). Na Vercel, instala normalmente.

---

## Estrutura

```
sipah/
├── server.js              Servidor LOCAL do estande: Express + Socket.io (plano B sem internet)
├── vercel.json            Publica a pasta public/ na Vercel
├── package.json
├── data/sipah.json        Jogadores e corridas (criado automaticamente)
└── public/
    ├── index.html         O jogo
    ├── telao.html         Tela do telão (ranking ao vivo + QR code)
    ├── manifest.webmanifest   Configuração do PWA (nome, ícones, cores)
    ├── sw.js              Service worker (cache offline)
    ├── icons/             Ícones do app
    ├── fonts/             Fontes (Rubik, Lilita One, Permanent Marker)
    ├── vendor/            Three.js (3D) e gerador de QR code
    ├── css/style.css      Visual e layout responsivo
    └── js/
        ├── config.js      Endereço do banco (Supabase) e do QR code
        ├── content.js     ← PERGUNTAS, ARQUÉTIPOS, CONQUISTAS E FRASES (edite aqui!)
        ├── game.js        Quiz, avatar 3D, corrida, telas
        ├── net.js         Conexão com o ranking: global, estande ou offline
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
- **O banco (ou o servidor local) mede o tempo da corrida sozinho** e recusa distâncias impossíveis para aquele tempo. Mandar pontuação falsa pelo console não funciona.
- O ranking do telão mostra a **melhor corrida de cada jogador no dia**.

## Comandos úteis no dia

**Zerar o ranking global de hoje:** no painel do Supabase, projeto `sipah`, abra o *SQL Editor* e rode:

```sql
delete from sipah_runs where created_at >= sipah_today_start();
```

**Zerar o ranking do servidor local:** inicie com uma senha de administrador:

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
| Ranking global salvo no Supabase, validado pelo banco | Amigos e salas privadas |
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
