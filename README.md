# Gamebox Monorepo

Monorepo com `pnpm workspaces` para stack completa com BFF no Next.js, API Express, Prisma/Postgres e integracao RAWG.

## Estrutura

- `apps/web`: Next.js (App Router) + Tailwind + Auth.js (Google) + BFF (`/api/bff/*`)
- `apps/api`: Express + Prisma + Postgres + integração RAWG + cache em memória TTL
- `packages/shared`: tipos, enums e validadores (`zod`) compartilhados

## Arquitetura (BFF + JWT curto)

- O browser chama apenas rotas do Next em `/api/bff/*`.
- O BFF assina um JWT de 60s com `API_JWT_SECRET` para chamadas privadas a API Express.
- A API Express valida esse JWT e aplica owner check nas operacoes privadas.
- `RAWG_API_KEY` existe somente no backend (`apps/api`).
- Todas as paginas exibem atribuicao: `Data by RAWG`.

## Setup local

1. Instale dependencias:

```bash
pnpm install
```

2. Copie as variaveis de ambiente.

No terminal Unix:

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
```

No PowerShell:

```powershell
Copy-Item .env.example apps/web/.env.local
Copy-Item .env.example apps/api/.env
```

3. Edite os arquivos e preencha os valores reais:

- `apps/web/.env.local`
  - `AUTH_GOOGLE_ID`
  - `AUTH_GOOGLE_SECRET`
  - `AUTH_SECRET`
  - `NEXTAUTH_URL` (ex.: `http://localhost:3000`)
  - `API_BASE_URL`
  - `API_JWT_SECRET`
- `apps/api/.env`
  - `DATABASE_URL`
  - `RAWG_API_KEY`
  - `API_JWT_SECRET`
  - `CORS_ORIGIN`
  - `ADMIN_EMAIL` (email Google unico com acesso ao painel `/admin`)
  - `MODERATION_STRIKE_LIMIT` (default recomendado: `3`)
  - `MODERATION_SUSPENSION_DAYS` (default recomendado: `7`)
  - `CLOUDINARY_CLOUD_NAME` (opcional, para upload de avatar)
  - `CLOUDINARY_API_KEY` (opcional, para upload de avatar)
  - `CLOUDINARY_API_SECRET` (opcional, para upload de avatar)
  - `CLOUDINARY_URL` (opcional, alternativa aos 3 campos acima)

4. Gere Prisma Client e rode migracoes:

```bash
pnpm --filter @gamebox/api prisma:generate
pnpm --filter @gamebox/api prisma:migrate
```

5. Rode web + api:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Comandos

```bash
pnpm dev:web
pnpm dev:api
pnpm dev
pnpm build
```

## Fluxos V1 implementados

- Login Google (Auth.js)
- Busca com autocomplete + debounce (300ms)
- Criar review (`rating` inteiro 1..10, `recommend`, `status`, `body` opcional)
- Home com abas: recentes, melhores da semana (fallback mês), sugestões (cache 24h)
- Editar/excluir review propria
- Perfil com edicao apenas de bio
- Perfil com alteracao de avatar (Cloudinary) com crop 1:1, zoom e pan
- Denúncia de review por usuários logados + painel admin em `/admin`
- Moderacao por soft-hide de reviews (review oculta some dos feeds publicos)
- Suspensão automática por moderação: ao acumular `MODERATION_STRIKE_LIMIT` reviews ocultas, a conta fica suspensa por `MODERATION_SUSPENSION_DAYS`
- Atribuicao RAWG no footer em todas as paginas
