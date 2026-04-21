Add-Type -AssemblyName System.Drawing

function Compress-Image {
    param(
        [string]$Src,
        [string]$Dst
    )
    if (-Not (Test-Path $Src)) {
        Write-Host "Source file not found: $Src"
        return
    }
    
    $img = [System.Drawing.Image]::FromFile($Src)
    # Compress/resize to 50% to make them not too heavy
    $w = [int]($img.Width * 0.5)
    $h = [int]($img.Height * 0.5)
    $bmp = New-Object System.Drawing.Bitmap($img, $w, $h)
    
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
    
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]70)
    
    $bmp.Save($Dst, $codec, $ep)
    
    $bmp.Dispose()
    $img.Dispose()
    
    Write-Host "Saved compressed image to: $Dst"
}

Compress-Image "d:\d\antigravity\mokhsita-org\images\floral1.png" "d:\d\antigravity\mokhsita-org\images\floral1_opt.jpg"
Compress-Image "d:\d\antigravity\mokhsita-org\images\floral2.png" "d:\d\antigravity\mokhsita-org\images\floral2_opt.jpg"
