const fs = require("node:fs");
const path = require("node:path");
const findAssetById = require("./bin/findAssetById");

const inputDir = path.join(__dirname, "outdata", "_prefab", "_entity", "_npc");
const outputDir = path.join(__dirname, "luatables");

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
    if (!filePath.split("\\").at(-1).startsWith("_npc")) return console.log(`File ${filePath} isn't an NPC file`);
    const npcData = require(filePath).filter(i => i.MonoBehaviour).find(i => i.MonoBehaviour._npcName)?.MonoBehaviour;

    if (!npcData || !npcData._npcName) return console.log(`File ${filePath} doesn't contain any MonoBehaviour`);

    // Get the directory of the `_npc` file
    const npcFolder = path.dirname(filePath);

    // Find a file that starts with "shopKeep" in the same folder
    const shopKeepFile = fs.readdirSync(npcFolder).find(file => file.startsWith("shopKeep"));

    // Load the shopKeep file
    let shopData;
    if (shopKeepFile) {
        shopData = require(path.join(npcFolder, shopKeepFile))[0]?.MonoBehaviour;
    }

    // Find quest files in the same folder
    let questsData = [];
    try {
        const questFiles = fs.readdirSync(path.join(npcFolder, "_quest"));
        // Load the quest files
        if (questFiles) {
            questFiles.forEach(file => {
                questsData.push(require(path.join(npcFolder, "_quest", file))[0]?.MonoBehaviour);
            })
        }
    } catch (e) {
        console.log(`No quest files were found for ${npcData._npcName.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)} NPC`);
    }

    const npcName = npcData._npcName.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`);

    luaTable += `["${npcData._npcName.replaceAll("\n", "\\n").replaceAll("</color>", "").replace(/\<color=(\w*)\>/g, "")}"] = {\n\t\t`;
    luaTable += `name = "${npcName}",\n\t\t`;
    luaTable += `shop = {\n\t\t\t`;
    if (shopData) {
        luaTable += `name = "${shopData._shopName}",\n\t\t\t`;
        shopData._shopkeepItemTables.forEach((table, tier) => {
            luaTable += `["Tier ${tier + 1}"] = {\n\t\t\t\t`;
            luaTable += `level = ${table._levelRequirement},\n\t\t\t\t`;
            luaTable += `items = {\n\t\t\t\t\t`;
            table._shopkeepItems.forEach(item => {
                console.log(`Searching for asset with guid ${item._scriptItem.guid}...`);
                const itemData = findAssetById(item._scriptItem.guid);
                if (itemData) {
                    luaTable += `{\n\t\t\t\t\t\t`;
                    luaTable += `name = "${itemData._itemName}",\n\t\t\t\t\t\t`;
                    luaTable += `stock = ${item._isInfiniteStock ? item._initialStock : 0},\n\t\t\t\t\t\t`;
                    luaTable += `refresh = ${item._stockRefreshTimer},\n\t\t\t\t\t`;
                    luaTable += `},\n\t\t\t\t\t`;
                } else if (item._gambleLootTable.guid) {
                    const data = item._itemNameTag.match(/Value:\s(\d+)/);
                    luaTable += `{\n\t\t\t\t\t\t`;
                    luaTable += `name = "Gamble Slot ${data[1]}",\n\t\t\t\t\t\t`;
                    luaTable += `stock = ${item._isInfiniteStock ? item._initialStock : 0},\n\t\t\t\t\t\t`;
                    luaTable += `refresh = ${item._stockRefreshTimer},\n\t\t\t\t\t`;
                    luaTable += `},\n\t\t\t\t\t`;
                }
            });
            luaTable = luaTable.slice(0, -1);
            luaTable += `},\n\t\t\t`;
            luaTable += `},\n\t\t\t`;
        });
        luaTable = luaTable.slice(0, -1);
        luaTable += `},\n\t\t`;
    } else luaTable = luaTable.slice(0, -4) + "},\n\t\t"
    luaTable += `quests = {\n\t\t\t`;
    if (questsData.length) {
        questsData.forEach(quest => {
            const questDescription = quest._questDescription.replaceAll("\n", "\\n").replaceAll("\"", "\\\"").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`);
            luaTable += "{\n\t\t\t\t";
            luaTable += `name = "${quest._questName}",\n\t\t\t\t`;
            luaTable += `description = "${questDescription}",\n\t\t\t\t`;
            luaTable += `level = ${quest._questLevel},\n\t\t\t\t`;
            luaTable += `currencyReward = ${quest._questCurrencyReward},\n\t\t\t\t`;

            // Add quest item rewards
            luaTable += `itemRewards = {\n\t\t\t\t\t`;
            (quest._questItemRewards).forEach(itemReward => {
                console.log(`Searching for asset with guid ${itemReward._scriptItem.guid}...`);
                const itemData = findAssetById(itemReward._scriptItem.guid);
                luaTable += `{\n\t\t\t\t\t\t`;
                luaTable += `name = "${itemData._itemName}",\n\t\t\t\t\t\t`;
                luaTable += `quantity = ${itemReward._setItemData?._quantity},\n\t\t\t\t\t`;
                luaTable += `},\n\t\t\t\t\t`;
            });
            luaTable = luaTable.slice(0, -1); // Remove last comma
            luaTable += `\n\t\t\t\t},\n\t\t\t\t`;

            const questType = quest._questType === 1 ? "Repeatable" : "Single";
            luaTable += `type = "${questType}",\n\t\t\t\t`;

            luaTable += `prerequisites = {\n\t\t\t\t\t`;
            (quest._preQuestRequirements || []).forEach(preReq => {
                console.log(`Searching for prerequisite quest with guid ${preReq.guid}...`);
                const preReqData = findAssetById(preReq.guid);
                if (preReqData) {
                    luaTable += `{\n\t\t\t\t\t\t`;
                    luaTable += `name = "${preReqData._questName}",\n\t\t\t\t\t`;
                    luaTable += `},\n\t\t\t\t\t`;
                }
            });
            luaTable = luaTable.slice(0, -1); // Remove last comma
            luaTable += `\n\t\t\t\t},\n\t\t\t\t`;

            // Add quest objectives
            luaTable += `objectives = {\n\t\t\t\t\t`;
            luaTable += `itemRequirements = {\n\t\t\t\t\t\t`;
            (quest._questObjective?._questItemRequirements || []).forEach(req => {
                console.log(`Searching for asset with guid ${req._questItem.guid}...`);
                const itemData = findAssetById(req._questItem.guid);
                luaTable += `{\n\t\t\t\t\t\t\t`;
                luaTable += `item = "${itemData._itemName}",\n\t\t\t\t\t\t\t`;
                luaTable += `quantity = ${req._itemsNeeded},\n\t\t\t\t\t\t`;
                luaTable += `},\n\t\t\t\t\t\t`;
            });
            luaTable = luaTable.slice(0, -1); // Remove last comma
            luaTable += `\n\t\t\t\t\t},\n\t\t\t\t\t`;

            luaTable += `creepRequirements = {\n\t\t\t\t\t\t`;
            (quest._questObjective?._questCreepRequirements || []).forEach(req => {
                console.log(`Searching for asset with guid ${req._questCreep.guid}...`);
                const creepData = findAssetById(req._questCreep.guid);
                luaTable += `{\n\t\t\t\t\t\t\t`;
                luaTable += `creep = "${creepData._creepName}",\n\t\t\t\t\t\t\t`;
                luaTable += `quantity = ${req._creepsKilled},\n\t\t\t\t\t\t`;
                luaTable += `},\n\t\t\t\t\t\t`;
            });
            luaTable = luaTable.slice(0, -1); // Remove last comma
            luaTable += `\n\t\t\t\t\t},\n\t\t\t\t\t`;

            luaTable += `triggerRequirements = {\n\t\t\t\t\t\t`;
            (quest._questObjective?._questTriggerRequirements || []).forEach(trigger => {
                luaTable += `{\n\t\t\t\t\t\t\t`;
                luaTable += `tag = "${trigger._questTriggerTag}",\n\t\t\t\t\t\t\t`;
                luaTable += `prefix = "${trigger._prefix}",\n\t\t\t\t\t\t\t`;
                luaTable += `suffix = "${trigger._suffix}",\n\t\t\t\t\t\t\t`;
                luaTable += `emitsNeeded = ${trigger._triggerEmitsNeeded},\n\t\t\t\t\t\t`;
                luaTable += `},\n\t\t\t\t\t\t`;
            });
            luaTable = luaTable.slice(0, -1); // Remove last comma
            luaTable += `\n\t\t\t\t\t}\n\t\t\t\t`;

            luaTable += `},\n\t\t\t`;
            luaTable += `},\n\t\t\t`;
        });
        luaTable = luaTable.slice(0, -1);
    }
    luaTable += `},\n\t\t`;
    luaTable = luaTable.slice(0, -1);
    luaTable += `},\n\t`;

    console.log(`Added NPC [${npcData._npcName.replaceAll("\n", "\\n").replaceAll("</color>", "").replace(/\<color=(\w*)\>/g, "")}] to lua table...`);
}

let luaTable = "return {\n\t";
readDirectory(inputDir);
luaTable = luaTable.slice(0, -1) + `}`; // Remove the last \n and close the table

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "npcs.lua"), luaTable);
console.log("Finished exporting lua table for NPCs");
