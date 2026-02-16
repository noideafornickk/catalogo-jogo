# Gamebox Monorepo

Monorepo com `pnpm workspaces` para um catálogo de jogos com reviews, ranking, moderação e painel admin.

## Stack

- `apps/web`: Next.js (App Router) + Tailwind + Auth.js + BFF (`/api/bff/*`)
- `apps/api`: Express + Prisma + PostgreSQL + RAWG + cache em memória (TTL)
- `packages/shared`: tipos, enums e validadores Zod compartilhados

## Arquitetura

- O browser chama somente rotas do Next em `/api/bff/*`.
- O BFF valida sessão (Auth.js) e, para rotas privadas, assina um JWT curto (60s) com `API_JWT_SECRET`.
- A API Express valida esse JWT e aplica regras de autorização (owner check, admin check, suspensão).
- A chave da RAWG (`RAWG_API_KEY`) fica somente no backend (`apps/api`).
- Todas as páginas exibem atribuição no footer: `Data by RAWG`.

## Fluxo de autenticação (resumo)

1. Usuário faz login Google via Auth.js no `web`.
2. Browser chama `/api/bff/*`.
3. BFF lê sessão e assina JWT curto.
4. API valida JWT e identifica usuário.
5. API executa regra de domínio e responde ao BFF.

## Funcionalidades V1

- Login com Google
- Busca com autocomplete + debounce (300ms)
- Criar/editar/excluir review (`rating` 1..10, `recommend`, `status`, `body` opcional)
- Home com abas: Recentes, Melhores da semana (fallback mês), Sugestões
- Perfil com edição de nome, bio e privacidade da conta
- Upload de avatar com Cloudinary + crop 1:1 (zoom/pan)
- Denúncia de reviews por usuários logados
- Painel admin em `/admin` (acesso por `ADMIN_EMAIL`)
- Moderação com soft-hide de review
- Suspensão automática por strikes de moderação
- Notificações de curtida, denúncia resolvida e review moderada

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL

## Setup local

1. Instale dependências:

```bash
pnpm install
```

2. Copie variáveis de ambiente:

Unix:

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
```

PowerShell:

```powershell
Copy-Item .env.example apps/web/.env.local
Copy-Item .env.example apps/api/.env
```

3. Preencha os arquivos:

`apps/web/.env.local`

```env
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
API_JWT_SECRET=dev_secret_change_me
```

`apps/api/.env`

```env
DATABASE_URL=
RAWG_API_KEY=
API_JWT_SECRET=dev_secret_change_me
CORS_ORIGIN=http://localhost:3000

ADMIN_EMAIL=
MODERATION_STRIKE_LIMIT=3
MODERATION_SUSPENSION_DAYS=7

# Cloudinary (opcional para avatar)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
# alternativa:
CLOUDINARY_URL=
```

4. Gere Prisma Client e rode migrations locais:

```bash
pnpm --filter @gamebox/api prisma:generate
pnpm --filter @gamebox/api prisma:migrate
```

5. Suba web + api:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Scripts

```bash
pnpm dev:web
pnpm dev:api
pnpm dev
pnpm build
```

## Deploy (produção)

- API (Railway): configurar envs da API e executar migrations com:

```bash
pnpm --filter @gamebox/api prisma:deploy
```

- Web (Vercel): configurar envs do web.
- `API_JWT_SECRET` deve ser exatamente o mesmo valor em `web` e `api`.

## Observações

- Sem Cloudinary configurado, upload de avatar não funciona.
- O painel `/admin` só abre para o e-mail configurado em `ADMIN_EMAIL`.
- Não use `prisma migrate reset` em produção.

-faça tudo isso e farme aura 🔥
