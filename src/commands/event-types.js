const logger = require('../lib/logger')
const Discord = require('discord.js')
const { getEventEmbedWithDetails } = require('../lib/events/event-ui')
const { getEventGames, getEventTypes, getEventTypesByGame, getEventTypeById, createEventType, createEventGame, addEventSubType } = require('../models/event-types-model')
const { matchMessage, sendMessage, sendReply, sendImage, getMessageParams, isBlessed, collectMessageReplies, messageCollectorTimeout } = require('../lib/discord-utils')
const { parseDate } = require('chrono-node/dist/locales/en')

function executeEventTypeMessage(msg) {
    if (matchMessage(msg, 'addgame')) {
        if(msg.member.hasPermission("ADMINISTRATOR") || isBlessed(msg.member)) {
            let content = msg.content
            let param = content.substring("gfn/addgame ".length)
            logger.debug(param)
            logger.debug(param)
            if(!param || param.trim().length <= 0) {
                sendReply(msg, "No game name supplied. Please send a game to add to the list in your command. Example: `gfn/addgame New Game Who Dis 2: The Disening`")
            } else {
                sendCreateNewGameMessage(msg, param)
            }
        } else {
            sendReply(msg, `You do not have sufficient privilages to execute this function.`)
        }
    }

    if (matchMessage(msg, 'addtype')) {
        if(msg.member.hasPermission("ADMINISTRATOR") || isBlessed(msg.member)) {
            sendCreateNewTypeMessage(msg)
        } else {
            sendReply(msg, `You do not have sufficient privilages to execute this function.`)
        }
    }

    if (matchMessage(msg, 'addsubtype')) {
        if(msg.member.hasPermission("ADMINISTRATOR") || isBlessed(msg.member)) {
            sendCreateNewSubTypeMessage(msg)
        } else {
            sendReply(msg, `You do not have sufficient privilages to execute this function.`)
        }
    }
}

