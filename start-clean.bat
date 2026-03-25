@echo off
echo Clearing Expo and Metro cache...
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Cache cleared!
echo.
echo Starting Expo with clean cache...
npx expo start --clear
