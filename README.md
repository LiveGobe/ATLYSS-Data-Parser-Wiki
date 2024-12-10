# ATLYSS Wiki Data Parser

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)  

ATLYSS Data Parser for [ATLYSS wiki](https://atlyss.wiki.gg/wiki/ATLYSS_Wiki) is a JavaScript tool for extracting data from the game **[ATLYSS](https://store.steampowered.com/app/2768430/ATLYSS/)** and posting data on wiki, enabling people to access and post new game data to wiki.

---

## Features

- **Data Extraction**: Retrieve structured content from the ATLYSS game files.
- **Format Conversion**: Export data in JSON format, parsing it to a LUA object for wiki Modules.

---

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v22 or higher)
- **npm** (for dependency management)

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/LiveGobe/ATLYSS-Wiki-Data-Parser.git
   cd ATLYSS-Wiki-Data-Parser
   ```
Or by using [GitHub Desktop](https://desktop.github.com/download/)

2. Install the dependencies by running the npm install script (You only need to do it once):
  ```bash
  npm install
  ```

## Usage
### Ripping the Assets with Asset Ripper
Use [Asset Ripper](https://github.com/AssetRipper/AssetRipper) to get the game files. When exporting, select **"Export Unity Project"** option.

### Running the Parser
Configure your settings by making a copy of **"config-example.js"** and naming it **"config.js"**, then change **username** and **password** fields with your account on wiki.gg.

Run the npm start script:

  ```bash
  npm start
  ```
Provide a path to **"Resources"** folder inside the exported project you made using Asset Ripper (Should include "~\ExportedProject\Assets\Resources")

The process will take some time, but by the end the data will be posted to wiki automatically.

## License
This project is licensed under the MIT License.

## Acknowledgements
Huge thanks to the ATLYSS Wiki community for their cooperation and hard work.

## Contact
For any questions or feedback, feel free to reach out:

GitHub: [@LiveGobe](https://github.com/LiveGobe)
