const fs = require("node:fs");
const path = require("node:path");
const findAssetByGuid = require("./bin/findAssetById");

const inputDirs = [
    path.join(__dirname, "outdata", "_item", "00_chest_loot_table"),
    path.join(__dirname, "outdata", "_prefab", "_entity", "_npc"),
    path.join(__dirname, "outdata", "_prefab", "_entity", "_creep", "_creepdirectory")
];
const outputDir = path.join(__dirname, "luatables");

let luaTable = {
    Chest: {},
    Breakable: {},
    Creep: {},
    Gambling: {}
};

function readDirectory(inputFolder) {
    const fList = fs.readdirSync(inputFolder);

    fList.forEach(file => {
        const filePath = path.join(inputFolder, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // If the item is a directory, recursively read it
            readDirectory(filePath);
        } else {
            // Process the file if it's not a directory
            processFile(filePath);
        }
    });
}

function getType(fileName) {
    if (fileName.includes("Chest")) return "Chest";
    else if (fileName.includes("Breakbox")) return "Breakable";
    else if (fileName.includes("CREEP")) return "Creep";
    else if (fileName.includes("Cost_tier")) return "Gambling";

    return "";
}

function processFile(filePath) {
    const data = require(filePath)[0]?.MonoBehaviour;

    if (!data || !data._itemDrops || !Array.isArray(data._itemDrops) || data._itemDrops.length === 0) {
        console.log(`File ${filePath} doesn't contain valid _itemDrops`);
        return;
    }

    const type = getType(data.m_Name);
    if (!luaTable[type] && !filePath.includes("_npc")) return;

    const entryName = data._creepName ?? data.m_Name.replace("lootTable_", "")
        .split("Chest")
        .map(v => v.charAt(0).toUpperCase() + v.slice(1))
        .join(" Chest")
        .replace(/\(|\)/g, "")
        .replace("ChestBoss", "Boss Chest")
        .replace("Breakbox", " Pot")
        .replace("Catcombs", "Catacombs")
        .replace("Catacombs", "Sanctum Catacombs")
        .replace("Grove", "Crescent Grove")
        .replace("Chest ", "")
        .replace(" Chest", "")
        .replace(/_(\d+).*tier(\d+)/, (match, p1, p2) => {
            const num1 = parseInt(p1, 10); // Convert the first match to an integer
            const num2 = parseInt(p2, 10); // Convert the second match to an integer
            return ` Cost ${num1} Tier ${num2}`;
        });

    if (!luaTable[type][entryName]) {
        luaTable[type][entryName] = [];
    }

    data._itemDrops.forEach(drop => {
        console.log(`Searching for asset with guid ${drop._item.guid}...`);
        const dropData = findAssetByGuid(drop._item.guid);

        if (!dropData) return;

        luaTable[type][entryName].push(dropData._itemName);
        console.log(`Added ${type} drop for ${entryName}: ${dropData._itemName}`);
    });
}

function luaTableToString(table) {
    const formatEntries = entries =>
        Object.entries(entries)
            .map(
                ([name, items]) =>
                    `\t\t["${name}"] = {\n${items
                        .map(item => `\t\t\t"${item}"`)
                        .join(",\n")}\n\t\t}`
            )
            .join(",\n");

    const formatCategory = (categoryName, entries) =>
        `\t["${categoryName}"] = {\n${formatEntries(entries)}\n\t}`;

    const categories = Object.entries(table)
        .map(([categoryName, entries]) => formatCategory(categoryName, entries))
        .join(",\n");

    return `return {\n${categories}\n}`;
}

// Read directories and process files
inputDirs.forEach(readDirectory);

// Convert luaTable to a string
const luaTableString = luaTableToString(luaTable);

// Write to output file
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "drop-tables.lua"), luaTableString);
console.log("Finished exporting lua table for Drop Tables");