$procs = [System.Diagnostics.Process]::GetProcesses()
foreach ($p in $procs) {
    try {
        foreach ($m in $p.Modules) {
            if ($m.FileName -like "*Total Tracking.exe*" -or $m.FileName -like "*app.asar*") {
                Write-Host "Killing locker process PID: $($p.Id) - $($p.ProcessName)"
                $p.Kill()
            }
        }
    } catch {}
}
