const fs = require("node:fs");
const path = require("node:path");
const findAssetByGuid = require("./findAssetById");

module.exports = function(creepName) {
    function findSpawnLocation(sceneDir) {
        const spawnLocations = [];

        // Read all files from the given scene directory
        const sceneFiles = fs.readdirSync(sceneDir);

        sceneFiles.forEach((file) => {
            const filePath = path.join(sceneDir, file);

            try {
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const sceneData = JSON.parse(fileContent);

                // Search for spawn locations within the file content
                sceneData.forEach((entry) => {
                    const monoBehaviour = entry.MonoBehaviour;
                    if (monoBehaviour && monoBehaviour?._creepToSpawn?.guid) {
                        const asset = findAssetByGuid(monoBehaviour._creepToSpawn.guid);
                        if (asset._currencyDropBonus > 0 && asset._creepName == creepName) {
                            const mapName = sceneData.find(v => v?.MonoBehaviour._mapName)?.MonoBehaviour._mapName + " Boss";
                            spawnLocations.push(mapName);
                        }
                    }
                });
            } catch (error) {
                console.error(`Failed to process file ${file}:`, error);
            }
        });

        return spawnLocations;
    }

    // Example Usage
    const inputDir = path.join(__dirname, "..", "outdata", "Scenes");
    const spawnLocations = findSpawnLocation(inputDir);

    if (spawnLocations.length > 0) {
        console.log("Found Spawn Locations:", spawnLocations);
        return spawnLocations;
    } else {
        console.log("No Spawn Locations Found.");
    }
}