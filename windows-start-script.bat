@echo off

echo Starting Instagram Bot... Redirecting output to log.txt
powershell.exe -Command "cd ~/Downloads/Instagram-Bot/ ;; yarn start --headless 2>&1 >> ~/Downloads/log.txt"

