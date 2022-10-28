const JoinEmotes = require('../../../assets/event-emotes.json')
const { sendMessage, sendReply } = require('../../lib/discord-utils')
const logger = require('../../lib/logger')

function getEventsChannel(guild, config, game) {
    let channelName = "gfn-events"
    logger.info("get events channel for game: "+game)
    let gameChannels = []
    if(config && game && config.eventChannels) {
        config.eventChannels.forEach(eventChannel => {
            logger.info(eventChannel)
            if(eventChannel.game === game) {
                gameChannels.push(eventChannel)
            }
        })
    }
    logger.debug(gameChannels)
    if(gameChannels.length == 1) {
        logger.info("found channel")
        let channelConfig = gameChannels[0]
        logger.info(channelConfig)
        channelName = channelConfig.eventsChannelName
    }
    else if(config && config.eventsChannelName) {
        channelName = config.eventsChannelName
    }
    return guild.channels.cache.find(channel => channel.name == channelName)
}

function sendEventEmbed(channel, event) {
    return channel.send({embeds: [event]}).then(async eventMessage => {
        await eventMessage.react(JoinEmotes.JOIN)
        await eventMessage.react(JoinEmotes.ALT)
        await eventMessage.react(JoinEmotes.INTERESTED)
        await eventMessage.react(JoinEmotes.LEAVE)
    })
}

function handleCancel(message, botMessage) {
    if (message.content == "stop" || message.content == "cancel") {
        botMessage.delete()
        message.delete()
        sendReply(message, "Canceling event creation")
        return true
    }
    return false
}

module.exports = {
    getEventsChannel: getEventsChannel,
    sendEventEmbed: sendEventEmbed,
    handleCancel: handleCancel
}