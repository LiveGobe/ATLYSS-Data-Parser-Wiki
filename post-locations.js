const fs = require("fs");
const mw = require("nodemw");
const path = require("path");
const config = require("./config");

// Configuration
const USERNAME = config.username; // Replace with your user account username
const PASSWORD = config.password; // Replace with your user account password
const PAGE_TITLE = "Module:Locations/data";
const FILE_PATH = path.join(__dirname, "luatables", "locations.lua"); // Path to your local file
const VERSION_NAME = require("./gameVersion.json").gameVersion; // Replace with the version name for your edit summary

async function updateLocations() {
    try {
        const client = new mw({
            protocol: "https",
            server: "atlyss.wiki.gg",
            path: "/",
            username: USERNAME,
            password: PASSWORD,
        });

        await new Promise((resolve, reject) => {
            client.logIn((err, response) => {
                if (err) return reject(err);

                console.log(`Logged in as ${response.lgusername}`);
                client.getArticle(PAGE_TITLE, (err, data) => {
                    if (err) return reject(err);

                    const newContent = fs.readFileSync(FILE_PATH, "utf8");

                    if (data && data.trim() === newContent.trim()) {
                        console.log("No changes detected. Skipping edit.");
                        return resolve();
                    }

                    client.edit(
                        PAGE_TITLE,
                        newContent,
                        `(Automated Update) Updated data for version ${VERSION_NAME}`,
                        (err) => {
                            if (err) return reject(err);

                            console.log(`Trade items data updated to ${VERSION_NAME}`);
                            resolve();
                        }
                    );
                });
            });
        });
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
}

// Export the function for dynamic import or reuse
module.exports = updateLocations;

// Execute only if the script is run directly
if (require.main === module) {
    (async () => {
        try {
            await updateLocations();
            console.log("Update completed successfully.");
        } catch (error) {
            console.error("Error during update:", error);
            process.exit(1);
        }
    })();
}