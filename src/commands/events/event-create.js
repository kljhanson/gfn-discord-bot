const Discord = require('discord.js')
const { parseDateString } = require('../../lib/date-utils')
const { createEvent, saveEvent, getActiveEvents, getEventById } = require('../../models/event-model')
const { getEventGames, getEventTypes, getEventTypesByGame, getEventTypeById, getEventTypeByEmote } = require('../../models/event-types-model')
const { sendMessage, sendReply } = require('../../lib/discord-utils')
const { isNumeric } = require('../../lib/utils')
const { getEventEmbed } = require('./event-ui')
const { updateEventChannel, reorderEventChannels } = require('./event-cleanup')
const { getEventsChannel, sendEventEmbed, handleCancel } = require('./event-utils')
const { getConfiguration, getGameEventChannel } = require('../../models/configuration-model')
const { getBotUser } = require('../../lib/global-vars')
const logger = require('../../lib/logger')

function startCreateNewEvent(msg, type) {
    sendCreateEventGame(msg, type)
}

async function sendCreateEventGame(originalMessage, type) {
    if(type) {
        logger.debug(type)
        sendCreateEventSubtype(originalMessage, null, type)
        return
    }
    const embed = eventCreateEmbed(0, "Create new event",
        "Welcome to the event creation program. Please select a game using your keyboard or by selecting from the emote options below ")
    embed.addField('Games', await getEventGameTypeDescriptions())
    
    let gameTypes = await getEventGames()
    const botMessage = await originalMessage.channel.send(embed)
    addGameReactions(botMessage)
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        collector.stop()
        if(!handleCancel(message, botMessage)) {
            if (message.content.trim().toLowerCase() == "none") {
                sendCreateEventSubtype(originalMessage, botMessage, "Other")
            } else {
                sendCreateEventSubtype(originalMessage, botMessage, message.content)
            }
            message.delete()
        }
    })

    let eventEmotes = await getEventGameEmotes()
    const filter = (reaction, user) => {
        return eventEmotes.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name

        if (eventEmotes.includes(emote)) {
            collector.stop()
            const gameType = getEventGameFromEmote(gameTypes, emote)
            sendCreateEventType(originalMessage, botMessage, gameType.name, null)
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateEventType(originalMessage, prevBotMessage, game, type) {
    let selectedGame = game
    if(!selectedGame) {
        selectedGame = "Destiny 2"
    }
    if(type) {
        logger.debug(type)
        sendCreateEventSubtype(originalMessage, null, type)
        return
    }
    const embed = eventCreateEmbed(1, `Create new ${selectedGame} event`,
        "Please select an event type using your keyboard or by selecting from the emote options below ")
    embed.addField('Event Types', await getEventEmoteDescriptions(selectedGame))
    
    let eventTypes = await getEventTypesByGame(selectedGame)
    let sendFunction
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send(embed)
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    addTypeReactions(botMessage, selectedGame)
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        collector.stop()
        if(!handleCancel(message, botMessage)) {
            if (message.content.trim().toLowerCase() == "none") {
                sendCreateEventSubtype(originalMessage, botMessage, "Other")
            } else {
                sendCreateEventSubtype(originalMessage, botMessage, message.content)
            }
            message.delete()
        }
    })

    let eventEmotes = await getEventEmotes(selectedGame)
    const filter = (reaction, user) => {
        return eventEmotes.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name

        if (eventEmotes.includes(emote)) {
            collector.stop()
            const eventType = getEventTypeFromEmote(eventTypes, emote)
            logger.info("eventTypeByEmote: "+eventType)
            logger.info("emote: "+emote)
            logger.info("id: "+eventType.id)
            logger.info("name: "+eventType.name)
            sendCreateEventSubtype(originalMessage, botMessage, eventType.id)
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateEventSubtype(originalMessage, prevBotMessage, type) {
    let eventType = await getEventTypeById(type)
    logger.info("sendCreateEventSubtype")
    logger.info("type: "+type)
    logger.info(eventType)
    let embed
    if(!eventType) {
        // embed = eventCreateEmbed(`Create new ${type} event`, `Give your event a name: `)
        sendCreateEventName(originalMessage, prevBotMessage, type, null)
        return
    } else {
        if(eventType.options && eventType.options.length > 0) {
            embed = eventCreateEmbed(1.5, `Create new ${eventType.name} event`, `Select an option for your ${eventType.name} event:`)
            embed.addField('Options', getOptionDescriptions(eventType))
        }
        else {
            sendCreateEventName(originalMessage, prevBotMessage, type, null)
            return
        }
    }
    let sendFunction
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send(embed)
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    if(eventType && eventType.options && eventType.options.length > 0) {
        addOptionReactions(botMessage, eventType)
    }

    if(eventType) {
        const filter = (reaction, user) => {
            return getEventOptionEmotes(eventType).includes(reaction.emoji.name) && user.id === originalMessage.author.id;
        };

        botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();
            const emote = reaction.emoji.name
    
            if (getEventOptionEmotes(eventType).includes(emote)) {
                // collector.stop()
                const optionName = getEventOptionFromEmote(eventType, emote)
                sendCreateEventName(originalMessage, botMessage, type, optionName)
            } 
        })
        .catch(collected => {
            logger.warn('no reaction detected');
            logger.warn(collected)
        });
    }
}

async function sendCreateEventName(originalMessage, prevBotMessage, type, subtype) {
    let eventType = await getEventTypeById(type)
    let eventName = buildEventName(type, subtype)
    let embed
    if(!eventType) {
        // embed = eventCreateEmbed(`Create new ${type} event`, `Give your event a name: `)
        sendCreateEventDescription(originalMessage, prevBotMessage, type, subtype, type)
        return
    } else {
        embed = eventCreateEmbed(2, `Create new ${eventName} event`, `Give your event a short name (a few words or less than 32 characters), or type \`none\` to skip:`)
    }
    let sendFunction
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send(embed)
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if(message.content && message.content.length > 32) {
            sendReply(originalMessage, `That name is pretty wordy, shorten it to less than 32 characters please. You will have the opportunity to elaborate in the description.`)
        } else {
            collector.stop()
            if(!handleCancel(message, botMessage)) {
                if (message.content.trim().toLowerCase() == "none") {
                    let name = subtype
                    if(!subtype) {
                        name = type
                    }
                    sendCreateEventDescription(originalMessage, botMessage, type, subtype, name)
                } else {
                    sendCreateEventDescription(originalMessage, botMessage, type, subtype, message.content)
                }
                message.delete()
            }
        }
    })
}

