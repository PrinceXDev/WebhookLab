# PowerShell script to sync Prisma schema to PostgreSQL
# This is a workaround for Windows + Docker + Prisma authentication issues

Write-Host "🔄 Syncing Prisma schema to PostgreSQL..." -ForegroundColor Cyan

# Generate SQL from Prisma schema
Set-Location apps/server
pnpm prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ../../scripts/schema.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate SQL from Prisma schema" -ForegroundColor Red
    exit 1
}

Set-Location ../..

# Apply SQL to PostgreSQL
Get-Content scripts/schema.sql | docker exec -i webhooklab-postgres psql -U webhooklab -d webhooklab

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema synchronized" -ForegroundColor Green
    
    # Generate Prisma client
    Set-Location apps/server
    pnpm prisma generate
    Set-Location ../..
    
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to apply schema" -ForegroundColor Red
    exit 1
}
