const Discord = require('discord.js')
const { parseDateString, addMinutesToDate, getCurrentUTCDate } = require('../../lib/date-utils')
const { getEventById, JoinTypes, saveEvent, getEventsWithTimeframe } = require('../../models/event-model')
const { getEventsChannel, sendEventEmbed, handleCancel } = require('./event-utils')
const { getEventEmbed } = require('../../lib/events/event-ui')
const { getConfiguration } = require('../../models/configuration-model')
const { getBotUser } = require('../../lib/global-vars')
const JoinEmotes = require('../../../assets/event-emotes.json')
const logger = require('../../lib/logger')
const { sendMessage, sendReply, getMessageParams } = require('../../lib/discord-utils')
const { isNumeric } = require('../../lib/utils')

function updateEventEmbed(message, event) {
    getConfiguration(message.guild.id).then(config => {
        const eventsChannel = getEventsChannel(message.guild, config, event.game)
        eventsChannel.messages.fetch().then(messages => {
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
        })
    })
}

function getEventDetails(originalMessage, eventId) {
    getEventById(originalMessage.guild.id, eventId).then(async event => {
        logger.debug(event)
        if (!event) {
            return sendReply(originalMessage, `No event found for eventId ${eventId}`)
        }
        const embed = await getEventEmbed(event, originalMessage.guild)
        sendEventEmbed(originalMessage.channel, embed)
    })
}

async function editEventWithId(originalMessage, eventId, editType) {
    const event = await getEventById(originalMessage.guild.id, eventId)
    if(editType) {
        editEvent(originalMessage, event, editType)
    } else {
        const embed = new Discord.EmbedBuilder()
            .setTitle(`Edit Event ${event.getMiniTitle()}`)
            .setDescription(`Choose what field you would like by reacting with the related emote:`)
            .addFields({name: `Edit Options:`, value: `✒ = Name\n🏷 = Description\n🎟 = Max / Limit\n⌚ = Time`})
        sendMessage(originalMessage, embed).then(botMessage => {
            botMessage.react('✒')
            botMessage.react('🏷')
            botMessage.react('🎟')
            botMessage.react('⌚')
    
            const emotes = ['✒', '🏷', '🎟', '⌚']
            const filter = (reaction, user) => {
                return emotes.includes(reaction.emoji.name) && user.id === originalMessage.author.id;
            };
            botMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
                    const emote = reaction.emoji.name
                    logger.info(emote)
                    if (emotes.includes(emote)) {
                        botMessage.delete()
                        let editType
                        if(emote == emotes[0]) {
                            editType = 'name'
                        } else if(emote == emotes[1]) {
                            editType = 'description'
                        } else if(emote == emotes[2]) {
                            editType = 'limit'
                        } else if(emote == emotes[3]) {
                            editType = 'time'
                        }
                        editEvent(originalMessage, event, editType)
                    }
                })
                .catch(collected => {
                    logger.warn('no reaction detected');
                    logger.warn(collected)
                    // botMessage.reactions.removeAll()
                });
            })
    }
}

async function editEvent(originalMessage, event, editType) {
    let editText;
    if(editType.toLowerCase() === 'name') {
        editText = `Please provide a new name for this event:`
    }
    if(editType.toLowerCase() === 'description') {
        editText = `Please provide a new description for this event:`
    }
    else if(editType.toLowerCase() === 'limit' || editType.toLowerCase() === 'max') {
        editText = `Please provide a new max attendees for this event:`
    }
    else if(editType.toLowerCase() === 'time') {
        editText = `Please provide a new date and time for the event:`
    }
    sendEditMessage(originalMessage, event, editType, editText)
}

function sendEditMessage(originalMessage, event, editType, editText) {
    const embed = editEventEmbed(`Edit ${editType.toLowerCase()} for event ${event.getMiniTitle()}`, editText)
    originalMessage.channel.send({ embeds: [embed]}).then(botMessage => {
        const collector = new Discord.MessageCollector(originalMessage.channel, m => m.author.id === originalMessage.author.id, { time: 60000 });
        collector.on('collect', message => {
            if (!handleCancel(message, botMessage)) {
                const valid = isValidEdit(message.content, editType)
                if(!valid) {
                    if(editType.toLowerCase() === 'name') {
                        sendReply(message, "hmm, that didn't work, try to keep the name under 32 characters and try again")
                    }
                    if(editType.toLowerCase() === 'description') {
                        sendReply(message, "hmm, that didn't work, try to keep the description simple and try again")
                    }
                    else if(editType.toLowerCase() === 'max' || editType.toLowerCase() == 'limit') {
                        sendReply(message, "Value must be an integer between 1 and 100")
                    }
                    else if(editType.toLowerCase() === 'time') {
                        sendReply(message, "hmm, that didn't work, try to keep the date format simple and try again")
                    }
                } else {
                    if(editType.toLowerCase() === 'description') {
                        event.description = message.content
                    }
                    else if(editType.toLowerCase() === 'max' || editType.toLowerCase() == 'limit') {
                        const parseNum = parseInt(message.content)
                        event.maxMembers = parseNum
                    }
                    else if(editType.toLowerCase() === 'time') {
                        const parsedDate = parseDateString(message.content)
                        event.eventDate = parsedDate
                    }
                    collector.stop()
                    message.delete()
                    botMessage.delete()
                    saveEvent(event)
                    updateEventEmbed(originalMessage, event)
                    sendReply(message, `Updated ${editType.toLowerCase()} for event: ${event.getMiniTitle()}`)
                }
            }
        })
        collector.on('end', (collected, reason) => {
            if(reason === 'time') {
                botMessage.delete()
                collector.stop()
                sendReply(originalMessage, `No reply given in the required time (60 seconds). Please try your command over from the start.`)
            }
        });
    })
}

function isValidEdit(text, eventType) {
    let valid = false
    if(eventType.toLowerCase() === 'description') {
        valid = true
    }
    else if(eventType.toLowerCase() === 'name') {
        valid = text.length < 32
    }
    else if(eventType.toLowerCase() === 'max' || eventType.toLowerCase() == 'limit') {
        valid = !isNaN(text)
        if(valid) {
            const parseNum = parseInt(text)
            if(parseNum <= 0 || parseNum > 100) {
                valid = false
            }
        }
    }
    else if(eventType.toLowerCase() === 'time') {
        const parsedDate = parseDateString(text)
        valid = parsedDate !== null && parsedDate !== undefined
    }
    return valid
}

function editEventEmbed(title, description, color) {
    if(!color) {
        color = 0x03a9f4
    }
    return new Discord.EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
}

module.exports = {
    getEventDetails: getEventDetails,
    editEventWithId: editEventWithId,
    editEvent: editEvent
}