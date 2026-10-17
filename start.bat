@echo off
title VeloceExpress - Servidor de Pruebas en Tiempo Real
echo ==============================================================
echo Iniciando VeloceExpress en http://localhost:3000 ...
echo ==============================================================
start http://localhost:3000/panel.html
start http://localhost:3000/index.html
node server.js
pause
