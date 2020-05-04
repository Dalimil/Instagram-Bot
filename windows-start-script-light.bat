@echo off

echo Starting Instagram Bot... Redirecting output to log.txt
powershell.exe -Command "Start-Process PowerShell -Verb RunAs 'Stop-Process -Name 2.43-x64-chromedriver -Force' "
powershell.exe -Command "Start-Process PowerShell -Verb RunAs 'Stop-Process -Name Node* -Force' "
powershell.exe -Command "Start-Process PowerShell -Verb RunAs 'Stop-Process -Name Java* -Force' "
powershell.exe -Command "cd ~/Downloads/Instagram-Pics/ ;; yarn start --lightweight --headless 2>&1 > ~/Downloads/served/log9.txt"


