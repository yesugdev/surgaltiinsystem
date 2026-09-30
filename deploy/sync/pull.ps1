# Серверийн өгөгдлийг локал руу татна: локал өгөгдөл СЕРВЕРИЙНХЭЭР СОЛИГДОНО.
# Серверт юу ч өөрчлөгдөхгүй. Хэрэглээ:  npm run sync:pull
param(
  # Терминал хувьсагчийг хараахан харахгүй (тохируулсны дараа шинээр нээгээгүй) бол Windows-т хадгалсныг уншина
  [string]$Server = $(if ($env:SURGALT_SERVER) { $env:SURGALT_SERVER } else { [Environment]::GetEnvironmentVariable('SURGALT_SERVER', 'User') }),
  [string]$RemoteDir = '/opt/surgalt'
)
. "$PSScriptRoot\common.ps1"
Invoke-Main {
  Assert-Server $Server
  Assert-Docker

  Write-Step "1/4 Сервер ($Server) дээр нөөц үүсгэж байна"
  Invoke-Native ssh $Server "cd $RemoteDir/deploy && ./backup.sh sync-pull.archive.gz"

  Write-Step '2/4 Серверээс татаж байна'
  $serverFile = Join-Path $SyncDir 'server.archive.gz'
  Invoke-Native scp "${Server}:$RemoteDir/deploy/backups/sync-pull.archive.gz" $serverFile
  Invoke-Native ssh $Server "rm -f $RemoteDir/deploy/backups/sync-pull.archive.gz"

  Write-Step '3/4 Одоогийн локал өгөгдлийг нөөцөлж байна'
  $backup = Export-LocalDb "local-backup-$(Get-Stamp).archive.gz"
  Write-Host "    Локал нөөц: $backup"
  Write-Host "    Одоогийн локал: $(Get-Counts)"

  Confirm-Danger 'ЛОКАЛ өгөгдөл серверийнхээр бүхэлдээ солигдоно (сервер хөндөгдөхгүй).'

  Write-Step '4/4 Локал өгөгдлийг серверийнхээр сольж байна'
  Import-LocalDb 'server.archive.gz'
  Remove-Item $serverFile -Force
  Remove-OldDumps

  Write-Host ''
  Write-Host "Дууслаа. Локал одоо: $(Get-Counts)" -ForegroundColor Green
  Write-Host "Буцаах бол: npm run sync:restore-local -- $([IO.Path]::GetFileName($backup))"
} -TempFiles @((Join-Path $SyncDir 'server.archive.gz'))
