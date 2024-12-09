const fs = require("node:fs");
const path = require("node:path");
const findAssetById = require("./bin/findAssetById");

const inputDir = path.join(__dirname, "outdata", "_class");
const noviceSkillsDir = path.join(__dirname, "outdata", "_skill", "_noviceskills"); // Novice skills directory
const outputDir = path.join(__dirname, "luatables");

const filesList = fs.readdirSync(inputDir);
const noviceFilesList = fs.readdirSync(noviceSkillsDir); // Get the list of novice skill files

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
                              : "<color=yellow>instant cast time.</color>");
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
            luaTable += `{\n\t\t\t\t`;
            luaTable += `name = "${skillData._skillName}",\n\t\t\t\t`;
            luaTable += `description = "${skillData._skillDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t`;
            luaTable += `ranks = {\n\t\t\t\t\t`;

            skillData._skillRanks.forEach((rank, rankNum) => {
                luaTable += `{\n\t\t\t\t\t\t`;
                luaTable += `rankTag = "${rank._rankTag}",\n\t\t\t\t\t\t`;
                luaTable += `description = "${getRankDescription(skillData, rankNum).replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t\t\t`;
                luaTable += `level = ${rank._levelRequirement},\n\t\t\t\t\t\t`;
                luaTable += `castTime = ${rank._castTime},\n\t\t\t\t\t\t`;
                luaTable += `cooldown = ${rank._coolDown},\n\t\t\t\t\t\t`;
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

// Process novice skills
noviceFilesList.forEach(folder => {
    // Get all files in the folder
    const filesInFolder = fs.readdirSync(path.join(noviceSkillsDir, folder));

    // Filter the files to match the pattern "skill_<Skill Name>.json"
    const skillFiles = filesInFolder.filter(file => /^skill_.*\.json$/.test(file));

    // If no matching files found, log and skip
    if (skillFiles.length === 0) {
        console.log(`No skill files found in folder ${folder}`);
        return;
    }

    // Process each skill file
    luaTable += `{\n\t\t\t\t`;
    skillFiles.forEach(file => {
        const skillData = require(path.join(noviceSkillsDir, folder, file))[0]?.MonoBehaviour;

        if (!skillData) {
            console.log(`File ${file} doesn't contain any MonoBehaviour`);
            return;
        }

        luaTable += `name = "${skillData._skillName}",\n\t\t\t\t`;
        luaTable += `description = "${skillData._skillDescription.replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t`;
        luaTable += `ranks = {\n\t\t\t\t\t`;

        skillData._skillRanks.forEach((rank, rankNum) => {
            luaTable += `{\n\t\t\t\t\t\t`;
            luaTable += `rankTag = "${rank._rankTag}",\n\t\t\t\t\t\t`;
            luaTable += `description = "${getRankDescription(skillData, rankNum).replaceAll("\n", "\\n").replaceAll("</color>", "</span>").replace(/\<color=(\w*)\>/g, `<span style=\\"color: $1;\\">`)}",\n\t\t\t\t\t\t`;
            luaTable += `level = ${rank._levelRequirement},\n\t\t\t\t\t\t`;
            luaTable += `castTime = ${rank._castTime},\n\t\t\t\t\t\t`;
            luaTable += `cooldown = ${rank._coolDown},\n\t\t\t\t\t\t`;
            luaTable += `manaCost = ${rank._manaCost},\n\t\t\t\t\t\t`;
            luaTable += `healthCost = ${rank._healthCost},\n\t\t\t\t\t\t`;
            luaTable += `staminaCost = ${rank._staminaCost}\n\t\t\t\t\t},\n\t\t\t\t\t`;
        });

        luaTable = luaTable.slice(0, -2); // Remove last comma
        luaTable += `\t}\n\t\t\t},\n\t\t\t`;
        console.log(`Added Novice skills to lua table...`);
    });
});

luaTable = luaTable.slice(0, -1)
luaTable += `}\n\t}\t\n}`

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "classes.lua"), luaTable);
console.log("Finished exporting Lua table for Classes and Novice skills.");