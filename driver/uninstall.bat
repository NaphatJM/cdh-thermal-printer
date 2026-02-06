@echo off
echo Stopping Driver...
taskkill /F /IM ThermalPrinterDriver.exe

echo Removing from Startup...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MyThermalDriver" /f

echo.
echo =================================================
echo   Driver Uninstalled Successfully!
echo   You can now delete the .exe file.
echo =================================================
pause