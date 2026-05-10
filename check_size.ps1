Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\Users\admin\Desktop\E 자료\TLG AG\assets\CH-OK-Idle-1.png")
Write-Output "Idle: $($img.Width)x$($img.Height)"
$img2 = [System.Drawing.Image]::FromFile("C:\Users\admin\Desktop\E 자료\TLG AG\assets\CH-OK-Jump-1.png")
Write-Output "Jump: $($img2.Width)x$($img2.Height)"
