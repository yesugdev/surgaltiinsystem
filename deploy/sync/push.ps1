# Локал өгөгдлийг серверт илгээнэ: СЕРВЕРИЙН өгөгдөл ЛОКАЛЫНХААР СОЛИГДОНО.
# Сурагчдын сервер дээр илгээсэн даалгавар, өгсөн шалгалт устана! Хэрэглээ:  npm run sync:push
param(
  [string]$Server = $env:SURGALT_SERVER,
  [string]$RemoteDir = '/opt/surgalt'
)
. "$PSScriptRoot\common.ps1"
Invoke-Main {
  Assert-Server $Server
  Assert-Docker

  Write-Step '1/4 Локал өгөгдлийг файл болгож байна'
  $file = Export-LocalDb 'local-push.archive.gz'
  Write-Host "    Илгээх өгөгдөл: $(Get-Counts)"

  Confirm-Danger @"
  СЕРВЕРИЙН өгөгдөл (learn.yesuvd.tech) локалынхаар бүхэлдээ солигдоно.
  Сервер дээр сурагчдын илгээсэн даалгавар, өгсөн шалгалт, шинээр оруулсан контент устана.
  (Сервер дээр солихоос өмнө автоматаар нөөц үүснэ.)
"@

  Write-Step '2/4 Серверт хуулж байна'
  Invoke-Native scp $file "${Server}:$RemoteDir/deploy/backups/sync-push.archive.gz"

  Write-Step '3/4 Сервер дээр нөөц үүсгэж, сольж байна'
  Invoke-Native ssh $Server "cd $RemoteDir/deploy && ./backup.sh && ./restore.sh -y backups/sync-push.archive.gz && rm -f backups/sync-push.archive.gz"

  Write-Step '4/4 Цэвэрлэж байна'
  Remove-Item $file -Force

  Write-Host ''
  Write-Host 'Дууслаа. Сервер дээр бүх хэрэглэгч дахин нэвтэрнэ.' -ForegroundColor Green
  Write-Host "Буцаах бол сервер дээр: cd $RemoteDir/deploy && ls -t backups/ | head -3  → ./restore.sh backups/<хамгийн сүүлийн нөөц>"
} -TempFiles @((Join-Path $SyncDir 'local-push.archive.gz'))
