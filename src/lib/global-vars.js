var botUser;
const VERSION = `2.2.5`

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