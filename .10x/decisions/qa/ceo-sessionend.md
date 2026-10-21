# QA — ceo-sessionend
- `npm test` 75/75 (server-tests buiten de sandbox, die lokale poorten blokkeert).
- Live zelftest op :4747: synthetische CEO → SessionEnd other blijft (done, "Staat stil", in ceo.json) → SessionEnd clear weg, ceo.json `[]`.
- Bevestiging oorzaak: oude code maakte ceo.json om 14:15:54 opnieuw leeg nadat de app de CEO-sessie stilzette.
