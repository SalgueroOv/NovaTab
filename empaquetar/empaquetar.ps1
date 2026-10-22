# Genera el .zip de "NovaTab" para repartir entre amigos.
#
#   powershell -ExecutionPolicy Bypass -File empaquetar\empaquetar.ps1
#
# - Solo incluye los archivos de la extensión (nada de .git, .claude, .taste-skill, docs ni mockups).
# - Añade al manifest una clave fija: así la extensión tiene siempre el mismo identificador aunque se
#   mueva la carpeta, y cada actualización conserva los datos. La copia de desarrollo (sin clave) no se toca.
# - Comprueba que no se cuela ninguna IP de las redes 10.x.x.x o 172.16-31.x.x (las de ejemplo son 192.168.1.x).

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$aqui = $PSScriptRoot

$manifest = Get-Content (Join-Path $raiz 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $manifest.version
$salida = Join-Path $raiz 'dist'
$carpeta = Join-Path $salida 'novatab'
$zip = Join-Path $salida "novatab-$version.zip"

# Se vacía la carpeta en lugar de borrarla: así funciona aunque esté abierta en otro programa.
New-Item -ItemType Directory -Force $carpeta | Out-Null
Get-ChildItem $carpeta -Force | Remove-Item -Recurse -Force
New-Item -ItemType Directory -Force (Join-Path $carpeta 'fuentes') | Out-Null

foreach ($archivo in 'newtab.html', 'style.css', 'background.js', 'datos-defecto.js', 'LICENSE') {
    Copy-Item (Join-Path $raiz $archivo) $carpeta
}
New-Item -ItemType Directory -Force (Join-Path $carpeta 'js') | Out-Null
Copy-Item (Join-Path $raiz 'js\*.js') (Join-Path $carpeta 'js')
Copy-Item (Join-Path $raiz 'fuentes\*') (Join-Path $carpeta 'fuentes')
Copy-Item (Join-Path $aqui 'LEEME.txt') $carpeta

# Manifest con la clave fija (sin BOM: Chrome no acepta un manifest con BOM).
$clave = (Get-Content (Join-Path $aqui 'clave-publica.txt') -Raw).Trim()
$manifest | Add-Member -NotePropertyName key -NotePropertyValue $clave -Force
$json = $manifest | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Join-Path $carpeta 'manifest.json'), $json, (New-Object System.Text.UTF8Encoding $false))

# Ninguna IP de una red real dentro del paquete (los ejemplos usan 192.168.1.x).
$prohibido = '\b10\.\d+\.\d+\.\d+\b|\b172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\b'
$fugas = Get-ChildItem $carpeta -Recurse -File -Include *.js, *.html, *.css, *.json, *.txt |
    Select-String -Pattern $prohibido
if ($fugas) {
    $fugas | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
    throw 'El paquete contiene IPs de una red real: revisa las líneas de arriba.'
}

# Compress-Archive guarda las rutas con "\" y en Mac o Linux las carpetas no se descomprimen bien:
# se crea el .zip a mano con rutas "/".
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$archivoZip = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
try {
    Get-ChildItem $carpeta -Recurse -File | ForEach-Object {
        $ruta = $_.FullName.Substring($carpeta.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archivoZip, $_.FullName, $ruta) | Out-Null
    }
} finally {
    $archivoZip.Dispose()
}
Write-Host "Listo: $zip"
