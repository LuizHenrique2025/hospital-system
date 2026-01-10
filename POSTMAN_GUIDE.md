# 📚 Guia de Configuração do Postman - Hospital System API

## 🚀 Passo a Passo para Configurar

### 1. Importar a Collection no Postman

1. Abra o Postman
2. Clique em **Import** (botão no canto superior esquerdo)
3. Selecione o arquivo `Hospital_System_API.postman_collection.json`
4. Clique em **Import**

### 2. Iniciar o Servidor

Antes de testar, certifique-se de que o servidor está rodando:

```powershell
npm run start:dev
```

O servidor iniciará em: `http://localhost:3000`

### 3. Como Usar a Collection

#### 🔐 **Fluxo de Autenticação**

1. **Registrar um usuário ADMIN primeiro:**
   - Vá em `Auth > Register (Registrar Usuário)`
   - Use o body:
     ```json
     {
       "name": "Admin Sistema",
       "email": "admin@hospital.com",
       "password": "admin123",
       "role": "ADMIN"
     }
     ```
   - Clique em **Send**

2. **Fazer Login:**
   - Vá em `Auth > Login`
   - Use o body:
     ```json
     {
       "email": "admin@hospital.com",
       "password": "admin123"
     }
     ```
   - Clique em **Send**
   - ✅ **O token será salvo AUTOMATICAMENTE** na variável `accessToken`

3. **Testar Perfil:**
   - Vá em `Auth > Get Profile (Perfil)`
   - Clique em **Send**
   - Você verá seus dados de usuário

#### 👥 **Gerenciamento de Usuários**

Todas as requisições de usuários já estão configuradas com autenticação automática!

1. **Criar Usuário (apenas ADMIN):**
   - `Users > Create User (Criar Usuário - ADMIN)`
   - Clique em **Send**

2. **Listar Usuários:**
   - `Users > Get All Users (Listar Usuários)`
   - Clique em **Send**

3. **Buscar por ID:**
   - `Users > Get User By ID (Buscar por ID)`
   - Substitua `USER_ID_AQUI` pelo ID real do usuário
   - Clique em **Send**

4. **Atualizar Usuário:**
   - `Users > Update User (PUT - ADMIN)` - atualização completa
   - `Users > Partial Update User (PATCH - ADMIN)` - atualização parcial
   - Substitua `USER_ID_AQUI` pelo ID real
   - Clique em **Send**

5. **Deletar Usuário:**
   - `Users > Delete User (ADMIN)`
   - Substitua `USER_ID_AQUI` pelo ID real
   - Clique em **Send**

## 🎯 Variáveis da Collection

A collection possui duas variáveis:

- **baseUrl**: `http://localhost:3000` (URL base da API)
- **accessToken**: (vazio inicialmente, preenchido automaticamente após login)

### Como Alterar a URL Base

Se sua API estiver em outra porta:

1. Clique no nome da collection "Hospital System API"
2. Vá em **Variables**
3. Altere o valor de `baseUrl`
4. Clique em **Save**

## 🔑 Roles Disponíveis

- **ADMIN**: Acesso total (criar, editar, deletar usuários)
- **MEDICO**: Visualizar usuários
- **ENFERMEIRO**: Acesso limitado
- **ATENDENTE**: Acesso limitado

## 📝 Exemplos de Dados

### Registrar Usuário ATENDENTE
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "role": "ATENDENTE"
}
```

### Registrar Usuário MEDICO
```json
{
  "name": "Dra. Maria Santos",
  "email": "maria@example.com",
  "password": "senha123",
  "role": "MEDICO"
}
```

### Login
```json
{
  "email": "admin@hospital.com",
  "password": "admin123"
}
```

### Atualização Parcial (PATCH)
```json
{
  "name": "Nome Atualizado"
}
```

## ⚡ Recursos Automáticos da Collection

✅ **Token JWT salvado automaticamente** após login  
✅ **Autenticação Bearer configurada** em todas as rotas protegidas  
✅ **Scripts de teste** que salvam dados importantes  
✅ **Descrições detalhadas** em cada endpoint  
✅ **Query parameters** pré-configurados (paginação)

## 🛠️ Troubleshooting

### Erro 401 (Não Autorizado)
- Verifique se você fez login
- O token deve estar salvo automaticamente
- Caso contrário, faça login novamente

### Erro 403 (Sem Permissão)
- Você está tentando acessar um endpoint que requer role ADMIN
- Faça login com um usuário ADMIN

### Erro 404 (Não Encontrado)
- Verifique se o ID do usuário existe
- Copie um ID válido da lista de usuários

### Servidor não responde
- Certifique-se de que o servidor está rodando: `npm run start:dev`
- Verifique se a porta 3000 está livre
- Verifique o console do servidor para erros

## 📖 Documentação Swagger

Você também pode usar a documentação interativa do Swagger:

```
http://localhost:3000/api/docs
```

## 🎓 Dicas

1. **Sempre faça login primeiro** antes de testar rotas protegidas
2. **Use o Swagger** para ver os schemas detalhados
3. **Salve IDs de usuários** criados para usar em outras requisições
4. **Scripts automáticos** facilitam muito o workflow - o token é salvo automaticamente!

---

## 📋 Pré-requisitos

1. Aplicação rodando na porta 3000
2. Banco de dados PostgreSQL configurado e rodando
3. Arquivo `.env` configurado com as variáveis de ambiente

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
