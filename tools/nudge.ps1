# Moves a rectangular region of a cut-out PNG.
#
# Used to close the gap when the generator draws a prop next to a paw instead
# of in it. The region is lifted, the old place is cleared, and the region is
# composited back on top at the offset.
#
#   powershell -File tools/nudge.ps1 <png> <x> <y> <w> <h> <dx> <dy> [outPng]
#
# Parameter names are deliberately long: PowerShell variables are case
# insensitive, so a parameter called $W and a local called $w are the same
# variable, and the region silently becomes the whole image.

param(
  [Parameter(Mandatory = $true)][string]$Png,
  [Parameter(Mandatory = $true)][int]$RegX,
  [Parameter(Mandatory = $true)][int]$RegY,
  [Parameter(Mandatory = $true)][int]$RegW,
  [Parameter(Mandatory = $true)][int]$RegH,
  [Parameter(Mandatory = $true)][int]$Dx,
  [Parameter(Mandatory = $true)][int]$Dy,
  [string]$Out
)

Add-Type -AssemblyName System.Drawing

$in = "$(Resolve-Path $Png)"
if (-not $Out) { $Out = $in }

# load through a memory stream: a Bitmap built straight from a path keeps the
# file locked, and saving back over it fails with a bare "generic GDI+ error"
$bytes  = [System.IO.File]::ReadAllBytes($in)
$ms     = New-Object System.IO.MemoryStream (, $bytes)
$loaded = [System.Drawing.Image]::FromStream($ms)
$imgW   = $loaded.Width
$imgH   = $loaded.Height
$src    = New-Object System.Drawing.Bitmap $imgW, $imgH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gg     = [System.Drawing.Graphics]::FromImage($src)
$gg.DrawImage($loaded, 0, 0, $imgW, $imgH)
$gg.Dispose(); $loaded.Dispose(); $ms.Dispose()

$piece = New-Object System.Drawing.Bitmap $RegW, $RegH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$clear = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)

for ($j = 0; $j -lt $RegH; $j++) {
  for ($i = 0; $i -lt $RegW; $i++) {
    $sx = $RegX + $i; $sy = $RegY + $j
    if ($sx -ge 0 -and $sx -lt $imgW -and $sy -ge 0 -and $sy -lt $imgH) {
      $piece.SetPixel($i, $j, $src.GetPixel($sx, $sy))
      $src.SetPixel($sx, $sy, $clear)
    }
  }
}

$g = [System.Drawing.Graphics]::FromImage($src)
$g.CompositingMode = 'SourceOver'
$g.DrawImage($piece, ($RegX + $Dx), ($RegY + $Dy), $RegW, $RegH)
$g.Dispose()

$src.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$src.Dispose(); $piece.Dispose()
"moved ${RegW}x${RegH} at ($RegX,$RegY) by ($Dx,$Dy) -> $Out"
