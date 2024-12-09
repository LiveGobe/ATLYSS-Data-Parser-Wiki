const fs = require("node:fs");
const path = require("node:path");
const findAssetByGuid = require("./bin/findAssetById");

const inputDir = path.join(__dirname, "outdata", "Scenes")
const outputDir = path.join(__dirname, "luatables");

function getDifficulty(val) {
    if (val == 0) return "EASY";
    else if (val == 1) return "NORMAL";
    else if (val == 2) return "HARD";

    return "";
}

function getType(type) {
    if (type == 0) return "Safe";
    if (type == 1) return "Field";
    if (type == 2) return "Dungeon";
    if (type == 3) return "Arena";

    return "";
}

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

function processFile(filePath) {
    const data = require(filePath);
    const creepSpawnData = data.filter(v => v.MonoBehaviour?._creepToSpawn);
    const creepArenaData = data.filter(v => v.MonoBehaviour?._creepArenaSlots);
    const mapData = data.filter(v => v.MonoBehaviour?._mapName);

    if (!mapData.length) return console.log(`File ${filePath} isn't a valid location`);

    luaTable += `["${mapData[0]?.MonoBehaviour?._mapName}"] = {\n\t\t`;
    luaTable += `name = "${mapData[0]?.MonoBehaviour?._mapName}",\n\t\t`;
    luaTable += `difficulties = {\n\t\t\t`;

    const creeps = {};
    creepArenaData.forEach(arenaData => {
        const arena = arenaData?.MonoBehaviour?._creepArenaSlots;
        arena.forEach(arenaSlot => {
            const difficulty = getDifficulty(arenaSlot._zoneDifficulty);
            if (!creeps[difficulty]) creeps[difficulty] = [];
            
            if (arenaSlot._arenaSlotTag && filePath.includes("map_dungeon")) {
                arenaSlot._creepArenaWaves.forEach(wave => {
                    const creepPool = wave._creepPool;
                    creepPool.forEach(creep => {
                        const guid = creep?.guid;
                        
                        if (!guid) return;
                        console.log(`Searching for asset with guid ${guid}...`);
                        creeps[difficulty].push(findAssetByGuid(guid)._creepName);
                    });
                });
            }
        });
    });

    const obj = Object.entries(creeps);
    obj.forEach(c => {
        if (!c[1].length) return;

        luaTable += `["${c[0]}"] = {\n\t\t\t\t`;
        luaTable += `creeps = {\n\t\t\t\t\t`;
        new Set(c[1]).forEach(creep => {
            luaTable += `"${creep}",\n\t\t\t\t\t`
        });
        luaTable = luaTable.slice(0, -1);
        luaTable += `}\n\t\t\t},\n\t\t\t`;
    });

    luaTable = luaTable.slice(0, -1);
    if (!obj.length || !obj.filter(i => i[1].length).length) luaTable = luaTable.slice(0, -3);

    luaTable += `},\n\t\t`;
    luaTable += `type = "${getType(mapData[0]?.MonoBehaviour._zoneType)}",\n\t\t`;
    luaTable += `bosses = {\n\t\t\t`;

    const addedCreeps = new Set();
    let count = 0;
    creepSpawnData.forEach(creep => {
        const guid = creep?.MonoBehaviour?._creepToSpawn?.guid;
        
        if (!guid) return;
        if (addedCreeps.has(guid)) return;
        console.log(`Searching for asset with guid ${guid}...`);
        const loaded = findAssetByGuid(guid);
        if (loaded._currencyDropBonus > 0) {
            addedCreeps.add(guid);
            count++;
            luaTable += `"${loaded._creepName}",\n\t\t\t`;
        }
    });

    // Remove unneccessary tabulations
    luaTable = luaTable.slice(0, -1);
    if (!count) luaTable = luaTable.slice(0, -3);

    luaTable += `},\n\t\t`;
    luaTable += `creeps = {\n\t\t\t`;
    count = 0;
    creepSpawnData.forEach(creep => {
        const guid = creep?.MonoBehaviour?._creepToSpawn?.guid;
        
        if (!guid) return;
        if (addedCreeps.has(guid)) return;
        addedCreeps.add(guid);
        console.log(`Searching for asset with guid ${guid}...`);
        luaTable += `"${findAssetByGuid(guid)._creepName}",\n\t\t\t`;
        count++;
    });

    // Remove unneccessary tabulations
    luaTable = luaTable.slice(0, -1);
    if (!count) luaTable = luaTable.slice(0, -3);

    luaTable += `},\n\t`;
    luaTable += `},\n\t`;

    console.log(`Added Location [${mapData[0]?.MonoBehaviour?._mapName}] to lua table...`);
}

let luaTable = "return {\n\t";
readDirectory(inputDir);
luaTable = luaTable.slice(0, -1) + `}`; // Remove the last \n and close the table

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "locations.lua"), luaTable);
console.log("Finished exporting lua table for Locations");