const path = require('path');

// List of parser scripts to run
const scripts = [
    "./parse-raw-data.js",
    "./parse-trade-items.js",
    "./parse-consumable-items.js",
    "./parse-equipment-items.js",
    "./parse-drop-tables.js",
    "./parse-creep-data.js",
    "./parse-locations.js",
    "./parse-npc-data.js",
    "./parse-classes-data.js"
];

// List of post-scripts to run after all parsers
const postScripts = [
    "./post-trade-items.js",
    "./post-consumable-items.js",
    "./post-equipment-items.js",
    "./post-loot-tables.js",
    "./post-creeps.js",
    "./post-locations.js",
    "./post-npc-data.js",
    "./post-classes-data.js",
];

// List of critical parser scripts
const criticalScripts = [
    "./parse-raw-data.js"
];

// Function to resolve file path to file URL (file://)
function resolveToFileURL(filePath) {
    const absolutePath = path.resolve(filePath);
    return `file://${absolutePath}`;
}

// Function to execute scripts and await completion for critical ones
async function executeScripts() {
    // Convert critical script paths to file URLs
    const criticalURLs = criticalScripts.map((script) =>
        resolveToFileURL(script)
    );

    // First, execute all critical parser scripts and await their completion
    const criticalPromises = criticalURLs.map(async (scriptURL) => {
        try {
            console.log(`Executing critical script: ${scriptURL}`);
            const module = await import(scriptURL);
            // Ensure the critical script is complete
            if (module && module.default instanceof Function) {
                await module.default(); // If the script exports a default function, await it
            }
        } catch (error) {
            console.error(`Error executing ${scriptURL}:`, error);
            process.exit(1); // Exit on failure of any critical script
        }
    });

    // Wait for all critical parser scripts to finish
    await Promise.all(criticalPromises);

    // After the critical scripts, execute non-critical parser scripts
    for (let script of scripts) {
        if (!criticalScripts.includes(script)) {
            try {
                console.log(`Executing: ${script}`);
                require(path.resolve(script)); // Synchronously execute non-critical scripts
            } catch (error) {
                console.error(`Error executing ${script}:`, error);
                process.exit(1); // Exit on failure of any non-critical script
            }
        }
    }

    // Execute post-processing scripts after all parsers are done
    await executePostScripts();
}

// Function to execute post-scripts
async function executePostScripts() {
    for (let script of postScripts) {
        try {
            console.log(`Executing post-script: ${script}`);
            await require(script)();
        } catch (error) {
            console.error(`Error executing post-script ${script}:`, error);
            process.exit(1); // Exit on failure of any post-script
        }
    }
}

// Run the script execution process
executeScripts();