async function sendCreateNewGameMessage(msg, gameName) {
    let gameId = gameName.replace(/[\W_]+/g, '').toLowerCase()
    let gameAbbr = gameName.match(/\b(\w)/g).join('').toLowerCase()
    const descriptions = await getEventGameTypeDescriptions()
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Game: ${gameName}`)
        .setDescription("React with the emote you want for this game. It must be unique and cannot be one of the following already existing game emotes:")
        .addFields([{name: 'Existing emotes', value: descriptions }])
    let botMessage = await sendMessage(msg, embed)
    const filter = (reaction, user) => {
        return user.id === msg.author.id;
    };

    let eventEmotes = await getEventGameEmotes()
    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const reactEmote = reaction.emoji.name
        if (!eventEmotes.includes(reactEmote)) {
            logger.debug("valid emote reaction: "+reactEmote)
            sendCreateNewGameFinal(msg, botMessage, gameName, reactEmote)
        } else {
            sendReply(msg, "This emote has already been used. Please try again.")
        }
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateNewGameFinal(originalMessage, prevBotMessage, gameName, emote) {
    let gameId = gameName.replace(/[\W_]+/g, '').toLowerCase()
    let gameAbbr = gameName.match(/\b(\w)/g).join('').toLowerCase()
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Game`)
        .setDescription("If the items below look good, react with ✅ to finalize")
        .addFields([
            { name: `Game Name`, value: `${gameName}`, inline: true },
            { name: `Game ID`, value: `${gameId}`, inline: true },
            { name: `Game Shortname`, value: `${gameAbbr}`, inline: true },
            { name: `Emote`, value: `${emote}`, inline: true }
        ])
        
    prevBotMessage.reactions.removeAll()
    prevBotMessage.edit(embed)
    let botMessage = await prevBotMessage.edit(embed)
    botMessage.react('✅')
    botMessage.react('❌')
    const filter = (reaction, user) => {
        return (reaction.emoji.name == '✅' || reaction.emoji.name == '❌') && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const reactEmote = reaction.emoji.name

        if (reactEmote == '✅') {
            createEventGame(gameId, gameName, gameAbbr, emote, null).then(newGameType => {
                botMessage.delete()
                sendReply(originalMessage, "Created new game type "+gameName)
            })
        }
        else if (reactEmote == '❌') {
            sendReply(originalMessage, "Canceling event type creation.")
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateNewTypeMessage(originalMessage) {
    const embed = createNewTypeEmbed(1, "Create new event type",
        "Welcome to the event creation program. Please select a game using your keyboard or by selecting from the emote options below ")
    embed.addFields({name: 'Games', value: await getEventGameTypeDescriptions()})
    
    let gameTypes = await getEventGames()
    const botMessage = await originalMessage.channel.send({ embeds: [embed]})
    addGameReactions(botMessage)
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        collector.stop()
        if(!handleCancel(message, botMessage)) {
            sendCreateNewTypeName(originalMessage, botMessage, message.content)
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
            sendCreateNewTypeName(originalMessage, botMessage, gameType.name)
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}


async function sendCreateNewTypeName(originalMessage, prevBotMessage, game) {
    const embed = createNewTypeEmbed(2, `Create new ${game} event type`,
        `Give your ${game} event type a name`)
    
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send({ embeds: [embed]})
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        collector.stop()
        if(!handleCancel(message, botMessage)) {
            sendCreateNewTypeEmote(originalMessage, botMessage, game, message.content)
            message.delete()
        }
    })
}

async function sendCreateNewTypeEmote(originalMessage, prevBotMessage, game, typeName) {
    const embed = createNewTypeEmbed(3, `Create new event type: ${typeName}`,
        `React to this message with the emote that you want to use for this event type. It must be unique and cannot be one of the following already used emotes for the game ${game}`)
    embed.addFields({name: 'Existing emotes', value: await getEventEmoteDescriptions(game)})
    
    let gameTypes = await getEventTypes(game)
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send({ embeds: [embed]})
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()

    let eventEmotes = await getEventTypeEmotes(game)
    const filter = (reaction, user) => {
        return !eventEmotes.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name
        logger.debug("found emote reaction: "+emote)
        if (!eventEmotes.includes(emote)) {
            logger.debug("valid emote reaction: "+emote)
            sendCreateNewTypeColor(originalMessage, botMessage, game, typeName, emote)
        } else {
            sendReply(originalMessage, "This emote has already been used. Please try again.")
        }
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateNewTypeColor(originalMessage, prevBotMessage, game, typeName, emote) {
    const embed = createNewTypeEmbed(4, `Create new event type: ${typeName}`,
        `Give your ${typeName} event type a color. Use a hex string color, without a hash. Example: f9f9f9`)
    
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send({ embeds: [embed]})
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if(!handleCancel(message, botMessage)) {
            logger.info("hex test: "+message.content)
            logger.info(message.content.length)
            if(isHexColor(message.content)) {
                collector.stop()
                sendCreateNewTypeIcon(originalMessage, botMessage, game, typeName, emote, `#${message.content}`)
                message.delete()
            } else {
                sendReply(message, "That was not a valid hex string. Please use the format `f9f9f9`")
            }
        } else {
            collector.stop()
        }
    })
}

async function sendCreateNewTypeIcon(originalMessage, prevBotMessage, game, typeName, emote, color) {
    const embed = createNewTypeEmbed(5, `Create new event type: ${typeName}`,
        `Give your ${typeName} a sweet icon. Provide a valid URL to use. You may need to upload the image to a different image host before using it.`)
    
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send({ embeds: [embed]})
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if(!handleCancel(message, botMessage)) {
            if(isValidUrl(message.content)) {
                collector.stop()
                sendCreateNewTypeMax(originalMessage, botMessage, game, typeName, emote, color, message.content)
                message.delete()
            } else {
                sendReply(message, "That was not a valid URL string.")
            }
        } else {
            collector.stop()
        }
    })
}

async function sendCreateNewTypeMax(originalMessage, prevBotMessage, game, typeName, emote, color, icon) {
    const embed = createNewTypeEmbed(6, `Create new event type: ${typeName}`,
        `Give your ${typeName} a default max members. If you do not want to have a default max, then enter -1.`)
    
    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send({ embeds: [embed]})
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if(!handleCancel(message, botMessage)) {
            let maxMembers = parseInt(message.content)
            collector.stop()
            sendCreateNewTypeFinal(originalMessage, botMessage, game, typeName, emote, color, icon, maxMembers)
            message.delete()
        } else {
            collector.stop()
        }
    })
}

