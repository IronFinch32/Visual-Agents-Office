# Senior — go-to-market-departments
- T1: `optionalLast: true` alleen op plus; einde sectie = max als sectie die fase noemt. liveView: `behind = a.phase < last && !(skippedLaunch)`.
- T2: BUILTIN_DEPARTMENTS uit een lijst met expliciete phases (sales/legal [1,8]).
- T4: in applyFlavor `PH` inkorten tot depts in `LAY.zones`; `currentPhase` clampen.
- Risico: deepEqual-tests van parsePhase; snapshot van liveView.
