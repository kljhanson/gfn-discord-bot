const Discord = require('discord.js')
const { getConfiguration } = require("../../models/configuration-model")
const { getEventById, getActiveEvents } = require("../../models/event-model")
const { getEventGames } = require("../../models/event-types-model")
const { getBotUser } = require("../global-vars")
const logger = require("../logger")
const { toJson } = require('../utils')
const { getEventEmbed, sendEventEmbed} = require('../../lib/events/event-ui')
const { getEventIdFromChannel } = require('./event-utils')


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

async function createEventChannel(interaction, eventChannel, event, user) {
    const parentChannel = eventChannel.parent

    let permissions = getChannelPermissionOverwrites(interaction, event, parentChannel)
    let position = await getChannelPosition(event, parentChannel)
    
    let channelDetails = {
        name: event.getChannelName(),
        type: Discord.ChannelType.GuildText,
        topic: `Event ${event.getMiniTitle()}\nDescription: ${event.description}`,
        permissionOverwrites: permissions 
    }
    if(position > 0) {
        logger.info(`setting position override to ${position}`)
        channelDetails.position = position
    }
    logger.debug(`creating event channel with details:`)
    logger.debug(toJson(channelDetails))

    logger.debug("checking function types")
    logger.debug(typeof getEventEmbed)
    logger.debug(typeof sendEventEmbed)
    return await parentChannel.children.create(channelDetails)
}

function getChannelPermissionOverwrites(interaction, event, parentChannel) {
    const botUser = getBotUser()
    let permissions = [
        {
            id: botUser.id,
            allow: [
                Discord.PermissionFlagsBits.ViewChannel, 
                Discord.PermissionFlagsBits.SendMessages,
                Discord.PermissionFlagsBits.ManageMessages,
                Discord.PermissionFlagsBits.ManageChannels,
                Discord.PermissionFlagsBits.ReadMessageHistory
            ]
        },
        {
            id: interaction.guild.id,
            deny: [Discord.PermissionFlagsBits.ViewChannel]
        }
    ]
    event.members.forEach(async joinMember => {
        logger.info(joinMember)
        const joinUser = interaction.guild.members.cache.find(member => member.user.username === joinMember)
        permissions.push({
            id: joinUser.id,
            allow: [Discord.PermissionFlagsBits.ViewChannel]
        })
    })
    logger.debug(parentChannel.permissionOverwrites.cache.values())
    parentChannel.permissionOverwrites.cache.forEach((key, perm) => {
        if(perm && perm.id) {
            permissions.push({
                id: perm.id,
                allow: perm.allow,
                deny: perm.deny,
                type: perm.type
            })
        }
    })
    logger.debug(`perms: ${toJson(permissions)}`)
    return permissions
}

async function getChannelPosition(event, parentChannel) {
    let position = -1
    let channels = parentChannel.children.cache.values()
    logger.debug(`channels`)
    logger.debug(channels)
    for(const channel of channels) {
        const eventId = getEventIdFromChannel(channel.name)
        if(position < 0 && eventId > -1) {
            let otherEvent = await getEventById(channel.guild.id, eventId)
            if(!otherEvent) {
                logger.debug(`found bad event ${eventId}`)
                continue
            }
            logger.debug(`compare ${event.eventDate} to ${otherEvent.eventDate}`)
            if(otherEvent.eventDate > event.eventDate) {
                logger.info(`found later event: ${otherEvent.getMiniTitle()}`)
                position = channel.position
            }
        }
    }
    return position
}