async function sendCreateEventDescription(originalMessage, prevBotMessage, type, subtype, name) {
    let eventName = buildEventName(type, subtype, name)
    const embed = eventCreateEmbed(3, `Creating new event "${eventName}"`, 
        "Give your event a kick-ass description. Make it cool enough that people will want to join, but not too edgy otherwise you might get shunned.")
    let sendFunction
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send(embed)
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        collector.stop()
        if(!handleCancel(message, botMessage)) {
            logger.debug(`description ${message.content}`)
            if (message.content.trim().toLowerCase() == "none") {
                sendCreateEventMaxMembers(originalMessage, botMessage, type, subtype, name, "n/a")
            } else {
                sendCreateEventMaxMembers(originalMessage, botMessage, type, subtype, name, message.content)
            }
            message.delete()
        }
    })
}

async function sendCreateEventMaxMembers(originalMessage, prevBotMessage, type, subtype, name, description) {
    const eventType = await getEventTypeById(type)
    let eventName = buildEventName(type, subtype, name)
    logger.debug(`max members call`)
    if(eventType) {
        logger.debug(`eventType: ${eventType}`)
        const option = getEventOption(eventType, subtype)
        let max = -1
        if(option && option.defaultMax > 0) {
            max = option.defaultMax 
        }
        else if(eventType.defaultMax > 0) {
            max = eventType.defaultMax 
        }
        if(max > 0) {
            sendCreateEventDate(originalMessage, prevBotMessage, type, subtype, name, description, max)
            return
        }
    }
    const embed = eventCreateEmbed(4, `Creating new event "${eventName}"`, "Now let me know how many people you need in this shindig:")
    
    const botMessage = await prevBotMessage.edit(embed)
    collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if(!handleCancel(message, botMessage)) {
            let maxMembers = 0
            let maxInput
            let joinedMembers = []
            if(message.mentions.users.array().length > 0) {
                message.mentions.users.array().forEach(user => {
                    joinedMembers.push(user.username)
                })
            }
            logger.info(`joined members from mentions:`)
            logger.info(joinedMembers)
            const splitVals = message.content.split(" ")
            if(splitVals && splitVals.length > 0 && isNumeric(splitVals[0])) {
                maxInput = splitVals[0]
            } 
            else if(splitVals && splitVals.length > 0 && isNumeric(splitVals[splitVals.length-1])) {
                maxInput = splitVals[splitVals.length-1]
            }
            if(maxInput) {
                logger.info('parsing max input:')
                logger.info(maxInput)
                maxMembers = parseInt(maxInput)
            }
            if(message.mentions.users.array().length+1 > maxMembers) {
                maxMembers = message.mentions.users.array().length+1
            }
            if(maxMembers <= 0 || maxMembers > 100) {
                sendReply(message, `Invalid max member count. Should be an integer number between 1 and 100.`)
            }
            else {
                collector.stop()
                message.delete()
                sendCreateEventDate(originalMessage, botMessage, type, subtype, name, description, maxMembers, joinedMembers)
            }
        }
    })
}