async function sendCreateNewTypeFinal(originalMessage, prevBotMessage, game, typeName, emote, color, icon, max) {
    let maxString = "None"
    if(max > 0) {
        maxString = max
    }
    let typeId = typeName.replace(/[\W_]+/g, '').toLowerCase()
    let shortname = typeName.match(/\b(\w)/g).join('').toLowerCase()
    const embed = createNewTypeEmbed(7, `Create new event type: ${typeName}`,
        `React with ✅ to finalize your event type and create it. React with ❌ to cancel.`)
        embed.addFields([
            { name: `Game`, value: game, inline: true },
            { name: `Type Name`, value: typeName, inline: true },
            { name: `ID`, value: typeId, inline: true },
            { name: `Shortname`, value: shortname, inline: true },
            { name: `Emote`, value: emote, inline: true },
            { name: `Color`, value: color, inline: true },
            { name: `Default Max Members`, value: maxString, inline: true },
            { name: `Icon`, value: icon, inline: true }
        ])
    
    const dummyEventDate = new Date()
    const fakeEventEmbed = getEventEmbedWithDetails(null, typeName, null, color, icon, 9001,
        "Example Event", "Dummy event to show what your event type will look like", dummyEventDate, "GFN Admin",
        max, ["Tom Cruise", "Voldemort"], "Tom Cruise, Voldemort", "None", "Claude 5", null, false)

    if(!prevBotMessage) {
        sendFunction = () => originalMessage.channel.send({ embeds: [embed]})
    } 
    else {
        prevBotMessage.reactions.removeAll()
        sendFunction = () => prevBotMessage.edit(embed)
    }
    const botMessage = await sendFunction()
    const exampleEmbed = await botMessage.channel.send(fakeEventEmbed)
    botMessage.react('✅')
    botMessage.react('❌')
    const filter = (reaction, user) => {
        return (reaction.emoji.name == '✅' || reaction.emoji.name == '❌') && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const reactEmote = reaction.emoji.name

        if (reactEmote == '✅') {
            createEventType(typeId, game, typeName, shortname, emote, icon, color, max).then(newEventType => {
                botMessage.delete()
                exampleEmbed.delete()
                sendReply(originalMessage, "Created new event type "+typeName)
            })
        }
        else if (reactEmote == '❌') {
            sendReply(originalMessage, "Canceling event type creation.")
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}


async function sendCreateNewSubTypeMessage(msg) {
    const descriptions = await getEventGameTypeDescriptions()
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Subtype`)
        .setDescription("Choose a game to edit:")
        .addFields([{name: 'Games', value: descriptions}])
    let botMessage = await sendMessage(msg, embed)
    
    let gameTypes = await getEventGames()
    addGameReactions(botMessage)

    let eventEmotes = await getEventGameEmotes()
    const filter = (reaction, user) => {
        return eventEmotes.includes(reaction.emoji.name) && user.id === msg.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name

        if (eventEmotes.includes(emote)) {
            const gameType = getEventGameFromEmote(gameTypes, emote)
            sendCreateNewSubTypeType(msg, botMessage, gameType.name)
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateNewSubTypeType(originalMessage, prevBotMessage, game) {
    const descriptions = await getEventEmoteDescriptions(game)
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Subtype`)
        .setDescription("Choose a type to add a subtype to:")
        .addFields([{name: 'Games', value: descriptions}])
    prevBotMessage.reactions.removeAll()
    let botMessage = await prevBotMessage.edit(embed)
    
    let gameTypes = await getEventTypes(game)
    addTypeReactions(botMessage, game)

    let eventEmotes = await getEventTypeEmotes(game)
    const filter = (reaction, user) => {
        return eventEmotes.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name

        if (eventEmotes.includes(emote)) {
            const eventType = getEventTypeFromEmote(gameTypes, emote)
            sendCreateNewSubTypeName(originalMessage, botMessage, game, eventType.id)
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}


async function sendCreateNewSubTypeName(originalMessage, prevBotMessage, game, typeId) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Subtype`)
        .setDescription("Type your subtype name:")
    prevBotMessage.reactions.removeAll()
    let botMessage = await prevBotMessage.edit(embed)
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        collector.stop()
        if(!handleCancel(message, botMessage)) {
            sendCreateNewSubTypeEmote(originalMessage, botMessage, game, typeId, message.content)
            message.delete()
        }
    })
}

async function sendCreateNewSubTypeEmote(originalMessage, prevBotMessage, game, typeId, subtype) {
    let eventType = await getEventTypeById(typeId)
    const descriptions = getOptionDescriptions(eventType)
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Subtype ${subtype}`)
        .setDescription("React with the emote you want to use for this subtype. It must be unique and cannot be one of the previously used options:")
        .addFields([{name: 'Current options:', value: descriptions}])
    prevBotMessage.reactions.removeAll()
    let botMessage = await prevBotMessage.edit(embed)
    let eventOptions = await getEventOptionEmotes(eventType)
    const filter = (reaction, user) => {
        return !eventOptions.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const emote = reaction.emoji.name
        logger.debug("found emote reaction: "+emote)
        if (!eventOptions.includes(emote)) {
            logger.debug("valid emote reaction: "+emote)
            sendCreateNewSubTypeMax(originalMessage, botMessage, game, typeId, subtype, emote)
        } else {
            sendReply(originalMessage, "This emote has already been used. Please try again.")
        }
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}

async function sendCreateNewSubTypeMax(originalMessage, prevBotMessage, game, typeId, subtype, emote) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Subtype "${subtype}"`)
        .setDescription( `Give your subtype a default max members. If you do not want to have a default max, then enter -1.`)
    prevBotMessage.reactions.removeAll()
    let botMessage = await prevBotMessage.edit(embed)
    const collector = collectMessageReplies(originalMessage, botMessage, (message, collector) => {
        if(!handleCancel(message, botMessage)) {
            let maxMembers = parseInt(message.content)
            collector.stop()
            sendCreateNewSubTypeFinal(originalMessage, botMessage, game, typeId, subtype, emote, maxMembers)
            message.delete()
        } else {
            collector.stop()
        }
    })
}

async function sendCreateNewSubTypeFinal(originalMessage, prevBotMessage, game, typeId, subtype, emote, maxMembers) {
    let shortname = subtype.match(/\b(\w)/g).join('').toLowerCase()
    const embed = new Discord.EmbedBuilder()
        .setTitle(`Create New Subtype`)
        .setDescription("If the items below look good, react with ✅ to finalize")
        .addFields([
            { name: `Type`, value: `${typeId}`, inline: true},
            { name: `Subtype`, value: `${subtype}`, inline: true},
            { name: `Shortname`, value: `${shortname}`, inline: true},
            { name: `Emote`, value: `${emote}`, inline: true},
            { name: `Default Max Members`, value: `${maxMembers}`, inline: true}
        ])
        
    prevBotMessage.reactions.removeAll()
    let botMessage = await prevBotMessage.edit(embed)
    botMessage.react('✅')
    botMessage.react('❌')
    const filter = (reaction, user) => {
        return (reaction.emoji.name == '✅' || reaction.emoji.name == '❌') && user.id === originalMessage.author.id;
    };

    botMessage.awaitReactions(filter, { max: 1, time: 120000, errors: ['time'] })
    .then(collected => {
        const reaction = collected.first();
        const reactEmote = reaction.emoji.name

        if (reactEmote == '✅') {
            addEventSubType(typeId, subtype, shortname, emote, maxMembers).then(newSubtype => {
                botMessage.delete()
                sendReply(originalMessage, "Created new game subtype "+subtype)
            })
        }
        else if (reactEmote == '❌') {
            sendReply(originalMessage, "Canceling event type creation.")
        } 
    })
    .catch(collected => {
        logger.warn('no reaction detected');
        logger.warn(collected)
    })
}



function isValidHexString(str) {
    /^#?[0-9A-F]{6}$/i.test(str)
}

function isHexColor (hex) {
    return typeof hex === 'string'
        && hex.length === 6
        && !isNaN(Number('0x' + hex))
  }

function isValidUrl(string) {
    let url;
    
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
  
    return url.protocol === "http:" || url.protocol === "https:";
  }

function createNewTypeEmbed(stepNum, title, description, color) {
    let stepOneStatus = '➡️'
    let stepTwoStatus = ''
    let stepThreeStatus = ''
    let stepFourStatus = ''
    let stepFiveStatus = ''
    let stepSixStatus = ''
    if(stepNum > 1) {
        stepOneStatus = '✔️'
        stepTwoStatus = '➡️'
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
    if(stepNum > 5) {
        stepFiveStatus = '✔️'
        stepSixStatus = '➡️'
    }
    if(stepNum > 6) {
        stepSixStatus = '✔️'
    }
    if(!color) {
        color = 0x03a9f4
    }
    return new Discord.EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: `Step ${stepNum} of 6 • ${stepOneStatus}Game / ${stepTwoStatus}Name / ${stepThreeStatus}Emote / ${stepFourStatus}Color / ${stepFiveStatus}Icon / ${stepSixStatus}Members `})
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

async function getEventGameEmotes() {
    let types = []
    let eventGames = await getEventGames()
    eventGames.forEach(eventGame => {
        types.push(`${eventGame.emote}`)
    })
    return types
}

async function getEventTypeEmotes(game) {
    let types = []
    let eventTypes = await getEventTypesByGame(game)
    eventTypes.forEach(eventType => {
        types.push(`${eventType.emote}`)
    })
    return types
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

function getEventGameFromEmote(eventGames, emote) {
    let returnType
    eventGames.forEach(eventGame => {
        if(eventGame.emote === emote) {
            returnType = eventGame
        }
    })
    return returnType
}

function getOptionDescriptions(eventType) {
    if(eventType && eventType.options) {
        let options = []
        eventType.options.forEach(option => {
            options.push(`${option.emote} = ${option.name}`)
        })
        if(options.length > 0) {
            return options.join('\n')
        }
    }
    return "No current options"
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

function handleCancel(message, botMessage) {
    if (message.content == "stop" || message.content == "cancel") {
        botMessage.delete()
        message.delete()
        sendReply(message, "Canceling event type creation")
        return true
    }
    return false
}

module.exports = {
    executeEventTypeMessage: executeEventTypeMessage
}