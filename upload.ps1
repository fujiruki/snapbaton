# ========================================
# SnapBaton (WordPressプラグイン) Deploy Script
# ========================================
# admin(React/Vite)をビルドし、プラグイン一式を
# ConoHa WING上のWordPress wp-content/plugins/snapbaton へデプロイします。
#
# 使用方法: プロジェクトルートで実行: .\upload.ps1
#
# 注意: デプロイ先は他プラグインと同居する wp-content/plugins/snapbaton のみ。
#       それ以外のWordPressファイルには一切触れない。
# ========================================

$ErrorActionPreference = "Stop"

# ========================================
# 設定
# ========================================
$serverHost = "www1045.conoha.ne.jp"
$serverUser = "c6924945"
$serverPort = "8022"
$remoteDir  = "public_html/door-fujita.com/wp-content/plugins/snapbaton"
$sshKeyPath = "C:\Fujiruki\Secret\key-2026-03-21-18-16-ConohaforAI.pem"
$archiveName = "deploy.tar.gz"
# ========================================

Write-Host "Starting Deployment Process..." -ForegroundColor Cyan
Write-Host "   Server: $serverHost"
Write-Host "   Target: $remoteDir"

# ========================================
# [1/4] admin(React/Vite)のビルド
# ========================================
Write-Host "`n[1/4] Building admin UI..." -ForegroundColor Yellow

Push-Location admin
try {
    Write-Host "   Running 'npm run build'..." -ForegroundColor Cyan
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "admin build failed. Run 'npm run build' in admin/ locally to see details."
    }
    Write-Host "   Build completed" -ForegroundColor Green
}
finally {
    Pop-Location
}

if (-not (Test-Path "admin/build")) {
    Write-Error "admin/build not found after build."
    exit 1
}

# ========================================
# [2/4] デプロイパッケージの準備
# ========================================
Write-Host "`n[2/4] Preparing Distribution Package..." -ForegroundColor Yellow

$deployTmp = "deploy_tmp"
if (Test-Path $deployTmp) {
    Remove-Item $deployTmp -Recurse -Force
}
New-Item -ItemType Directory -Path $deployTmp | Out-Null

Copy-Item -Path "snapbaton.php" -Destination $deployTmp
Copy-Item -Path "includes" -Destination $deployTmp -Recurse

New-Item -ItemType Directory -Path "$deployTmp/admin" | Out-Null
Copy-Item -Path "admin/build" -Destination "$deployTmp/admin" -Recurse

foreach ($optional in @("assets", "languages", "readme.txt")) {
    if (Test-Path $optional) {
        Copy-Item -Path $optional -Destination $deployTmp -Recurse
        Write-Host "   Included optional: $optional" -ForegroundColor Cyan
    }
}

Write-Host "   Package ready" -ForegroundColor Green

# ========================================
# [3/4] アーカイブ作成
# ========================================
Write-Host "`n[3/4] Creating Archive ($archiveName)..." -ForegroundColor Yellow

try {
    tar -czf $archiveName -C $deployTmp .
    if ($LASTEXITCODE -ne 0) {
        throw "tar command failed with exit code $LASTEXITCODE"
    }
    $size = (Get-Item $archiveName).Length / 1KB
    Write-Host "   Archive created ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
}
catch {
    Write-Error "Failed to create archive: $_"
    Remove-Item $deployTmp -Recurse -Force
    exit 1
}
finally {
    Remove-Item $deployTmp -Recurse -Force
}

# ========================================
# [4/4] サーバーへのアップロード＆展開
# ========================================
Write-Host "`n[4/4] Uploading & Deploying to Server..." -ForegroundColor Yellow

$sshCommandMkdir = "mkdir -p $remoteDir"
$sshCommandExtract = "cd $remoteDir && tar -xzf $archiveName && chmod -R 777 . && rm $archiveName && find . -type d -exec chmod 755 {} + && find . -type f -exec chmod 644 {} +"

function Invoke-SshSafe {
    param([string]$Command, [string]$LogFile)
    cmd /c "$Command 2>&1" | Out-File -Append $LogFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed (ExitCode: $LASTEXITCODE). Check $LogFile for details."
    }
}

$sshOptsStr = "-o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=15 -p $serverPort -i `"$sshKeyPath`""
$scpOptsStr = "-o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=15 -P $serverPort -i `"$sshKeyPath`""

$logFile = "deploy_debug.log"
"--- Deployment log started at $(Get-Date) ---" | Out-File $logFile -Encoding utf8

try {
    Write-Host "   Ensuring remote directory exists (Log: $logFile)..." -ForegroundColor Cyan
    Invoke-SshSafe -Command "ssh $sshOptsStr ${serverUser}@${serverHost} `"$sshCommandMkdir`"" -LogFile $logFile
    Write-Host "   Remote directory ready" -ForegroundColor Green

    Write-Host "   Uploading archive..." -ForegroundColor Cyan
    $uploadStart = Get-Date
    Invoke-SshSafe -Command "scp $scpOptsStr `"$archiveName`" `"${serverUser}@${serverHost}:$remoteDir/$archiveName`"" -LogFile $logFile
    $uploadTime = ((Get-Date) - $uploadStart).TotalSeconds
    Write-Host "   Upload completed ($([math]::Round($uploadTime, 1))s)" -ForegroundColor Green

    Write-Host "   Extracting & setting permissions..." -ForegroundColor Cyan
    Invoke-SshSafe -Command "ssh $sshOptsStr ${serverUser}@${serverHost} `"$sshCommandExtract`"" -LogFile $logFile
    Write-Host "   Extraction & permissions completed" -ForegroundColor Green

    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   Plugin: $remoteDir" -ForegroundColor Cyan
}
catch {
    Write-Error "Deployment failed: $_"
    exit 1
}
finally {
    if (Test-Path $archiveName) {
        Remove-Item $archiveName
    }
}