async function sendCreateEventDate(originalMessage, prevBotMessage, type, subtype, name, description, maxMembers, members) {
    let eventName = buildEventName(type, subtype, name)
    let eventType = await getEventTypeById(type)
    let eventGame = eventType.game
    logger.debug("eventgame?")
    logger.debug(eventGame)
    logger.debug(eventType.name)
    logger.debug(eventType.id)
    logger.debug(eventType)
    const embed = eventCreateEmbed(5, `Creating new event "${eventName}"`, `When is this party starting?`)
    embed.addField("Date format instructions:", `You can use explicit formatting (e.g. **01-01-2020 8:00pm CDT**) or casual (**Friday 8pm CT**).
    Use US-style formatting for dates (MM/dd/yyyy or MM-dd-yyyy). Timezones support CT, ET, PT or MT (and their DST equivalents)`)
    const botMessage = await prevBotMessage.edit(embed)
    collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if (!handleCancel(message, botMessage)) {
            const startDate = parseDateString(message.content)
            if (!startDate) {
                sendReply(message, "hmm, that didn't work, try to keep the date format simple and try again")
            } else {
                collector.stop()
                message.delete()
                botMessage.delete()
                getConfiguration(originalMessage.guild.id).then(config => {
                    logger.debug("creating event, getting events channel")
                    logger.debug("eventType: "+eventType)
                    logger.debug("eventGame: "+eventGame)
                    const eventChannel = getEventsChannel(originalMessage.guild, config, eventGame)
                    createEvent(name, description, eventType.game, type, subtype, startDate, maxMembers,
                        originalMessage.author.username, originalMessage.guild.id, "idk", members, config).then(newEvent => {
                            logger.info("created new event...")
                            logger.info(newEvent)
                            createEventChannel(originalMessage, eventChannel, newEvent, originalMessage.author).then(async channel => {
                                newEvent.eventChannelId = channel.id
                                saveEvent(newEvent)
                                sendEventEmbed(eventChannel, await getEventEmbed(newEvent, originalMessage.guild)).then(async embedMsg => {
                                    sendReply(originalMessage, `Created new event: **${newEvent.getMiniTitle()}**\n**View events**: <#${eventChannel.id}>\n**View event channel**: <#${channel.id}>`)
                                    updateEventsChannel(originalMessage, eventType.game)
                                    if(members && members.length > 0) {
                                        let mentions = [];
                                        await members.forEach(async member => {
                                            await channel.guild.members.fetch()
                                            const memberUser = channel.guild.members.cache.filter(guildMember => guildMember.user.username === member).first()
                                            if(memberUser) {
                                                mentions.push(`<@${memberUser.id}>`)
                                            }
                                        })
                                        channel.send(`${mentions.join(", ")} you were added by ${originalMessage.author} to the event **${newEvent.getMiniTitle()}**`)
                                    }
                                })
                            })
                        })
                })
            }
        }
    })
}

