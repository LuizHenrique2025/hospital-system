# 🚀 Guia de Testes no Postman - Hospital System API

## 📋 Pré-requisitos

1. Aplicação rodando na porta 3000
2. Banco de dados PostgreSQL configurado e rodando
3. Arquivo `.env` configurado com as variáveis de ambiente

## 🔧 Configuração Inicial

### 1. Criar arquivo `.env` (copiar do `.env.example`):
```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1h
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/hospital_db?schema=public
```

### 2. Iniciar a aplicação:
```bash
npm run start:dev
```

## 📡 Endpoints Disponíveis

### Base URL
```
http://localhost:3000
```

---

## 🔐 Autenticação (Auth)

### 1. Registrar Novo Usuário
**POST** `/auth/register`

**Body (JSON):**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "role": "ADMIN"
}
```

**Roles disponíveis:** `ADMIN`, `MEDICO`, `ATENDENTE`

**Resposta (201):**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Login
**POST** `/auth/login`

**Body (JSON):**
```json
{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Resposta (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

⚠️ **IMPORTANTE:** Copie o `access_token` da resposta para usar nos próximos requests!

---

### 3. Obter Perfil (Autenticado)
**GET** `/auth/profile`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## 👥 Usuários (Users)

⚠️ **TODOS os endpoints abaixo requerem autenticação!**

**Header obrigatório:**
```
Authorization: Bearer {access_token}
```

---

### 1. Criar Usuário (apenas ADMIN)
**POST** `/users`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Maria Santos",
  "email": "maria@example.com",
  "password": "senha123",
  "role": "MEDICO"
}
```

**Resposta (201):**
```json
{
  "id": "uuid",
  "name": "Maria Santos",
  "email": "maria@example.com",
  "role": "MEDICO",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Listar Todos os Usuários (com paginação)
**GET** `/users?page=1&limit=10`

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 10, máximo: 100)

**Exemplo:**
```
GET /users?page=1&limit=10
GET /users?page=2&limit=20
```

**Resposta (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "ADMIN",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

**Permissões:** ADMIN, MEDICO

---

### 3. Buscar Usuário por ID
**GET** `/users/:id`

**Exemplo:**
```
GET /users/123e4567-e89b-12d3-a456-426614174000
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Permissões:** ADMIN, MEDICO

---

### 4. Atualizar Usuário (completo) - apenas ADMIN
**PUT** `/users/:id`

**Body (JSON):**
```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "password": "novaSenha123",
  "role": "MEDICO"
}
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "role": "MEDICO",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

---

### 5. Atualizar Usuário (parcial) - apenas ADMIN
**PATCH** `/users/:id`

**Body (JSON) - campos opcionais:**
```json
{
  "name": "João Silva Atualizado"
}
```

ou

```json
{
  "role": "ADMIN"
}
```

ou

```json
{
  "name": "Novo Nome",
  "email": "novo@example.com",
  "password": "novaSenha123"
}
```

**Resposta (200):**
```json
{
  "id": "uuid",
  "name": "João Silva Atualizado",
  "email": "joao@example.com",
  "role": "ADMIN",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

---

### 6. Deletar Usuário - apenas ADMIN
**DELETE** `/users/:id`

**Resposta (204):** Sem conteúdo

---

## 🔑 Configurando o Token no Postman

### Opção 1: Header manual
1. Vá em **Headers** da requisição
2. Adicione:
   - **Key:** `Authorization`
   - **Value:** `Bearer {seu_token_aqui}`

### Opção 2: Variável de ambiente (Recomendado)
1. Faça login e copie o `access_token`
2. Vá em **Environments** no Postman
3. Crie/edite um ambiente
4. Adicione variável:
   - **Variable:** `token`
   - **Value:** `seu_token_aqui`
5. Na requisição, use:
   - **Key:** `Authorization`
   - **Value:** `Bearer {{token}}`

### Opção 3: Script automático (Coleção)
Crie um script na coleção para salvar automaticamente o token:

**Tests tab do POST /auth/login:**
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("token", jsonData.access_token);
    console.log("Token salvo:", jsonData.access_token);
}
```

---

## 📊 Códigos de Status HTTP

- **200** - Sucesso
- **201** - Criado com sucesso
- **204** - Sem conteúdo (DELETE)
- **400** - Bad Request (validação falhou)
- **401** - Não autorizado (token inválido/faltando)
- **403** - Proibido (sem permissão)
- **404** - Não encontrado
- **409** - Conflito (email já existe)

---

## 🎯 Fluxo Recomendado de Testes

1. **Registrar um usuário ADMIN:**
   ```
   POST /auth/register
   Body: { "name": "Admin", "email": "admin@test.com", "password": "senha123", "role": "ADMIN" }
   ```

2. **Fazer login:**
   ```
   POST /auth/login
   Body: { "email": "admin@test.com", "password": "senha123" }
   Copiar o access_token
   ```

3. **Configurar token no Postman** (Authorization Header)

4. **Testar endpoints protegidos:**
   - GET /auth/profile
   - GET /users
   - POST /users (criar outro usuário)
   - etc.

---

## 📚 Documentação Swagger

Acesse também a documentação interativa:
```
http://localhost:3000/api/docs
```

Lá você pode testar todos os endpoints diretamente no navegador!

---

## ⚠️ Erros Comuns

### 401 Unauthorized
- Token não enviado ou inválido
- Token expirado (padrão: 1 hora)
- Solução: Fazer login novamente

### 403 Forbidden
- Usuário não tem permissão para a ação
- Exemplo: Usuário MEDICO tentando criar usuário (apenas ADMIN)

### 409 Conflict
- Email já está em uso
- Solução: Use outro email ou atualize o usuário existente

### 400 Bad Request
- Validação falhou
- Verifique os campos obrigatórios no body
