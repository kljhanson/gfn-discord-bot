var botUser;
const VERSION = `3.0.0`

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