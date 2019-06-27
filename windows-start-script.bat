@echo off

echo Starting Instagram Bot... Redirecting output to log.txt
powershell.exe -Command "Start-Process PowerShell -Verb RunAs 'Stop-Process -Name 2.43-x64-chromedriver -Force' "
powershell.exe -Command "cd ~/Downloads/Instagram-Bot/ ;; yarn start --headless 2>&1 >> ~/Downloads/log.txt"

