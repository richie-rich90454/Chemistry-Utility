# Chemistry Utility
- [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
- A web‑based **Chemistry Utility** that performs element information lookups, molar mass calculations, chemical equation balancing, and stoichiometric analysis. Built with **HTML**, **CSS** (inline), **JavaScript**, and **Node.js**, and served via **Fastify** for high performance and secure routing.
---
## Table of Contents
* [Features](#features)
* [Installation](#installation)
* [Usage](#usage)
* [Examples](#examples)
* [File Structure](#file-structure)
* [API Endpoint](#api-endpoint)
* [Customization](#customization)
* [Contributing](#contributing)
* [Tests](#tests)
* [License](#license)
* [Acknowledgements](#acknowledgements)
---
## Features
* 🔎 **Element Information Lookup**
  * Enter an element symbol or name (e.g., `H` or `Hydrogen`) to retrieve: Symbol, Name, Atomic Mass (u), Atomic Number, Electronegativity, Electron Affinity (kJ/mol), Atomic Radius (pm), Ionization Energy (kJ/mol), Valence & Total Electrons, Group, Period, and Element Type.
* ⚖️ **Molar Mass Calculation**
  * Compute molar mass for any valid chemical formula—including nested parentheses—directly in the browser, with error handling for invalid inputs.
* 🔢 **Chemical Equation Balancer**
  * Auto-balance user‑entered equations (e.g., `H2+O2->H2O` becomes `2H2+O2->2H2O`) with an adjustable coefficient search up to 10.
* 🧪 **Stoichiometry**
  * Three modes: Product from Reactant, Reactant from Product, and Limiting Reactant. Dynamically generates input fields based on a balanced equation, then computes moles of selected compounds.
* 🛡️ **Secure & Robust Server**
  * Fastify-powered server removes `X-Powered-By` header, enforces `X-Requested-With: XMLHttpRequest` on API, serves static assets with cache control, and includes graceful shutdown logic.
---
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
3. **Ensure** `ptable.json` is present in the project root under the schema defined in `Schema.txt`.
4. **Start the server**
   ```bash
   node server.js
   ```
   * By default, listens on port **6005**. Override via `PORT` environment variable if needed.
---
## Usage
1. Open your browser and navigate to:
   ```
   http://localhost:6005
   ```
2. Use the interface to:
   * **Lookup** element data by symbol/name.
   * **Calculate** the molar mass of a formula.
   * **Balance** chemical equations.
   * **Perform** stoichiometric calculations (select mode, input moles, and view results).
Results update dynamically—no page reloads.
---
## Examples
### Molar Mass
* **Input:** `Al2(SO4)3`
* **Output:** `342.15 g/mol`
### Equation Balancing
* **Input:** `C3H8+O2->CO2+H2O`
* **Output:** `C3H8+5O2->3CO2+4H2O`
### Stoichiometry (Limiting Reactant)
* **Equation:** `2H2+O2->2H2O`
* **Inputs:** H2 = 3 mol, O2 = 1 mol
* **Result:** Limiting reactant: `O2`, Max H2O = `2 mol`
---
## File Structure
```
chemistry-utility/
├── index.html         # Front-end with inline CSS & Google Fonts
├── script.js          # Client-side logic (element/mass/equation/stoichiometry)
├── server.js          # Fastify server with secure hooks and static routing
├── package.json       # Metadata & dependencies
├── ptable.json        # Periodic table data (JSON)
├── Schema.txt         # Data schema for ptable.json
├── README.md          # Project documentation
└── LICENSE            # MIT License
```
---
## API Endpoint
### GET `/api/ptable`
* **Description:** Serves `ptable.json` only when `X-Requested-With: XMLHttpRequest` header is present.
* **Response:** JSON array of element objects.
* **Errors:** 403 if header missing, 500 if data missing.
### GET `/ptable.json`
* **Response:** 403 Forbidden (direct file access blocked).
### Static files
* All other assets and paths (`/`, `/*.html`, `/*.js`, etc.) are served via Fastify’s static plugin with appropriate `Cache-Control` headers.
---
## Customization
* **Styling:** Modify CSS variables under `<style>` in `index.html` for colors, fonts, and spacing.
* **Server:** Tweak `server.js` for port, hooks, logging, or additional routes.
* **Data:** Update `ptable.json` per `Schema.txt` to add new elements or properties.
---
## Contributing
1. Fork the repository and create a feature branch.
2. Commit changes with clear messages.
3. Submit a PR describing your feature or fix.
Please include tests or examples for new logic.
---
## Tests
> *(No automated tests yet; manual UI tests recommended.)*
> *Future:* Add a test suite (e.g., Mocha/Chai) and document `npm test`.
---
## License
This project is licensed under the **MIT License**.
See [LICENSE](LICENSE) for details.
## Acknowledgements
* Fastify team for a performant Node.js framework.
* Periodic table data schema inspired by \[PubChem] and \[Wikidata].
* Fonts from Google Fonts (Noto Sans & EB Garamond).