function collectMessageReplies(originalMessage, botMessage, onReply) {
    const collector = new Discord.MessageCollector(originalMessage.channel, m => m.author.id === originalMessage.author.id, { time: 120000 });
    collector.on('collect', message => {
        onReply(message, collector)
    })
    collector.on('end', (collected, reason) => {
        eventCreateTimeout(collected, reason, botMessage, collector, originalMessage)
    });
    return collector
}

function eventCreateTimeout(collected, reason, botMessage, collector, originalMessage) {
    if(reason === 'time') {
        botMessage.delete()
        collector.stop()
        sendReply(originalMessage, `No reply given in the required time (120 seconds). Please try your command over from the start.`)
    }
}

function eventCreateEmbed(stepNum, title, description, color) {
    let stepOneStatus = '➡️'
    let stepTwoStatus = ''
    let stepThreeStatus = ''
    let stepFourStatus = ''
    let stepFiveStatus = ''
    if(stepNum > 1) {
        stepOneStatus = '✔️'
        stepTwoStatus = '➡️'
        if(stepNum == 1.5) {
            stepOneStatus = '🔁 Sub-'
            stepTwoStatus = ''
        }
    }
    if(stepNum > 2) {
        stepTwoStatus = '✔️'
        stepThreeStatus = '➡️'
    }
    if(stepNum > 3) {
        stepThreeStatus = '✔️'
        stepFourStatus = '➡️'
    }
    if(stepNum > 4) {
        stepFourStatus = '✔️'
        stepFiveStatus = '➡️'
    }
    if(!color) {
        color = 0x03a9f4
    }
    return new Discord.MessageEmbed()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter(`Step ${stepNum} of 5 • ${stepOneStatus}Type / ${stepTwoStatus}Name / ${stepThreeStatus}Description / ${stepFourStatus}Members / ${stepFiveStatus}Time`)
}

async function getEventGameTypeDescriptions() {
    let types = []
    let eventGames = await getEventGames()
    eventGames.forEach(eventGame => {
        types.push(`${eventGame.emote} = ${eventGame.name}`)
    })
    return types.join('\n')
}

async function getEventEmoteDescriptions(game) {
    let types = []
    let eventTypes = await getEventTypesByGame(game)
    eventTypes.forEach(eventType => {
        types.push(`${eventType.emote} = ${eventType.name}`)
    })
    return types.join('\n')
}

async function getEventGameEmotes() {
    let types = []
    let eventGames = await getEventGames()
    eventGames.forEach(eventGame => {
        types.push(`${eventGame.emote}`)
    })
    return types
}

async function getEventEmotes(game) {
    let types = []
    let eventTypes = await getEventTypesByGame(game)
    eventTypes.forEach(eventType => {
        types.push(`${eventType.emote}`)
    })
    return types
}

async function addGameReactions(message) {
    let eventGames = await getEventGames()
    eventGames.forEach(eventGame => {
        message.react(eventGame.emote)
    })
}

async function addTypeReactions(message, game) {
    let eventTypes = await getEventTypesByGame(game)
    eventTypes.forEach(eventType => {
        message.react(eventType.emote)
    })
}


function getEventGameFromEmote(eventGames, emote) {
    let returnType
    eventGames.forEach(eventGame => {
        if(eventGame.emote === emote) {
            returnType = eventGame
        }
    })
    return returnType
}

function getEventTypeFromEmote(eventTypes, emote) {
    let returnType
    eventTypes.forEach(eventType => {
        if(eventType.emote === emote) {
            returnType = eventType
        }
    })
    return returnType
}

function getEventOption(eventType, optionName) {
    let retVal = {}
    if(eventType.options) {
        eventType.options.forEach(option => {
            if(option.name === optionName) {
                retVal = option
            }
        })
    }
    return retVal
}

function addOptionReactions(message, eventType) {
    eventType.options.forEach(option => {
        message.react(option.emote)
    })
}

function getEventOptionEmotes(eventType) {
    let emotes = []
    if(eventType && eventType.options) {
        eventType.options.forEach(option => {
            emotes.push(option.emote)
        })
    }
    return emotes
}

