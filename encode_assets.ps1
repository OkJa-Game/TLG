$files = Get-ChildItem -Path "TLG-image" -Include "*.png", "*.jpg" -Recurse
$jsContent = "const assetsBase64 = {`n"
foreach ($file in $files) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $b64 = [Convert]::ToBase64String($bytes)
    $ext = $file.Extension.ToLower()
    $mime = "image/png"
    if ($ext -eq ".jpg" -or $ext -eq ".jpeg") {
        $mime = "image/jpeg"
    }
    $jsContent += "  '$($file.Name)': 'data:$mime;base64,$b64',`n"
}
$jsContent += "};`n"
# 브라우저 호환성을 위해 반드시 UTF8로 저장해야 합니다.
Set-Content -Path "js/assetsBase64.js" -Value $jsContent -Encoding UTF8
