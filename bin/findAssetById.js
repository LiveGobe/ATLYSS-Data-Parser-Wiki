const fs = require("node:fs");
const path = require("node:path");

module.exports = function (guid) {
    if (!guid) return;

    const inputDir = path.join(__dirname, "..", "outdata");
    const cacheFilePath = path.join(__dirname, "cache.json");

    // Load cache from the cache file if it exists
    let cache = {};
    if (fs.existsSync(cacheFilePath)) {
        try {
            const cacheContent = fs.readFileSync(cacheFilePath, "utf-8");
            cache = JSON.parse(cacheContent);
        } catch (error) {
            console.error("Failed to load cache file. Creating a new cache.");
        }
    }

    // Check if the GUID is already in the cache
    if (cache[guid]) {
        console.log(`Found GUID in cache: ${guid}`);
        return cache[guid];
    }

    function findFileByGuid(dir) {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                const found = findFileByGuid(itemPath);
                if (found) {
                    return found;
                }
            } else if (stats.isFile()) {
                const fileContent = fs.readFileSync(itemPath, "utf-8");
                try {
                    const data = JSON.parse(fileContent)[0];
                    if (data.guid === guid) {
                        return data.MonoBehaviour;
                    }
                } catch (error) {
                    console.error(`Failed to parse JSON in file: ${itemPath}`);
                }
            }
        }

        return null;
    }

    // Find GUID in the file system
    const foundData = findFileByGuid(inputDir);

    if (foundData) {
        // Store the found GUID and its data in the cache
        cache[guid] = foundData;
        try {
            fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 4), "utf-8");
            console.log(`Cached GUID: ${guid}`);
        } catch (error) {
            console.error("Failed to update cache file:", error);
        }
    }

    return foundData;
};