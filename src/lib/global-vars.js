var botUser;
const VERSION = require("../../version.json").version

function setBotUser(user) {
    botUser = user;
}

function getBotUser() {
    return botUser;
}

function getVersion() {
    return VERSION;
}

module.exports = {
    setBotUser: setBotUser,
    getBotUser: getBotUser,
    getVersion: getVersion
}