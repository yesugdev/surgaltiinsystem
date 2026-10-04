# Шүүгчийг Windows дээр шууд ажиллуулна (Docker-гүй) — ЗӨВХӨН локал туршилтад.
# Хамгаалалт (тусдаа хэрэглэгч, санах ойн хязгаар) байхгүй. Сервер дээр Docker-ийн judge ажиллана.
# Хэрэглээ:  npm run judge:local
$ErrorActionPreference = 'Stop'

function Find-Python([string]$version) {
  try { $exe = & py "-$version" -c "import sys; print(sys.executable)" 2>$null } catch { $exe = $null }
  if ($LASTEXITCODE -eq 0 -and $exe) { return $exe.Trim() }
  return $null
}

$py38 = Find-Python '3.8'
# Орчин үеийн Python: хамгийн шинэ суусан хувилбар
$py3 = $null
foreach ($v in '3.14', '3.13', '3.12', '3.11', '3.10') { $py3 = Find-Python $v; if ($py3) { break } }
if (-not $py3) { $py3 = $py38 }
if (-not $py3) { throw 'Python олдсонгүй. https://www.python.org-оос Python 3.8 (болон шинэ хувилбар) суулгана уу.' }
if (-not $py38) { Write-Host 'АНХААР: Python 3.8 олдсонгүй — "Python 3.8" илгээлтийг шинэ Python-оор ажиллуулна.' -ForegroundColor Yellow; $py38 = $py3 }

$gxx = Get-Command g++ -ErrorAction SilentlyContinue
if (-not $gxx) { Write-Host 'АНХААР: g++ олдсонгүй — C++ илгээлт шалгагдахгүй (MinGW суулгана уу).' -ForegroundColor Yellow }
else {
  # Хуучин MinGW (GCC 6) C++17 тугийг танихгүй
  $ver = (& g++ -dumpversion).Trim()
  $env:JUDGE_CXX_STD = if ([int]($ver.Split('.')[0]) -ge 7) { 'gnu++17' } else { 'gnu++14' }
}

$env:JUDGE_PORT = '5055'
$env:JUDGE_PY38 = $py38
$env:JUDGE_PY3 = $py3
Write-Host "Шүүгч: http://127.0.0.1:5055  (Python 3.8: $py38; Python: $py3; C++: $($env:JUDGE_CXX_STD))" -ForegroundColor Green
Write-Host 'Зогсоох: Ctrl+C'
& $py3 "$PSScriptRoot\worker.py"
