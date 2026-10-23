param(
    [string]$BackendPath = (Join-Path $PSScriptRoot '../../pi4-2026-2-0102-grupo2/backend-api')
)

$ErrorActionPreference = 'Stop'
$backendRoot = (Resolve-Path -LiteralPath $BackendPath).Path
$testBuild = Join-Path ([IO.Path]::GetTempPath()) ('resolve-api-checks-' + [Guid]::NewGuid().ToString('N'))
$productionClasses = Join-Path $testBuild 'production'
$contractClasses = Join-Path $testBuild 'contracts'
$gsonJar = Join-Path $backendRoot 'lib/gson.jar'
$postgresJar = Join-Path $backendRoot 'lib/postgresql.jar'
$productionSources = Get-ChildItem (Join-Path $backendRoot 'src') -Recurse -Filter '*.java' | Select-Object -ExpandProperty FullName
$contractSources = Get-ChildItem (Join-Path $PSScriptRoot 'backend-contract') -Recurse -Filter '*.java' | Select-Object -ExpandProperty FullName

# Compile the real backend, then shadow only the DAOs with in-memory test doubles.
# The HTTP handlers, token validation and department policy are production code.
& javac --release 21 -encoding UTF-8 -cp "$gsonJar;$postgresJar" -d $productionClasses $productionSources
if ($LASTEXITCODE -ne 0) { throw 'Backend compilation failed.' }
& javac --release 21 -encoding UTF-8 -cp $productionClasses -d $contractClasses $contractSources
if ($LASTEXITCODE -ne 0) { throw 'Contract test compilation failed.' }
& java -cp "$contractClasses;$productionClasses;$gsonJar" BackendContractTest
if ($LASTEXITCODE -ne 0) { throw 'Backend contract tests failed.' }
Write-Output "Test artifacts: $testBuild"
