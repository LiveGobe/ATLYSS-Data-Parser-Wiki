const fs = require("node:fs");
const path = require("node:path");
const findAssetById = require("./bin/findAssetById");
const damageTypes = require("./bin/damageTypes");

const inputDir = path.join(__dirname, "outdata", "_class");
const skillDir = path.join(__dirname, "outdata", "_skill")
const noviceSkillsDir = path.join(__dirname, "outdata", "_skill", "_noviceskills"); // Novice skills directory
const skillScrollDir = path.join(__dirname, "outdata", "_skill", "00_skillscroll_skills"); // Skill scroll skills directory
const outputDir = path.join(__dirname, "luatables");

const excludedSkills = ["Geyser", "Flak", "Talus"];

const filesList = fs.readdirSync(inputDir);

let luaTable = "return {\n\t";

// Function to process rank descriptions
function getRankDescription(skill, rank) {
    const playerStats = { attackPower: 1, magicPower: 1, dexPower: 1 }; // Simulating PlayerStats component

    let skpValue = 0;

    // Calculate base SKP value based on damage type
    switch (skill._skillDamageType) {
        case 0:
            skpValue = Math.floor(
                skill._baseSkillPower * skill._skillRanks[rank]._skillPowerPercent +
                playerStats.attackPower * 0.62
            );
            break;
        case 1:
            skpValue = Math.floor(
                skill._baseSkillPower * skill._skillRanks[rank]._skillPowerPercent +
                playerStats.dexPower * 0.62
            );
            break;
        case 2:
            skpValue = Math.floor(
                skill._baseSkillPower * skill._skillRanks[rank]._skillPowerPercent +
                playerStats.magicPower * 0.62
            );
            break;
    }

    let rankDescriptor = skill._skillRanks[rank]?._rankDescriptor || "";

    if (rankDescriptor.includes("$SKP")) {
        if (skill._skillRanks[rank]._skillObjectOutput._skillObjectCondition._scriptableCondition.guid) {
            console.log(`Processing skill condition with guid ${skill._skillRanks[rank]._skillObjectOutput._skillObjectCondition._scriptableCondition.guid}...`);
            const conditionData = findAssetById(skill._skillRanks[rank]._skillObjectOutput._skillObjectCondition._scriptableCondition.guid);
            const basePowerValue = conditionData?._basePowerValue || 0;
            const attackPowerMod = Math.max(1, Math.floor((playerStats.attackPower + basePowerValue) * conditionData._attackPowerMod) - 1);
            const magicPowerMod = Math.max(1, Math.floor((playerStats.magicPower + basePowerValue) * conditionData._magicPowerMod) - 1);
            const rangePowerMod = Math.max(1, Math.floor((playerStats.dexPower + basePowerValue) * conditionData._rangePowerMod) - 1);

            rankDescriptor = rankDescriptor
                .replace("$SKP", `<color=yellow>${skpValue}</color>`)
                .replace("$ATP", `<color=yellow>${attackPowerMod}</color>`)
                .replace("$MKP", `<color=yellow>${magicPowerMod}</color>`)
                .replace("$RAP", `<color=yellow>${rangePowerMod}</color>`);
        }
    }

    if (skill._skillRanks[rank]._selfConditionOutput.guid) {
        console.log(`Processing self condition with guid ${skill._skillRanks[rank]._selfConditionOutput.guid}...`);
        const selfConditionData = findAssetById(skill._skillRanks[rank]._selfConditionOutput.guid);
        if (selfConditionData) {
            rankDescriptor += selfConditionData._conditionDescription;

            if (selfConditionData._cancelOnHit) {
                rankDescriptor += " <color=yellow>Cancels if hit.</color>";
            }
            if (selfConditionData._isPermanent) {
                rankDescriptor += " <color=yellow>Permanent.</color>";
            } else if (selfConditionData._duration > 0) {
                rankDescriptor += ` <color=yellow>Lasts for ${selfConditionData._duration} seconds.</color>`;
            }
            if (selfConditionData._isStackable) {
                rankDescriptor += " <color=yellow>Stackable.</color>";
            }
            if (selfConditionData._isRefreshable) {
                rankDescriptor += " <color=yellow>Refreshes when re-applied.</color>";
            }
        }
    }

    return rankDescriptor.replace("$SKP", `<color=yellow>${skpValue}</color>`)
                          .replace("$CASTTIME", skill._skillRanks[rank]._castTime > 0.12
                              ? `<color=yellow>${skill._skillRanks[rank]._castTime.toFixed(2)} sec cast time.</color>`
                              : "<color=yellow>instant cast time.</color>")
                          .replace("$COOLDWN", `${skill._skillRanks[rank]._coolDown} sec Cooldown`);
}

