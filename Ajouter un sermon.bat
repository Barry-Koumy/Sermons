@echo off
rem ─────────────────────────────────────────────────────────────────────────
rem  Ajouter un sermon — PAR CLIC.
rem  • Double-cliquez ce fichier : une fenetre vous fait choisir les 2 PDF.
rem  • OU glissez les 2 PDF (francais + arabe) directement sur cette icone.
rem  La langue est detectee automatiquement (aucune saisie d'arabe).
rem ─────────────────────────────────────────────────────────────────────────
pythonw "%~dp0ajouter_sermon.pyw" %*
if errorlevel 9009 python "%~dp0ajouter_sermon.pyw" %*
