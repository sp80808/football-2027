import os

dir_path = "/Volumes/Harry/DEV/F2027/football-2027/tests/"

files_to_update = [
    "fc26Parity.test.ts",
    "match.test.ts",
    "opponent.test.ts",
    "tackle.test.ts",
    "replay.test.ts",
    "simulation.test.ts",
]

for filename in files_to_update:
    filepath = os.path.join(dir_path, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # Imports
    content = content.replace("import { Player } from '../src/engine/Player';", "import { Footballer } from '../src/engine/Footballer';")
    content = content.replace("import { Opponent } from '../src/engine/Opponent';", "")
    
    # Class instantiation
    content = content.replace("new Player()", "new Footballer(0, 'home')")
    content = content.replace("new Opponent()", "new Footballer(0, 'away')")

    # State properties
    content = content.replace(".player.", ".homeTeam[0].")
    content = content.replace(".opponent.", ".awayTeam[0].")
    
    # Types
    content = content.replace("Player", "Footballer")
    content = content.replace("Opponent", "Footballer")

    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated {filename}")
