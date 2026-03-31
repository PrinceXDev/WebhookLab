# Test Webhook Signature Verification
# Usage: .\scripts\test-signatures.ps1 -Provider stripe -Slug your-slug -Secret your-secret

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('stripe', 'github', 'shopify')]
    [string]$Provider,
    
    [Parameter(Mandatory=$true)]
    [string]$Slug,
    
    [Parameter(Mandatory=$true)]
    [string]$Secret,
    
    [string]$Url = "http://localhost:4000"
)

function Test-StripeWebhook {
    param($Slug, $Secret, $Url)
    
    Write-Host "🧪 Testing Stripe webhook signature verification..." -ForegroundColor Cyan
    
    $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
    
    $payload = @{
        id = "evt_test_webhook_$(Get-Random)"
        object = "event"
        type = "payment_intent.succeeded"
        data = @{
            object = @{
                id = "pi_test_$(Get-Random)"
                amount = 5000
                currency = "usd"
                status = "succeeded"
                customer = "cus_test"
                description = "Test payment"
            }
        }
        created = $timestamp
    } | ConvertTo-Json -Depth 10
    
    # Compute Stripe signature
    $signedPayload = "$timestamp.$payload"
    $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signedPayload))
    $signature = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
    
    Write-Host "📝 Payload:" -ForegroundColor Yellow
    Write-Host $payload
    Write-Host ""
    Write-Host "🔐 Signature: t=$timestamp,v1=$signature" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $response = Invoke-WebRequest -Uri "$Url/hook/$Slug" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{
                "stripe-signature" = "t=$timestamp,v1=$signature"
                "user-agent" = "Stripe/1.0"
            } `
            -Body $payload
        
        Write-Host "✅ Response:" -ForegroundColor Green
        Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            Write-Host $reader.ReadToEnd()
        }
    }
}

function Test-GitHubWebhook {
    param($Slug, $Secret, $Url)
    
    Write-Host "🧪 Testing GitHub webhook signature verification..." -ForegroundColor Cyan
    
    $payload = @{
        action = "opened"
        number = [int](Get-Random -Maximum 1000)
        pull_request = @{
            id = [int](Get-Random -Maximum 100000)
            title = "Test PR for signature verification"
            state = "open"
            user = @{
                login = "testuser"
            }
        }
        repository = @{
            name = "test-repo"
            full_name = "testuser/test-repo"
        }
    } | ConvertTo-Json -Depth 10
    
    # Compute GitHub signature (SHA256)
    $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
    $signature = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
    
    Write-Host "📝 Payload:" -ForegroundColor Yellow
    Write-Host $payload
    Write-Host ""
    Write-Host "🔐 Signature: sha256=$signature" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $response = Invoke-WebRequest -Uri "$Url/hook/$Slug" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{
                "x-hub-signature-256" = "sha256=$signature"
                "x-github-event" = "pull_request"
                "user-agent" = "GitHub-Hookshot/test"
            } `
            -Body $payload
        
        Write-Host "✅ Response:" -ForegroundColor Green
        Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            Write-Host $reader.ReadToEnd()
        }
    }
}

function Test-ShopifyWebhook {
    param($Slug, $Secret, $Url)
    
    Write-Host "🧪 Testing Shopify webhook signature verification..." -ForegroundColor Cyan
    
    $payload = @{
        id = [int](Get-Random -Maximum 1000000)
        email = "customer@example.com"
        total_price = "99.99"
        currency = "USD"
        line_items = @(
            @{
                id = [int](Get-Random -Maximum 1000000)
                title = "Test Product"
                quantity = 1
                price = "99.99"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    # Compute Shopify signature (Base64)
    $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($Secret))
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
    $signature = [Convert]::ToBase64String($hash)
    
    Write-Host "📝 Payload:" -ForegroundColor Yellow
    Write-Host $payload
    Write-Host ""
    Write-Host "🔐 Signature: $signature" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $response = Invoke-WebRequest -Uri "$Url/hook/$Slug" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{
                "x-shopify-hmac-sha256" = $signature
                "x-shopify-topic" = "orders/create"
                "user-agent" = "Shopify/test"
            } `
            -Body $payload
        
        Write-Host "✅ Response:" -ForegroundColor Green
        Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            Write-Host $reader.ReadToEnd()
        }
    }
}

# Run the appropriate test
switch ($Provider) {
    'stripe' { Test-StripeWebhook -Slug $Slug -Secret $Secret -Url $Url }
    'github' { Test-GitHubWebhook -Slug $Slug -Secret $Secret -Url $Url }
    'shopify' { Test-ShopifyWebhook -Slug $Slug -Secret $Secret -Url $Url }
}

Write-Host ""
Write-Host "💡 Check your WebhookLab dashboard to see the signature verification badge!" -ForegroundColor Cyan
