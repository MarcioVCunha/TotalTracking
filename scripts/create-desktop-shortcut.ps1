$root = Resolve-Path "$PSScriptRoot\.."
$desktopPath = Join-Path $env:USERPROFILE "Desktop\Total Tracking.lnk"
$targetPath = Join-Path $root "release\win-unpacked\Total Tracking.exe"
$workDir = Join-Path $root "release\win-unpacked"
$iconPath = Join-Path $root "electron\assets\icon.ico"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($desktopPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $workDir
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}
$shortcut.Description = "Total Tracking — Companion de Total War: WARHAMMER III"
$shortcut.Save()

Write-Host "Atalho atualizado com sucesso na Área de Trabalho!"