async function updateEventsChannel(interaction, game) {
    logger.debug("checking function types")
    logger.debug(typeof getEventEmbed)
    logger.debug(typeof sendEventEmbed)
    const config = await getConfiguration(interaction.guild.id)
    const eventsChannel = getEventsChannel(interaction.guild, config, game)
    let activeGame
    let activeGames
    let hasEventChannel = false
    let gameChannels = []
    config.eventChannels.forEach(eventChannel => {
        gameChannels.push(eventChannel.game)
        if(eventChannel.game == game) {
            hasEventChannel = true
        }
    })
    if(hasEventChannel) {
        activeGame = game
    } else {
        activeGames = [null]
        let eventGames = await getEventGames()
        eventGames.forEach(eventGame => {
            if(!gameChannels.includes(eventGame.name)) {
                activeGames.push(eventGame.name)
            }
        })
    }
    
    const events = await getActiveEvents(interaction.guild.id, activeGame, activeGames)
    logger.info(`found ${events.length} events`)
    const messages = await eventsChannel.messages.fetch()
    const msgArray = [...messages.sort((msg1, msg2) => msg2.createdAt < msg1.createdAt).values()].reverse()
    logger.info(`found ${msgArray.length} messages`)

    for(var i = 0; i < msgArray.length; i++) {
        const event = events[i]
        const message = msgArray[i]
        if(event) {
            logger.info(`edit message: ${message.id} with event: ${event.id}`)
            const embed = await getEventEmbed(event, interaction.guild)
            message.edit({embeds: [embed]})
        }
        else {
            message.delete()
        }
    }
    if(events.length > msgArray.length) {
        const diff = events.length - msgArray.length
        for(var n = msgArray.length; n < events.length; n++) {
            const event = events[n]
            logger.info(`send new message for event: ${event.id}`)
            sendEventEmbed(eventsChannel, await getEventEmbed(event, interaction.guild))
        }
    }
    reorderEventChannels(interaction.guild)
}

async function reorderEventChannels(guild) {
    const config = await getConfiguration(guild.id)
    if(config.eventChannels && config.eventChannels.length > 0) {
        let doneGames = []
        config.eventChannels.forEach(async eventChannel => {
            await reorderEventChannelForGame(guild, config, eventChannel.game)
            doneGames.push(eventChannel.game)
        })
        let games = [null]
        let eventGames = await getEventGames()
        eventGames.forEach(eventGame => {
            if(!doneGames.includes(eventGame.name)) {
                games.push(eventGame.name)
            }
        })
        await reorderEventChannelForGame(guild, config, null, games)
    }
    else {
        await reorderEventChannelForGame(guild, config, null, null)
    }
}

async function reorderEventChannelForGame(guild, config, game, games) {
    const eventsChannel = getEventsChannel(guild, config, game)
    const events = await getActiveEvents(guild.id, game, games)
    logger.info(`Found ${events.length} active events`)
    await eventsChannel.setPosition(0)
    let eventChannelPos = 1
    for(const event of events) {
        await updateEventChannel(event, eventsChannel, guild, eventChannelPos++)
    }
}

function updateChannelPermissions(message, event, user, isJoined = false) {
    const channelName = event.getChannelName()
    const eventChannel = message.guild.channels.cache.filter(channel => channel.name == channelName).first()
    if(eventChannel) {
        eventChannel.permissionOverwrites.edit(user.id, {
            ViewChannel: isJoined ? true : null
        })
    }
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

async function updateEventEmbed(guild, event) {
    const config = await getConfiguration(guild.id)
    const eventsChannel = getEventsChannel(guild, config, event.game)
    const messages = await eventsChannel.messages.fetch()
    messages.forEach(async message => {
        if(message.author.id == getBotUser().id && message.embeds && message.embeds.length > 0) {
            const eventField = message.embeds[0].fields.filter(field => field.name === "Event ID")[0]
            if(eventField.value == event.id) {
                logger.info('found matching event message: '+message)
                const embed = await getEventEmbed(event, guild)
                message.edit({ embeds: [embed] })
            }
        }
    })
}

module.exports = {
    getEventsChannel: getEventsChannel,
    createEventChannel: createEventChannel,
    updateEventsChannel: updateEventsChannel,
    updateEventChannel: updateEventChannel,
    reorderEventChannels: reorderEventChannels,
    reorderEventChannelForGame: reorderEventChannelForGame,
    updateChannelPermissions: updateChannelPermissions,
    updateEventEmbed: updateEventEmbed
}