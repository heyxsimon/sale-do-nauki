# Sale do nauki - prototyp (temat 7: Rezerwacja sal do nauki)

HTML + CSS + JavaScript bez frameworka. Dane przykładowe: `dane/sale.json`.
Rezerwacje zapisują się w `localStorage` przeglądarki.

## Uruchomienie

Dane wczytywane przez `fetch`, więc potrzebny jest serwer:

```bash
cd prototyp
python3 -m http.server 8000
```

## Ekrany

| Adres | Ekran |
|---|---|
| `#/` | Start |
| `#/sale` | Lista sal z filtrem (data, godziny, liczba osób); na komputerze lista + szczegóły |
| `#/sala/ID` | Szczegóły sali (na telefonie osobny ekran) |
| `#/rezerwacja` | Formularz rezerwacji z walidacją |
| `#/potwierdzenie/ID` | Potwierdzenie |
| `#/moje` | Moje rezerwacje, anulowanie z potwierdzeniem |
