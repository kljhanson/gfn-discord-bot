const Discord = require('discord.js')
const { toISOString, addMinutesToDate, getCurrentUTCDate } = require("../date-utils");
const logger = require('../logger');
const { toJson } = require('../utils');

async function createScheduledEvent(guild, event) {
    logger.debug(event.eventDate)
    logger.debug(event.name)
    const scDetails = {
        name: event.getMiniTitle(),
        scheduledStartTime: toISOString(getCurrentUTCDate(event.eventDate)),
        scheduledEndTime: toISOString(addMinutesToDate(getCurrentUTCDate(event.eventDate), 180)),
        privacyLevel: Discord.GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType: Discord.GuildScheduledEventEntityType.External,
        description: event.description,
        entityMetadata: {
            location: event.getChannelName()
        }
    }
    logger.debug(`creating scheduled event with details: ${toJson(scDetails)}`)
    await guild.scheduledEvents.create(scDetails)
}

async function getMatchingScheduledEvent(guild, event) {
    const scheduledEvents = await guild.scheduledEvents.fetch()
    scheduledEvents.forEach(sc => {
        const scEventId = getEventIdFromScheduledEventName(sc)
        if(scEventId == event.id) {
            return sc
        }
    })
    return null
}

function getEventIdFromScheduledEventName(scheduledEvent) {
    let eventId = -1
    if(scheduledEvent.entityMetadata.startsWith('id-')) {
        const re = new RegExp(`^id-(\\d+)-.+`, "g");
        let matches = re.exec(scheduledEvent.entityMetadata)
        logger.debug(`matches: ${matches}`)
        eventId = matches[1]
        logger.debug(`matched eventId: ${eventId}`)
    }
    return eventId
}

module.exports = {
    createScheduledEvent: createScheduledEvent
}