# Sync скриптүүдийн нийтлэг функцууд (Windows PowerShell 5.1+)
$ErrorActionPreference = 'Stop'

$Script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Script:SyncDir = Join-Path $RepoRoot '.sync'   # dump файлууд (git-д орохгүй)
New-Item -ItemType Directory -Force $SyncDir | Out-Null

function Write-Step([string]$Text) {
  Write-Host ''
  Write-Host "==> $Text" -ForegroundColor Cyan
}

# Гадаад программ (ssh, scp, docker, git) алдаатай дуусвал зогсооно
# Энгийн (advanced биш) функц: -v, -e гэх мэт аргументыг PowerShell өөрийн параметр гэж залгихгүй
function Invoke-Native {
  $exe = $args[0]
  $rest = @($args | Select-Object -Skip 1)
  & $exe @rest
  if ($LASTEXITCODE -ne 0) { throw "$exe алдаатай дууслаа (код $LASTEXITCODE)." }
}

function Assert-Server([string]$Server) {
  if (-not $Server) {
    throw "Серверийн хаяг тохируулаагүй. Нэг удаа ажиллуулна: [Environment]::SetEnvironmentVariable('SURGALT_SERVER','root@SERVER_IP','User')  — дараа нь PowerShell-ээ шинээр нээнэ. Эсвэл -Server root@SERVER_IP гэж дамжуулна."
  }
}

function Assert-Docker {
  docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop асаагүй байна. Асаагаад дахин оролдоно уу.' }
}

function Confirm-Danger([string]$Message) {
  Write-Host ''
  Write-Host $Message -ForegroundColor Yellow
  $answer = Read-Host 'Үргэлжлүүлэх бол yes гэж бичнэ үү'
  if ($answer -ne 'yes') { throw 'Цуцаллаа.' }
}

function Get-Stamp { Get-Date -Format 'yyyyMMdd-HHmm' }

# Локал MongoDB ↔ файл (mongodump/mongorestore-ийг Docker-оор ажиллуулна — тусад нь суулгах шаардлагагүй)
function Export-LocalDb([string]$FileName, [string]$Db = 'surgaltiin_system') {
  Invoke-Native docker run --rm -v "${SyncDir}:/sync" mongo:8 mongodump --quiet `
    --uri "mongodb://host.docker.internal:27017/$Db" --archive="/sync/$FileName" --gzip
  return (Join-Path $SyncDir $FileName)
}

function Import-LocalDb([string]$FileName, [string]$Db = 'surgaltiin_system') {
  Invoke-Native docker run --rm -v "${SyncDir}:/sync" mongo:8 mongorestore --quiet `
    --uri 'mongodb://host.docker.internal:27017' --drop --nsInclude "$Db.*" `
    --archive="/sync/$FileName" --gzip
}

function Get-Counts([string]$Db = 'surgaltiin_system') {
  $q = "const d=db.getSiblingDB('$Db'); print(['users','classes','exams','lessons','submissions','files.files'].map(c=>c+'='+d.getCollection(c).countDocuments()).join('  '))"
  docker run --rm mongo:8 mongosh --quiet 'mongodb://host.docker.internal:27017' --eval $q
}

# Хуучин dump-уудаас сүүлийн 10-ыг үлдээнэ
function Remove-OldDumps {
  Get-ChildItem $SyncDir -Filter 'local-backup-*.archive.gz' | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 10 | Remove-Item -Force
}

# Скриптийн үндсэн хэсгийг ажиллуулж, алдааг ойлгомжтой харуулна. Finally-д түр файлыг цэвэрлэнэ.
function Invoke-Main([scriptblock]$Body, [string[]]$TempFiles = @()) {
  try {
    & $Body
  } catch {
    Write-Host ''
    Write-Host ('АЛДАА: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
  } finally {
    foreach ($t in $TempFiles) { if (Test-Path $t) { Remove-Item $t -Force } }
  }
}
