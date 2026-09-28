# Шинэ кодыг серверт гаргана: git push → сервер дээр update.sh (нөөц, git pull, build, шалгалт)
# Хэрэглээ:  npm run deploy
param(
  [string]$Server = $env:SURGALT_SERVER,
  [string]$RemoteDir = '/opt/surgalt'
)
. "$PSScriptRoot\common.ps1"
Invoke-Main {
  Assert-Server $Server
  Set-Location $RepoRoot

  Write-Step '1/3 Git төлөв шалгаж байна'
  $dirty = git status --porcelain
  if ($dirty) {
    $dirty | ForEach-Object { Write-Host "    $_" }
    throw 'Commit хийгээгүй өөрчлөлт байна. Эхлээд: git add -A; git commit -m "тайлбар"'
  }
  $branch = git rev-parse --abbrev-ref HEAD
  if ($branch -ne 'main') { throw "Одоо '$branch' салбар дээр байна. Сервер main салбарыг татдаг — main руу merge хийнэ үү." }

  Write-Step '2/3 GitHub руу push хийж байна'
  Invoke-Native git push origin main

  Write-Step "3/3 Сервер ($Server) дээр шинэчилж байна"
  Invoke-Native ssh $Server "$RemoteDir/deploy/update.sh"

  Write-Host ''
  Write-Host 'Шинэчлэл дууслаа: https://learn.yesuvd.tech  (хөтөч дээр Ctrl+F5)' -ForegroundColor Green
}