// Helper function to determine skill type
function determineSkillType(skillPath) {
    const folderName = path.dirname(skillPath).toLowerCase(); // Extract folder name and normalize case
    if (folderName.includes("passive") || folderName.includes("masteries")) {
        return "Passive";
    }
    return "Active";
}

function locateSkillFile(guid, skillDir) {
    // Helper function for recursive search
    function searchDirectory(directory) {
        const entries = fs.readdirSync(directory);

        for (const entry of entries) {
            const entryPath = path.join(directory, entry);

            if (fs.statSync(entryPath).isDirectory()) {
                // If it's a directory, search recursively
                const result = searchDirectory(entryPath);
                if (result) {
                    return result; // Return the result if found in a subdirectory
                }
            } else if (fs.statSync(entryPath).isFile() && entry.endsWith(".json")) {
                // If it's a file, read and parse JSON
                const fileContent = fs.readFileSync(entryPath, "utf-8");
                try {
                    const jsonData = JSON.parse(fileContent);

                    // Check if the file contains a matching guid
                    if (jsonData && jsonData[0].guid === guid) {
                        return entryPath; // Return the file path if found
                    }
                } catch (err) {
                    console.error(`Error parsing JSON in file ${entryPath}:`, err);
                }
            }
        }

        return null; // Return null if not found in this directory
    }

    // Start the recursive search from the top-level directory
    return searchDirectory(skillDir);
}

// Process class skills
filesList.forEach(file => {
    const data = require(path.join(inputDir, file))[0]?.MonoBehaviour;

    if (!data) {
        console.log(`File ${file} doesn't contain any MonoBehaviour`);
        return;
    }

    luaTable += `["${data._className}"] = {\n\t\t`;
    luaTable += `name = "${data._className}",\n\t\t`;
    luaTable += `skills = {\n\t\t\t`;

    data._classSkills.forEach(skill => {
        console.log(`Processing skill with guid ${skill.guid}...`);
        const skillData = findAssetById(skill.guid);
    
        if (skillData) {
            // Locate the skill file based on the guid
            const skillFilePath = locateSkillFile(skill.guid, skillDir);
    
            if (!skillFilePath) {
                console.error(`Skill file for GUID ${skill.guid} not found.`);
                return;
            }
    
            luaTable += `{\n\t\t\t\t`;
            luaTable += `name = "${skillData._skillName}",\n\t\t\t\t`;
            luaTable += `description = "${skillData._skillDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t`;
            luaTable += `damageType = "${damageTypes[skillData._skillDamageType]}",\n\t\t\t\t`;
            luaTable += `type = "${determineSkillType(skillFilePath)}",\n\t\t\t\t`; // Pass the located skill file path
            luaTable += `ranks = {\n\t\t\t\t\t`;
    
            skillData._skillRanks.forEach((rank, rankNum) => {
                luaTable += `{\n\t\t\t\t\t\t`;
                luaTable += `rankTag = "${rank._rankTag}",\n\t\t\t\t\t\t`;
                luaTable += `description = "${getRankDescription(skillData, rankNum).replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t\t\t`;
                luaTable += `level = ${rank._levelRequirement},\n\t\t\t\t\t\t`;
                luaTable += `castTime = ${rank._castTime},\n\t\t\t\t\t\t`;
                luaTable += `cooldown = ${rank._coolDown},\n\t\t\t\t\t\t`;
                luaTable += `itemCost = "${rank._requiredItem?.guid ? "x" + rank._requiredItemQuantity + " " + findAssetById(rank._requiredItem.guid)._itemName : ""}",\n\t\t\t\t\t\t`;
                luaTable += `manaCost = ${rank._manaCost},\n\t\t\t\t\t\t`;
                luaTable += `healthCost = ${rank._healthCost},\n\t\t\t\t\t\t`;
                luaTable += `staminaCost = ${rank._staminaCost}\n\t\t\t\t\t},\n\t\t\t\t\t`;
            });
    
            luaTable = luaTable.slice(0, -2); // Remove last comma
            luaTable += `\n\t\t\t\t}\n\t\t\t},\n\t\t\t`;
        }
    });    
    luaTable += "},\n\t\t";

    luaTable = luaTable.slice(0, -6); // Remove last comma
    luaTable += `},\n\t},\n\t`;
    console.log(`Added Class [${data._className}] to lua table...`);
});

