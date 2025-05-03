# Chemistry Utility
A web-based **Chemistry Utility** that performs element information lookups, molar mass calculations, chemical equation balancing, and stoichiometric calculations. Built with **HTML**, **CSS**, **JavaScript**, and **Node.js**, and served via **Fastify**.
## Table of Contents
* [Features](#features)
* [Installation](#installation)
* [Usage](#usage)
* [File Structure](#file-structure)
* [API Endpoint](#api-endpoint)
* [Customization](#customization)
* [License](#license)
## Features
* 🔎 **Element Information Lookup**: Query the periodic table for atomic mass, number, electronegativity, electron affinity, atomic radius, ionization energy, valence/total electrons, group, period, and type.
* ⚖️ **Molar Mass Calculation**: Compute molar mass of any valid chemical formula (supports nested parentheses).
* 🔢 **Chemical Equation Balancer**: Automatically balance unbalanced chemical equations.
* 🧪 **Stoichiometry**: Calculate product yield from reactants, required reactant from desired product, or identify the limiting reactant.
## Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/richie-rich90454/Chemistry-Utility.git
   cd chemistry-utility
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the server**
   ```bash
   node server.js
   ```
   By default, the Fastify server listens on port **6005**.
## Usage
1. Open your browser and navigate to:
   ```
   http://localhost:6005
   ```
2. Use the intuitive UI to:
   * Lookup element data by symbol or name.
   * Calculate molar mass by entering a chemical formula.
   * Balance chemical equations (e.g., `H2 + O2 -> H2O`).
   * Perform stoichiometric calculations after entering a balanced equation.
3. View results displayed dynamically without page reloads.
## File Structure
```
chemistry-utility/
├── index.html         # Front-end HTML
├── script.js          # Client-side JavaScript logic
├── package.json       # Project metadata & dependencies
├── ptable.json        # Periodic table data served via API (you would need to prepare your own, see "Schema.txt" for how to prepare one)
└── README.md          # Project documentation
```
## API Endpoint
* **GET** `/api/ptable`
  * Serves the periodic table data (`ptable.json`) in JSON format.
  * Used by `script.js` to populate element lookup, mass, and balancing functions.
## Customization
* **Styling**: Modify CSS variables in the `<style>` block of `index.html` or replace with an external stylesheet.
* **Server**: Edit `server.js` (or the Fastify setup) to change port, add middleware, or extend endpoints.
* **Data**: Update `ptable.json` to add/remove elements or adjust properties.
## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
---