# Script de teste de autenticação
Write-Host "`n=== TESTE DE AUTENTICAÇÃO ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`nFazendo login..." -ForegroundColor Yellow
$loginData = @{
    email = "auto@test.com"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginData
    
    $token = $loginResponse.access_token
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Cyan
    
    # 2. Testar Get Profile
    Write-Host "`nTestando Get Profile..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/profile" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ Profile obtido com sucesso!" -ForegroundColor Green
    Write-Host ($profileResponse | ConvertTo-Json) -ForegroundColor White
    
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host "`n=== FIM DO TESTE ===" -ForegroundColor Cyan
