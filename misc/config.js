import fs from "fs";

export let config = {};
export default config;

// Every option can also be set through an environment variable, which is handy
// for Docker/Dokploy deployments where you'd rather not mount a config.json:
//   - the bot token: DISCORD_TOKEN (or SKINPEEK_TOKEN)
//   - any other option: SKINPEEK_ + the option name in SCREAMING_SNAKE_CASE
//     e.g. SKINPEEK_OWNER_ID=1234, SKINPEEK_HDEV_TOKEN=abc, SKINPEEK_FETCH_SKIN_PRICES=false
// Environment variables take priority over config.json and are never written back to it.
export const envVarName = (optionName) => "SKINPEEK_" + optionName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

const tokenFromEnv = () => process.env.DISCORD_TOKEN || process.env.SKINPEEK_TOKEN || "";

// for every option overridden by an env var, the value it had in config.json (or its default),
// so that saving the config later on (e.g. `!status`) never writes env secrets to disk
let fileValues = {};

export const loadConfig = (filename="config.json") => {
    let loadedConfig;
    let configFileExists = true;

    try {
        loadedConfig = fs.readFileSync(filename, 'utf-8');
    } catch(e) {
        if(tokenFromEnv()) {
            // no config file, but the token was provided via the environment: run with defaults
            console.log(`${filename} not found, using default options and environment variables`);
            configFileExists = false;
            loadedConfig = "{}";
        } else {
            try {
                fs.readFileSync(filename + ".example", 'utf-8');
                console.error(`You forgot to rename ${filename}.example to ${filename}!`);
                console.error(`(Hint: If you can only see ${filename}, try enabling "file name extensions" in file explorer)`)
            } catch(e1) {
                console.error(`Could not find ${filename}!`, e);
            }
            return;
        }
    }

    try {
        loadedConfig = JSON.parse(loadedConfig);
    } catch (e) {return console.error(`Could not JSON parse ${filename}! Is it corrupt?`, e)}

    if(!tokenFromEnv() && (!loadedConfig.token || loadedConfig.token === "token goes here"))
        return console.error("You forgot to put your bot token in config.json!");

    const hDevToken = process.env[envVarName("HDevToken")] || loadedConfig.HDevToken;
    if(loadedConfig.HDevTokenAlert && !hDevToken || hDevToken === ""){
        console.error("Looks like you didn't put a HDevToken in config.json!");
        console.error("The /profile command won't work without one. To get a key, see https://discord.gg/B7AarTMZMK");
        console.error("If you don't want to see this notification again, set HDevTokenAlert to false in config.json");
    }

    // backwards compatibility
    loadedConfig.fetchSkinPrices = loadedConfig.showSkinPrices;
    loadedConfig.fetchSkinRarities = loadedConfig.showSkinRarities;

    // to see what these keys do, check here:
    // https://github.com/giorgi-o/SkinPeek/wiki/SkinPeek-Admin-Guide#the-option-list

    applyConfig(loadedConfig, "token", "token goes here");
    applyConfig(loadedConfig, "HDevToken", "");
    applyConfig(loadedConfig, "HDevTokenAlert", true);
    //TODO applyConfig(loadedConfig, "useUnofficialValorantApi", true);
    applyConfig(loadedConfig, "fetchSkinPrices", true);
    applyConfig(loadedConfig, "fetchSkinRarities", true);
    applyConfig(loadedConfig, "localiseText", true);
    applyConfig(loadedConfig, "localiseSkinNames", true);
    applyConfig(loadedConfig, "linkItemImage", true);
    applyConfig(loadedConfig, "videoViewerWithSite", true);
    applyConfig(loadedConfig, "imageViewerWithSite", false);
    applyConfig(loadedConfig, "useEmojisFromServer", "");
    applyConfig(loadedConfig, "refreshSkins", "10 0 0 * * *");
    applyConfig(loadedConfig, "checkGameVersion", "*/15 * * * *");
    applyConfig(loadedConfig, "updateUserAgent", "*/15 * * * *");
    applyConfig(loadedConfig, "delayBetweenAlerts", 5 * 1000);
    applyConfig(loadedConfig, "alertsPerPage", 10);
    applyConfig(loadedConfig, "careerCacheExpiration", 10 * 60 * 1000);
    applyConfig(loadedConfig, "emojiCacheExpiration", 10 * 1000);
    applyConfig(loadedConfig, "loadoutCacheExpiration", 10 * 60 * 1000);
    applyConfig(loadedConfig, "useShopCache", true);
    applyConfig(loadedConfig, "useLoginQueue", false);
    applyConfig(loadedConfig, "loginQueueInterval", 3000);
    applyConfig(loadedConfig, "loginQueuePollRate", 2000);
    applyConfig(loadedConfig, "loginRetryTimeout", 10 * 60 * 1000);
    applyConfig(loadedConfig, "authFailureStrikes", 2);
    applyConfig(loadedConfig, "maxAccountsPerUser", 5);
    applyConfig(loadedConfig, "userDataCacheExpiration", 168);
    applyConfig(loadedConfig, "rateLimitBackoff", 60);
    applyConfig(loadedConfig, "rateLimitCap", 10 * 60);
    applyConfig(loadedConfig, "useMultiqueue", false);
    applyConfig(loadedConfig, "storePasswords", false);
    applyConfig(loadedConfig, "trackStoreStats", true);
    applyConfig(loadedConfig, "statsExpirationDays", 14);
    applyConfig(loadedConfig, "statsPerPage", 8);
    applyConfig(loadedConfig, "shardReadyTimeout", 60 * 1000);
    applyConfig(loadedConfig, "autoDeployCommands", true);
    applyConfig(loadedConfig, "ownerId", "");
    applyConfig(loadedConfig, "ownerName", "");
    applyConfig(loadedConfig, "status", "Up and running!");
    applyConfig(loadedConfig, "notice", "");
    applyConfig(loadedConfig, "onlyShowNoticeOnce", true);
    applyConfig(loadedConfig, "maintenanceMode", false);
    applyConfig(loadedConfig, "githubToken", "");
    applyConfig(loadedConfig, "logToChannel", "");
    applyConfig(loadedConfig, "logFrequency", "*/10 * * * * *");
    applyConfig(loadedConfig, "logUrls", false);

    // write the config (with any missing defaults filled in) back to disk, but only
    // if the file already existed and before applying env overrides, so secrets
    // passed through the environment never end up in config.json
    if(configFileExists) saveConfig(filename, config);

    applyEnvOverrides(config);

    return config;
}

