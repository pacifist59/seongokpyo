Add-Type -AssemblyName System.Drawing
$card = New-Object System.Drawing.Bitmap 1200,630
$canvas = [System.Drawing.Graphics]::FromImage($card)
$canvas.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$canvas.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$canvas.Clear([System.Drawing.ColorTranslator]::FromHtml('#101425'))
$accent = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#ff795b'))
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#f4f3ee'))
$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#aeb3c4'))
$title = New-Object System.Drawing.Font 'Malgun Gothic',82,([System.Drawing.FontStyle]::Bold),([System.Drawing.GraphicsUnit]::Pixel)
$copy = New-Object System.Drawing.Font 'Malgun Gothic',34,([System.Drawing.FontStyle]::Regular),([System.Drawing.GraphicsUnit]::Pixel)
$label = New-Object System.Drawing.Font 'Arial',20,([System.Drawing.FontStyle]::Bold),([System.Drawing.GraphicsUnit]::Pixel)
$canvas.FillRectangle($accent,80,78,10,26)
$canvas.FillRectangle($accent,99,61,10,43)
$canvas.FillRectangle($accent,118,71,10,33)
$canvas.DrawString('KOREA LIVE ARCHIVE',$label,$muted,153,76)
$canvas.DrawString('선곡표',$title,$white,72,176)
$canvas.DrawString('공연의 순간을 곡으로 기록하다',$copy,$white,80,314)
$canvas.DrawString('아티스트 · 공연장 · 페스티벌의 연주 기록',$copy,$muted,80,374)
$canvas.FillRectangle($accent,80,520,1040,5)
$target = Join-Path $PSScriptRoot '..\public\share-card.png'
$card.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose()
$card.Dispose()
foreach ($resource in @($accent,$white,$muted,$title,$copy,$label)) { $resource.Dispose() }
Write-Output 'Created share-card.png (1200 x 630)'
