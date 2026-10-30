# First message to send to Codex (copy and paste)

Please get fully oriented with this repository before editing anything.

1. Read `AGENTS.md`, `docs/GAME_VISION.md`, `docs/REWARDS_AND_PROGRESSION.md`, `docs/ARCHITECTURE.md`, and `worksheet/README.md`.
2. Explore the entire repository **read-only**, including the main app, worksheet interaction engine, the iframe bridge, data model, UI, styles, and tests. Explain what every important source file does, the actual runtime flow from selecting a ticket through connecting digits, carries, awarding coins/chests, and adding food to the menu.
3. Clearly distinguish **implemented behavior** from **design decisions we intend to implement**. Identify mismatches, bugs, fragile assumptions, and duplicated state or code. Pay particular attention to the correctness of the long multiplication interactions, sound effects, tutorial arrows, and saved data.
4. Create or update `docs/CODEBASE_AUDIT.md` with your findings and a small prioritized refactoring plan. Don't edit gameplay files yet; don't change visual design, prices, or probabilities; don't commit or push to GitHub.
5. Run the automated tests if the environment permits, and report exactly which tests passed and which behaviors require manual mouse/touch/audio testing.
6. Ask for my approval before implementing the recommended refactors.

Context: This is a Filipino bakery-themed serious game for children who already know their multiplication facts and are learning **the process of long multiplication**. I care about smooth carry interactions, attractive sound and tactile feedback, a simple UI, frequent achievable upgrades, and a center food menu with shiny colored order tickets to the right. Preserve worksheet mechanics but feel free to redesign its appearance only when I ask you to. Please do not make this a complicated tycoon game.