luaTable += `["Novice"] = {\n\t\t`;
luaTable += `name = "Novice",\n\t\t`;
luaTable += `skills = {\n\t\t\t`;

// Helper function to process folders and files
function processSkillFolder(skillFolderPath) {
    const folders = fs.readdirSync(skillFolderPath);

    folders.forEach(folder => {
        const filesInFolder = fs.readdirSync(path.join(skillFolderPath, folder));

        // Filter the files to match the pattern "skill_<Skill Name>.json"
        const skillFiles = filesInFolder.filter(file => /^skill_.*\.json$/.test(file));

        if (skillFiles.length === 0) {
            console.log(`No skill files found in folder ${folder}`);
            return;
        }

        skillFiles.forEach(file => {
            if (file.endsWith("_0.json")) return;

            const skillData = require(path.join(skillFolderPath, folder, file))[0]?.MonoBehaviour;

            if (!skillData || excludedSkills.includes(skillData._skillName)) {
                console.log(`File ${file} doesn't contain any MonoBehaviour`);
                return;
            }

            luaTable += `{\n\t\t\t\t`;
            luaTable += `name = "${skillData._skillName}",\n\t\t\t\t`;
            luaTable += `description = "${skillData._skillDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t`;
            luaTable += `damageType = "${damageTypes[skillData._skillDamageType]}",\n\t\t\t\t`;
            luaTable += `type = "${determineSkillType(path.join(skillFolderPath, folder, file))}",\n\t\t\t\t`;
            luaTable += `ranks = {\n\t\t\t\t\t`;

            skillData._skillRanks.forEach((rank, rankNum) => {
                luaTable += `{\n\t\t\t\t\t\t`;
                luaTable += `rankTag = "${rank._rankTag}",\n\t\t\t\t\t\t`;
                luaTable += `description = "${getRankDescription(skillData, rankNum).replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t\t\t`;
                luaTable += `level = ${rank._levelRequirement},\n\t\t\t\t\t\t`;
                luaTable += `castTime = ${rank._castTime},\n\t\t\t\t\t\t`;
                luaTable += `cooldown = ${rank._coolDown},\n\t\t\t\t\t\t`;
                luaTable += `itemCost = "${rank._requiredItem?.guid ? "x" + rank._requiredItemQuantity + " " + findAssetById(rank._requiredItem.guid)._itemName : ""}",\n\t\t\t\t\t\t`;
                luaTable += `manaCost = ${rank._manaCost},\n\t\t\t\t\t\t`;
                luaTable += `healthCost = ${rank._healthCost},\n\t\t\t\t\t\t`;
                luaTable += `staminaCost = ${rank._staminaCost}\n\t\t\t\t\t},\n\t\t\t\t\t`;
            });

            luaTable = luaTable.slice(0, -2); // Remove last comma
            luaTable += `\t}\n\t\t\t},\n\t\t\t`;
            console.log(`Added Novice skills to lua table...`);
        });
    });
}

// Process novice skills and additional skill folders
processSkillFolder(noviceSkillsDir);
processSkillFolder(skillScrollDir);
processSkillFolder(path.join(skillScrollDir, "00_masteries"));

luaTable = luaTable.slice(0, -1);
luaTable += `}\n\t}\n}`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "classes.lua"), luaTable);
console.log("Finished exporting Lua table for Classes and Novice skills.");