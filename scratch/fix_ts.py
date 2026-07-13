import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

# 1. SimulationWorkerClient.ts
replace_in_file('src/bridge/SimulationWorkerClient.ts', [
    ('this.renderState.player.', 'this.renderState.homeTeam[0].'),
    ('this.renderState.keeper.', 'this.renderState.homeKeeper.'),
    ('this.renderState.opponent.', 'this.renderState.awayTeam[0].')
])

# 2. CameraController.ts
replace_in_file('src/camera/CameraController.ts', [
    ('preset.distMin', '10'),
    ('preset.distMax', '35')
])

# 3. RenderingPanel.tsx
replace_in_file('src/debug/RenderingPanel.tsx', [
    ('state.player.pos', 'state.homeTeam[state.activeHomeIndex].pos'),
    ('state.player.facing', 'state.homeTeam[state.activeHomeIndex].facing')
])

# 4. GameEngine.ts
replace_in_file('src/engine/GameEngine.ts', [
    ('const dist = this.homeTeam[i].pos.distanceTo(this.ball.pos);', 'const dist = Math.hypot(this.homeTeam[i].pos.x - this.ball.pos.x, this.homeTeam[i].pos.y - this.ball.pos.y);')
])

# 5. OffsideDetector.ts
replace_in_file('src/engine/OffsideDetector.ts', [
    ("import { Player } from './Player';", "import { Footballer } from './Footballer';")
])

# 6. GameplayScreen.tsx
replace_in_file('src/screens/GameplayScreen.tsx', [
    ('tsEngine.player.speedMul = b.speedMul;', 'for(let p of tsEngine.homeTeam) p.speedMul = b.speedMul;'),
    ('tsEngine.player.accelMul = b.accelMul;', 'for(let p of tsEngine.homeTeam) p.accelMul = b.accelMul;'),
    ('tsEngine.player.controlMul = b.controlMul;', 'for(let p of tsEngine.homeTeam) p.controlMul = b.controlMul;'),
    ('tsEngine.player.kickPowerMul = b.kickPowerMul;', 'for(let p of tsEngine.homeTeam) p.kickPowerMul = b.kickPowerMul;'),
    ("tsEngine.player.controlState === 'under_control' || tsEngine.player.controlState === 'shielding'", "tsEngine.homeTeam[tsEngine.activeHomeIndex].controlState === 'under_control' || tsEngine.homeTeam[tsEngine.activeHomeIndex].controlState === 'shielding'"),
    ("const controlledByHuman = tsEngine.player.controlState", "const controlledByHuman = tsEngine.homeTeam[tsEngine.activeHomeIndex].controlState")
])

print("Replacements done.")
