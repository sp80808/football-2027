import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

# 1. Footballer.ts
replace_in_file('src/engine/Footballer.ts', [
    ("import { Opponent } from './Opponent';", ""),
    ("opponent?: Opponent", "opponent?: Footballer")
])

# 2. SimulationWorkerClient.ts
replace_in_file('src/bridge/SimulationWorkerClient.ts', [
    ("this.renderState.awayTeam[0].aiState = 'tracking';", "")
])

# 3. GameplayScreen.tsx
replace_in_file('src/screens/GameplayScreen.tsx', [
    ("tsEngine.player.", "tsEngine.homeTeam[tsEngine.activeHomeIndex].")
])

print("Replacements done.")
