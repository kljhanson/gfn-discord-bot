const { saveEvent, getExpiredEvents, getEventById, getActiveEvents } = require('../../models/event-model')
const { getEventsChannel } = require('./event-channels')
const { getConfiguration } = require('../../models/configuration-model')
const logger = require('../../lib/logger')
const { getBotUser } = require('../../lib/global-vars')
const { sendReply } = require('../../lib/discord-utils')
const { getEventEmbed, sendEventEmbed } = require('./event-ui')
const { getEventGames } = require('../../models/event-types-model')

async function refreshEventsChannel(originalMessage) {
    sendReply(originalMessage, `Refreshing events channel...`)
    getConfiguration(originalMessage.guild.id).then(async config => {
        logger.debug(config)
        logger.debug(config.eventChannels)
        if(config.eventChannels && config.eventChannels.length > 0) {
            config.eventChannels.forEach(async eventChannel => {
                await purgeMessageFromEventChannel(originalMessage.guild, config, eventChannel.game)
            })
        }
        await purgeMessageFromEventChannel(originalMessage.guild, config, null, null)
        
        let cleanupWindow = 12
        if(config.eventCleanupWindow && config.eventCleanupWindow > 0) {
            cleanupWindow = config.eventCleanupWindow
        }
        await getExpiredEvents(originalMessage.guild.id).then(events => {
            logger.info(`Found ${events.length} expired events`)
            events.forEach(event => {
                logger.info(`Event to cleanup: ${event.id} ${event.name} ${event.eventDate}`)
                cleanupEvent(event, originalMessage.guild, config)
            })
        })

        if(config.eventChannels && config.eventChannels.length > 0) {
            let doneGames = []
            await config.eventChannels.forEach(async eventChannel => {
                doneGames.push(eventChannel.game)
                logger.debug("done with games")
                logger.debug(doneGames)
                await refreshActiveEvents(originalMessage.guild, config, eventChannel.game)
            })
            let games = [null]
            let eventGames = await getEventGames()
            eventGames.forEach(eventGame => {
                logger.debug("donegames")
                logger.debug(doneGames)
                if(!doneGames.includes(eventGame.name)) {
                    games.push(eventGame.name)
                }
            })
            await refreshActiveEvents(originalMessage.guild, config, null, games)
        }
        else {
            await refreshActiveEvents(originalMessage.guild, config, null, null)
        }
        
        sendReply(originalMessage, `Refresh complete.`)
    })
}

async function purgeMessageFromEventChannel(guild, config, game) {
    const eventsChannel = getEventsChannel(guild, config, game)
    await eventsChannel.messages.fetch().then(async messages => {
        messages.forEach(async message => {
            if(message.author.id == getBotUser().id && message.embeds && message.embeds.length > 0) {
                await message.delete()
            }
        })
    })
}

async function refreshActiveEvents(guild, config, game, games) {
    logger.debug(`refreshing active events for game: ${game}, games: ${games}`)
    const eventsChannel = getEventsChannel(guild, config, game)
    await getActiveEvents(guild.id, game, games).then(async events => {
        logger.info(`Found ${events.length} active events`)
        await eventsChannel.setPosition(0)
        let eventChannelPos = 1
        for(const event of events) {
            await sendEventEmbed(eventsChannel, await getEventEmbed(event, guild))
            await updateEventChannel(event, eventsChannel, guild, eventChannelPos++)
        }
    })
}

function cleanupExpiredEvents(client) {
    client.guilds.cache.forEach(guild => {
        getConfiguration(guild.id).then(config => {
            let cleanupWindow = 12
            if(config.eventCleanupWindow && config.eventCleanupWindow > 0) {
                cleanupWindow = config.eventCleanupWindow
            }
            getExpiredEvents(guild.id, cleanupWindow).then(events => {
                logger.info(`Found ${events.length} expired events`)
                events.forEach(event => {
                    logger.info(`Event to cleanup: ${event.id} ${event.name} ${event.eventDate}`)
                    cleanupEvent(event, guild, config)
                })
            })
        })
    })
}

function deleteEvent(message, eventId) {
    getEventById(message.guild.id, eventId).then(event => {
        getConfiguration(message.guild.id).then(config => {
            if(message.author.username === event.creator 
                || message.member.hasPermission("ADMINISTRATOR")) {
                cleanupEvent(event, message.guild, config, 'Deleted')
                sendReply(message, `Deleted event: ${event.getMiniTitle()}`)
            }
            else {
                sendReply(message, `You must have created the event or have administrator privilages to delete event: ${event.getMiniTitle()}, created by: ${event.creator}`)
            }
        })
    })
}

function cleanupEvent(event, guild, config, cleanupReason) {
    const eventsChannel = getEventsChannel(guild, config, event.game)
    eventsChannel.messages.fetch().then(messages => {
        messages.forEach(message => {
            if(message.author.id == getBotUser().id && message.embeds && message.embeds.length > 0) {
                const eventField = message.embeds[0].fields.filter(field => field.name === "Event ID")[0]
                if(eventField.value == event.id) {
                    logger.info('found matching event message: '+message)
                    message.delete()
                }
            }
        })
    })

    const textChannel = guild.channels.cache.find(channel => channel.name.startsWith(`id-${event.id}`))
    logger.debug("event channel:")
    logger.debug(textChannel)
    if(textChannel) {
        textChannel.delete()
    }

    event.status = "Expired"
    if(cleanupReason) {
        event.status = cleanupReason
    }
    saveEvent(event)
}

async function updateEventChannel(event, eventsChannel, guild, position) {
    logger.info(`updating event channel for event: ${event.getMiniTitle()}`)
    const textChannel = guild.channels.cache.find(channel => channel.name.startsWith(`id-${event.id}`))
    if(textChannel) {
        await textChannel.setName(event.getChannelName())
        await textChannel.setTopic(`Event ${event.getMiniTitle()}\nDescription: ${event.description}`)
        if(position > 0) {
            logger.info(`setting position for channel '${textChannel.name}' to ${position}`)
            await textChannel.setPosition(position)
        }
    }
}

async function updateEventEmbed(message, event) {
    const config = await getConfiguration(message.guild.id)
    const eventsChannel = getEventsChannel(message.guild, config, event.game)
    const messages = await eventsChannel.messages.fetch()
    messages.forEach(async message => {
        if(message.author.id == getBotUser().id && message.embeds && message.embeds.length > 0) {
            const eventField = message.embeds[0].fields.filter(field => field.name === "Event ID")[0]
            if(eventField.value == event.id) {
                logger.info('found matching event message: '+message)
                const embed = await getEventEmbed(event, message.guild)
                message.edit({ embeds: [embed] })
            }
        }
    })
}

module.exports = {
    cleanupExpiredEvents: cleanupExpiredEvents,
    cleanupEvent: cleanupEvent,
    updateEventChannel: updateEventChannel,
    refreshEventsChannel: refreshEventsChannel,
    updateEventEmbed: updateEventEmbed
}