const logger = require("../logger");

function getEventIdFromChannel(channelName) {
    let eventId = -1
    if(channelName.startsWith('id-')) {
        const re = new RegExp(`^id-(\\d+)-.+`, "g");
        let matches = re.exec(channelName)
        logger.debug(`matches: ${matches}`)
        eventId = matches[1]
        logger.debug(`matched eventId: ${eventId}`)
    }
    return eventId
}

module.exports = {
    getEventIdFromChannel: getEventIdFromChannel
}