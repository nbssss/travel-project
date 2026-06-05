Instrukcja uruchomienia kontenerów (Windows):

1) Otwórz PowerShell (jako Administrator jeśli potrzebne).
2) Przejdź do katalogu projektu:
   cd C:\Users\Daria\Desktop\aplikacjaTRWAVEL\travel-project
3) Uruchom skrypt PowerShell:
   .\run-docker.ps1

Alternatywa (cmd):
1) Otwórz cmd.exe
2) Przejdź do katalogu projektu i uruchom:
   run-docker.bat

Po uruchomieniu, kontenery będą działać w tle. Sprawdź logi poleceniem:
   docker-compose logs -f
