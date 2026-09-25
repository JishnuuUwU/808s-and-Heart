@echo off
title Cyber-Heart Desktop Specimen
cd /d "%~dp0"
start "" "%~dp0node_modules\electron\dist\electron.exe" .
