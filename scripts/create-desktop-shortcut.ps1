$root = Resolve-Path "$PSScriptRoot\.."
$desktopPath = Join-Path $env:USERPROFILE "Desktop\Total Tracking.lnk"
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$startMenuPath = Join-Path $startMenuDir "Total Tracking.lnk"
$targetPath = Join-Path $root "release\win-unpacked\Total Tracking.exe"
$workDir = Join-Path $root "release\win-unpacked"
$iconPath = Join-Path $root "electron\assets\icon.ico"

$wsh = New-Object -ComObject WScript.Shell

foreach ($lnkPath in @($desktopPath, $startMenuPath)) {
    $shortcut = $wsh.CreateShortcut($lnkPath)
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $workDir
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    } else {
        $shortcut.IconLocation = "$targetPath,0"
    }
    $shortcut.Description = "Total Tracking - Companion de Total War: WARHAMMER III"
    $shortcut.Save()
}

Write-Host "Atalhos criados com sucesso no Menu Iniciar e na Area de Trabalho!"
