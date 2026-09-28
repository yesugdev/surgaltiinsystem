# Локал өгөгдлийг .sync/ доторх нөөцөөс сэргээнэ (sync:pull-ийг буцаахад).
# Хэрэглээ:  npm run sync:restore-local -- local-backup-20261001-1030.archive.gz
param([string]$FileName = '')
. "$PSScriptRoot\common.ps1"
Invoke-Main {
  if (-not $FileName -or -not (Test-Path (Join-Path $SyncDir $FileName))) {
    Write-Host 'Боломжит нөөцүүд (шинэ нь дээрээ):'
    Get-ChildItem $SyncDir -Filter '*.archive.gz' | Sort-Object LastWriteTime -Descending | ForEach-Object { Write-Host "  $($_.Name)" }
    if ($FileName) { throw "Олдсонгүй: $FileName" }
    Write-Host ''
    Write-Host 'Сэргээх: npm run sync:restore-local -- <файлын нэр>'
    return
  }
  Assert-Docker
  Confirm-Danger "Локал өгөгдөл '$FileName' нөөцөөр солигдоно."
  Import-LocalDb $FileName
  Write-Host "Сэргээлээ. Локал одоо: $(Get-Counts)" -ForegroundColor Green
}
