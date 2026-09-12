param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$prismaCli = Join-Path $projectRoot 'node_modules/prisma/build/index.js'
$schemaPath = Join-Path $projectRoot 'packages/db/prisma/schema.prisma'
if (!(Test-Path -LiteralPath $prismaCli)) { throw 'Install project dependencies first: npm ci' }
Write-Host 'Target: Supabase jnhznigomicsrtrbjkvq / public (session pooler, port 5432)'
if ($Apply) {
  $confirmation = Read-Host 'Apply repository migrations to this database? Type jnhznigomicsrtrbjkvq to confirm'
  if ($confirmation -cne 'jnhznigomicsrtrbjkvq') { throw 'Cancelled; no migrations applied.' }
}
$secret = Read-Host 'Supabase database password (hidden)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if (!$password) { throw 'Password is required.' }
  $encodedPassword = [Uri]::EscapeDataString($password)
  $env:DATABASE_URL = 'postgresql://postgres.jnhznigomicsrtrbjkvq:' + $encodedPassword + '@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
  $operation = if ($Apply) { 'deploy' } else { 'status' }
  $result = & node $prismaCli migrate $operation --schema $schemaPath 2>&1
  $migrationExitCode = $LASTEXITCODE
  foreach ($line in $result) {
    Write-Host ($line.ToString().Replace($env:DATABASE_URL, '[DATABASE_URL]').Replace($encodedPassword, '[REDACTED]').Replace($password, '[REDACTED]'))
  }
  if ($migrationExitCode -ne 0) {
    throw 'Prisma returned a nonzero status. Pending migrations also cause a nonzero status; review the output. No reset is performed.'
  }
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $secret.Dispose()
  $password = $null
  $encodedPassword = $null
}
