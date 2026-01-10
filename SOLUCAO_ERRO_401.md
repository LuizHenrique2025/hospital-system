# 🔧 GUIA DE SOLUÇÃO - ERRO 401 GET PROFILE

## ⚠️ PROBLEMA IDENTIFICADO
O erro 401 no Get Profile significa que o token JWT não está sendo enviado corretamente ou está inválido.

## ✅ SOLUÇÃO PASSO A PASSO NO POSTMAN

### PASSO 1: Verificar o Token no Login
1. Abra: `Auth > Login`
2. No Postman, clique em **Console** (canto inferior esquerdo) OU vá em `View > Show Postman Console`
3. Faça o login
4. No Console, você DEVE ver:
   ```
   ✅ Login realizado! Token salvo: eyJhbGc...
   ```
5. Se NÃO aparecer essa mensagem:
   - Delete a collection
   - Reimporte o arquivo `Hospital_System_API.postman_collection.json`

### PASSO 2: Verificar Variável accessToken
1. Clique no nome da collection: **Hospital System API** (na lateral esquerda)
2. Vá na aba **Variables**
3. Procure a variável `accessToken`
4. Ela DEVE ter um valor longo começando com `eyJ...`
5. Se estiver VAZIA:
   - Copie o `access_token` da resposta do Login
   - Cole no campo **Current Value** da variável `accessToken`
   - Clique em **Save** (Ctrl+S)

### PASSO 3: Configurar Get Profile Manualmente
1. Abra: `Auth > Get Profile (Perfil)`
2. Vá na aba **Authorization**
3. Verifique:
   - **Type**: `Bearer Token`
   - **Token**: `{{accessToken}}`
4. Se estiver diferente, corrija e salve

### PASSO 4: Teste Manual (Sem Variável)
Se ainda não funcionar, teste SEM usar a variável:

1. Faça o Login e COPIE o `access_token` completo da resposta
2. Vá em `Get Profile`
3. Em **Authorization**:
   - Type: `Bearer Token`
   - Token: COLE O TOKEN INTEIRO (não use {{accessToken}})
4. Clique em **Send**

Se funcionar assim, o problema é que a variável não está sendo salva!

## 🔍 VERIFICAÇÃO DO SERVIDOR

Certifique-se de que o servidor está rodando:
```powershell
npm run start:dev
```

Você deve ver:
```
🚀 Aplicação rodando na porta 3000
📚 Documentação Swagger: http://localhost:3000/api/docs
```

## 📋 CHECKLIST COMPLETO

- [ ] Servidor está rodando (npm run start:dev)
- [ ] Collection foi REIMPORTADA (delete a antiga primeiro)
- [ ] Criou um NOVO usuário (email diferente do anterior)
- [ ] Login retorna 200 e um access_token
- [ ] Postman Console está aberto e mostra mensagem de sucesso
- [ ] Variável accessToken tem valor na collection
- [ ] Authorization do Get Profile está configurado como Bearer Token
- [ ] Token é {{accessToken}} OU o token completo colado

## 🎯 TESTE RÁPIDO

Execute este fluxo:

**1. Register:**
```json
POST http://localhost:3000/auth/register

{
  "name": "Novo Teste",
  "email": "novo@teste.com",
  "password": "123456",
  "role": "ADMIN"
}
```
Resultado esperado: 201 Created

**2. Login:**
```json
POST http://localhost:3000/auth/login

{
  "email": "novo@teste.com",
  "password": "123456"
}
```
Resultado esperado: 200 OK + `{ "access_token": "eyJ..." }`

**3. Get Profile:**
```
GET http://localhost:3000/auth/profile
Header: Authorization: Bearer eyJhbGc... (cole o token do passo 2)
```
Resultado esperado: 200 OK + seus dados

## ❓ AINDA COM ERRO?

Me envie:
1. A resposta COMPLETA do Login (incluindo o access_token)
2. Print da aba **Variables** da collection
3. Print da aba **Authorization** do Get Profile
4. A mensagem que aparece no Postman Console após o Login
