# CriaSplit — Spotify Genre Splitter

> Organize automaticamente sua playlist **###** (ou qualquer outra) em playlists menores por **gênero** — direto do console do navegador.

---

## 📌 Visão geral rápida

CriaSplit:

* Busca a playlist especificada no seu perfil (ex.: `###`).
* Lê todas as faixas (paginação automática).
* Consulta os artistas para obter seus `genres`.
* Agrupa as faixas por gênero (usa o primeiro gênero disponível do(s) artista(s)).
* Cria uma playlist por gênero e adiciona as faixas (em lotes).
* Trata limites de taxa (retry em 429) e pausa entre batches para reduzir erros.

---

## ✨ Recursos

* Totalmente automatizado — roda no console do navegador.
* Paginação suportada (funciona com playlists grandes, ex.: 384 músicas).
* Agrupamento por gênero via API de artistas do Spotify.
* Criação automática de playlists e adição em lotes (<=100 por requisição).
* Pequeno tratamento de rate-limit e re-tentativas.

---

## 🧾 Pré-requisitos

1. Conta Spotify com a playlist **no seu perfil** (não funciona em playlists de terceiros que não estejam na sua conta).
2. Token OAuth válido com os scopes apropriados (veja **Permissões** abaixo).
3. Estar logado no Spotify Web Player em uma aba do navegador.
4. Abrir o console do navegador (F12 / Ctrl+Shift+K no Firefox, Ctrl+Shift+J no Chrome).

---

## 🔐 Permissões (scopes) necessárias

O token que você usar precisa incluir ao menos:

* `playlist-read-private` — ler playlists privadas do usuário.
* `playlist-modify-private` e/ou `playlist-modify-public` — para criar/editar playlists privadas/públicas.
* `user-read-private` / `user-read-email` (opcional) para obter infos do usuário se quiser.

> Dica: use Authorization Code Flow (OAuth) para gerar um token com os scopes acima. Tokens temporários gerados via ferramentas de dev podem expirar rapidamente — prefira um fluxo de autenticação correto.

---

## 📥 Como usar (passo a passo)

1. Abra o Spotify Web Player e confirme que você está logado.
2. Abra o console do navegador (F12).
3. Cole o script da ferramenta (o script que você já tem, com `###` de placeholder) no console.
4. Substitua `const token = \`###\`;\` pelo seu token válido (ou cole antes de colar o script).
5. Substitua `const PLAYLIST_NAME = '###';` por `const PLAYLIST_NAME = '###';` (ou o nome da sua playlist).
6. Pressione Enter para executar.
7. Aguarde — o script mostrará logs no console (procura playlist, leitura de faixas, criação de playlists, etc).

**Exemplo** (trecho):

```js
const token = `###`;
const PLAYLIST_NAME = '###';
```

---

## ⚙️ Opções configuráveis (no topo do script)

* `CREATE_PUBLIC` — `true` para playlists públicas; `false` para privadas.
* `DESCRIPTION_PREFIX` — prefixo da descrição das playlists criadas.
* Timeouts/retries: o script já faz re-tries automáticos em 429/5xx; você pode ajustar delays no código se desejar.

---

## 🧠 Comportamento & decisões de design

* Quando um artista possui vários gêneros, o script escolhe o **primeiro** gênero retornado pelo endpoint `GET /v1/artists`.
* Quando nenhum gênero é encontrado para os artistas de uma faixa, ela vai para o gênero `Unknown`.
* O nome das playlists criadas segue o padrão:
  `PLAYLIST_NAME — <Genre>`
  Ex.: `### — indie pop`
* Cada playlist nova é limitada a 100 faixas por requisição (limitação da API). O script faz paginamento para adicionar todas.

---

## 🚨 Limites, risco e boas práticas

* **Rate limits**: o Spotify pode retornar `429` (Too Many Requests). O script suporta retry — se ocorrerem muitos erros, aguarde alguns minutos.
* **Token expira**: se receber 401, gere novo token com os scopes corretos.
* **Privacidade**: faça isso apenas em playlists que você controla ou tem permissão para modificar.
* **Cautela**: o script cria possivelmente dezenas de playlists dependendo dos gêneros. Ajuste se quiser limitar o número de playlists criadas.

---

## 🧾 Troubleshooting rápido

* **Erro 401 (Unauthorized)**: token inválido/expirado; gere token novo com os scopes listados.
* **Playlist não encontrada**: verifique se a playlist está no seu perfil e se o nome exato foi usado. O script procura pelo nome exato (case-sensitive).
* **Muitas playlists pequenas**: ative a opção de mesclar gêneros pequenos (posso adicionar esta feature).
* **Falhou ao criar playlist**: verifique scopes e se você excedeu quotas da API.

---

## 🧪 Exemplo de saída esperada (logs do console)

```
Obtendo perfil do usuário...
Usuário: ###
Procurando playlist chamada "###"...
Playlist encontrada: ### ( ### ) total tracks: ###
Lendo faixas da playlist (paginação) ...
Faixas válidas para processar: ###
Artistas únicos a consultar: ###
Agrupamento por gênero concluído. Nº gêneros: ###
Criada playlist: ### — indie
Adicionando ### faixas à playlist "### — indie"...
Concluído indie: ### faixas adicionadas.
Processo finalizado. Playlists criadas: ###
Resumo:
indie => ### — indie (https://open.spotify.com/playlist/xxxx)
...
```

---

## 🔧 Exemplo de alteração rápida

Se quiser juntar gêneros com menos de 8 faixas em `### — Misc`, substitua a parte onde `grouped` é usada por:

```js
// após agrupamento por gênero
const MIN_FOR_OWN_PLAYLIST = 8;
const misc = [];
for (const [genre, uris] of grouped.entries()) {
  if (uris.length < MIN_FOR_OWN_PLAYLIST) {
    misc.push(...uris);
    grouped.delete(genre);
  }
}
if (misc.length) grouped.set('Misc', misc);
```

---

## 📬 Contato & Contribuição

* Telegram: [t.me/lalaio1](https://t.me/lalaio1)
* GitHub: [github.com/lalaio1](https://github.com/lalaio1)
