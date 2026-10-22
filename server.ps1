param (
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$MimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.mjs'  = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.txt'  = 'text/plain; charset=utf-8'
    '.webp' = 'image/webp'
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    $Port = $Port + 1
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   NICA FLASHER DISTRIK MOJOROTO LOCALHOST SERVER AKTIF" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " URL Website : " -NoNewline
Write-Host "$prefix" -ForegroundColor Yellow
Write-Host " Direktori   : $ScriptDir" -ForegroundColor Gray
Write-Host " Tekan Ctrl+C di terminal ini untuk mematikan server." -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Buka browser otomatis
try {
    Start-Process $prefix
} catch {}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.RawUrl
        $path = $rawUrl.Split('?')[0]
        if ($path -eq '/' -or $path -eq '') {
            $path = '/index.html'
        }

        # Bersihkan path untuk keamanan
        $relPath = $path.TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $ScriptDir $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($MimeTypes.ContainsKey($ext)) { $MimeTypes[$ext] } else { 'application/octet-stream' }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            
            # Anti-caching header untuk dev lokal agar selalu update
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.AddHeader("Pragma", "no-cache")
            $response.AddHeader("Expires", "0")
            
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "[200 OK] $rawUrl" -ForegroundColor Green
        } else {
            $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.StatusCode = 404
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $notFoundMsg.Length
            $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
            Write-Host "[404 NF] $rawUrl" -ForegroundColor Red
        }

        $response.OutputStream.Close()
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
    Write-Host "Server dihentikan." -ForegroundColor Yellow
}
