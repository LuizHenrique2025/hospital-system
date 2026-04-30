# Hospital Revitalite

Sistema hospitalar em desenvolvimento para operacao interna do Hospital Revitalite.

## Estrutura

```text
src/
  main.ts                 # bootstrap HTTP da API
  app.module.ts           # composicao dos modulos NestJS
  config/                 # configuracoes globais da aplicacao
  infra/
    prisma/               # acesso ao banco e PrismaService
  modules/                # modulos de negocio por dominio
    agreements/
    appointments/
    audit/
    auth/
    cbhpm/
    communications/
    doctors/
    exam-orders/
    nurses/
    patients/
    pricing/
    procedures/
    sectors/
    users/

prisma/
  schema.prisma
  migrations/             # historico oficial das migrations Prisma

scripts/
  imports/                # importacoes de arquivos externos
  maintenance/            # rotinas de manutencao e sincronizacao
  reports/                # geracao de relatorios locais
  seeds/                  # carga inicial e cadastros base

frontend/                 # interface web Vite
```

## Comandos principais

```bash
npm run start:dev
npm run front:dev
npm run build
npm run build:front
```

## Rotinas operacionais

```bash
npm run seed:admin
npm run seed:foundation
npm run seed:agreements
npm run seed:communications
npm run seed:material-medication-tables
npm run import:cbhpm
npm run sync:cbhpm-procedures
npm run migrate:usernames
```

## Variaveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as configuracoes locais.

```bash
DATABASE_URL="postgresql://usuario:senha@localhost:5433/hospital_system"
FRONTEND_URL="http://localhost:5173"
JWT_SECRET="troque-este-segredo"
JWT_EXPIRES_IN="1h"
PORT=3000
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=120
AUTH_THROTTLE_LIMIT=5
AUTH_THROTTLE_BLOCK_MS=300000
```

## Padrao de organizacao

Cada modulo em `src/modules` deve concentrar controller, service, module e DTOs do proprio dominio. Dependencias tecnicas compartilhadas, como Prisma, ficam em `src/infra`. Configuracoes globais ficam em `src/config`.

As migrations permanecem em `prisma/migrations`, porque esse e o formato esperado pelo Prisma para manter o historico seguro do banco.

## Cuidados de seguranca

O CORS so aceita origens definidas em `FRONTEND_URL`. O login possui rate limiting para reduzir tentativa de forca bruta. Pacientes sao inativados por soft delete usando `PatientStatus.INACTIVE`, preservando historico assistencial e rastreabilidade.