function getEventOptionFromEmote(eventType, emote) {
    let optionName = "unknown"
    eventType.options.forEach(option => {
        if(option.emote === emote) {
            optionName = option.name
        }
    })
    return optionName
}

function buildEventName(type, subtype, name) {
    if(name) {
        return name
    } else if (subtype) {
        return subtype
    }
    return type
}

function getOptionDescriptions(eventType) {
    if(eventType && eventType.options) {
        let options = []
        eventType.options.forEach(option => {
            options.push(`${option.emote} = ${option.name}`)
        })
        return options.join('\n')
    }
    return "No options"
}

async function createEventChannel(originalMessage, eventChannel, event, user) {
    const channelName = event.getChannelName()
    const miniTitle = event.getMiniTitle()
    const parentChannel = eventChannel.parent

    const everyoneRole = originalMessage.guild.roles.cache.filter(role => role.name == '@everyone').first();
    const botUser = getBotUser()

    let permissions = [
        {
            id: botUser.id,
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_CHANNELS', 'READ_MESSAGE_HISTORY']
        },
        {
            id: everyoneRole.id,
            deny: ['VIEW_CHANNEL']
        }
    ]
    event.members.forEach(async joinMember => {
        logger.info(joinMember)
        const joinUser = originalMessage.guild.members.cache.filter(member => member.user.username === joinMember).first()
        permissions.push({
            id: joinUser.id,
            allow: ['VIEW_CHANNEL']
        })
    })
    parentChannel.permissionOverwrites.array().forEach(perm => {
        permissions.push({
            id: perm.id,
            allow: perm.allow,
            deny: perm.deny,
            type: perm.type
        })
    })
    let position = -1;
    let channels = await parentChannel.children.array()
    logger.debug(`channels`)
    logger.debug(channels)
    for(const channel of channels) {
        if(position < 0 && channel.name.startsWith('id-')) {
            const re = new RegExp(`^id-(\\d+)-.+`, "g");
            let matches = re.exec(channel.name)
            logger.debug(`matches: ${matches}`)
            let eventId = matches[1]
            logger.debug(`matched eventId: ${eventId}`)
            let otherEvent = await getEventById(channel.guild.id, eventId)
            logger.debug(`compare ${event.eventDate} to ${otherEvent.eventDate}`)
            if(otherEvent.eventDate > event.eventDate) {
                logger.info(`found later event: ${otherEvent.getMiniTitle()}`)
                position = channel.position
            }
        }
    }
    let channelDetails = {
        type: "text",
        parent: parentChannel,
        topic: `Event ${miniTitle}\nDescription: ${event.description}`,
        permissionOverwrites: permissions 
    }
    if(position > 0) {
        logger.info(`setting position override to ${position}`)
        channelDetails.position = position
    }
    logger.debug(`creating event channel with details:`)
    logger.debug(channelDetails)
    return await originalMessage.guild.channels.create(channelName, channelDetails)
}

function updateEventsChannel(originalMessage, game) {
    getConfiguration(originalMessage.guild.id).then(async config => {
        const eventsChannel = getEventsChannel(originalMessage.guild, config, game)
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
        
        getActiveEvents(originalMessage.guild.id, activeGame, activeGames).then(events => {
            logger.info(`found ${events.length} events`)
            eventsChannel.messages.fetch().then(async messages => {
                const msgArray = messages.sort((msg1, msg2) => msg2.createdAt < msg1.createdAt).array().reverse()
                logger.debug(msgArray)
                logger.info(`found ${msgArray.length} messages`)
                for(var i = 0; i < msgArray.length; i++) {
                    const event = events[i]
                    const message = msgArray[i]
                    if(event) {
                        logger.info(`edit message: ${message.id} with event: ${event.id}`)
                        message.edit(await getEventEmbed(event, message.guild))
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
                        sendEventEmbed(eventsChannel, await getEventEmbed(event, originalMessage.guild))
                    }
                } 
            })
            reorderEventChannels(originalMessage.guild)
        })
    })
}


module.exports = {
    startCreateNewEvent: startCreateNewEvent
}