export const saveConfig = (filename="config.json", configToSave) => {
    try {
        fs.writeFileSync(filename, JSON.stringify(configToSave || {...config, ...fileValues}, null, 2));
    } catch(e) {
        // e.g. read-only mount: not fatal, the config is already loaded in memory
        console.error(`Could not save ${filename} (is it read-only?), continuing anyway:`, e.message);
    }
}

const applyConfig = (loadedConfig, name, defaultValue) => {
    if(loadedConfig[name] === undefined) config[name] = defaultValue;
    else config[name] = loadedConfig[name];
}

const applyEnvOverrides = (config) => {
    fileValues = {};

    const token = tokenFromEnv();
    if(token) {
        fileValues.token = config.token;
        config.token = token;
    }

    for(const name of Object.keys(config)) {
        const value = process.env[envVarName(name)];
        if(value === undefined) continue;

        // parse the string based on the type of the existing/default value
        let parsed;
        if(typeof config[name] === "boolean") parsed = ["true", "1", "yes"].includes(value.trim().toLowerCase());
        else if(typeof config[name] === "number") {
            parsed = Number(value);
            if(Number.isNaN(parsed)) {
                console.error(`Ignoring ${envVarName(name)}: "${value}" is not a number`);
                continue;
            }
        }
        else parsed = value;

        fileValues[name] = config[name];
        config[name] = parsed;
    }
}
