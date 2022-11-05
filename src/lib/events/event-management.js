const Discord = require('discord.js')
const { getConfiguration } = require("../../models/configuration-model")
const { getEventById, createEvent, saveEvent } = require("../../models/event-model")
const { parseDateString } = require("../date-utils")
const { sendReply } = require("../discord-utils")
const logger = require("../logger")
const { getEventsChannel, createEventChannel, updateEventsChannel } = require("./event-channels")
const { cleanupEvent, updateEventEmbed } = require("./event-maintenance")
const { getEventEmbed, sendEventEmbed, editEventEmbed } = require("./event-ui")
const { createScheduledEvent } = require('./scheduled-events')

async function createNewEvent(interaction, eventDetails) {
    const config = await getConfiguration(interaction.guild.id)
    logger.info(`creating event, eventDetails: ${JSON.stringify(eventDetails)}`)
    const eventChannel = getEventsChannel(interaction.guild, config, eventDetails.game)
    let newEvent = await createEvent(
        eventDetails.name, 
        eventDetails.description, 
        eventDetails.game, 
        eventDetails.type, 
        eventDetails.subtype,
        eventDetails.eventDate, 
        eventDetails.maxMembers, 
        eventDetails.creator, 
        interaction.guild.id, 
        "idk", 
        eventDetails.members,
        eventDetails.private)
    logger.info(`created new event, event=${JSON.stringify(newEvent)}`)
    const channel = await createEventChannel(interaction, eventChannel, newEvent, interaction.author)
    newEvent.eventChannelId = channel.id
    saveEvent(newEvent)
    const newEventEmbed = await getEventEmbed(newEvent, interaction.guild)
    if(eventDetails.private) {
        await interaction.editReply({content: "Created new private event:", embeds: [newEventEmbed], components: []})
    } else {
        sendEventEmbed(eventChannel, newEventEmbed)
        await interaction.editReply({content: "Created new event:", embeds: [newEventEmbed], components: []})
        await interaction.followUp(`Created new event: **${newEvent.getMiniTitle()}**\n**View events**: <#${eventChannel.id}>\n**View event channel**: <#${channel.id}>`)
        await updateEventsChannel(interaction, eventDetails.game)
    }
    notifyEventAttendees(interaction, newEvent, channel)
    if(eventDetails.members && eventDetails.members.length > 0) {
        let mentions = [];
        const guildMembers = await interaction.guild.members.fetch()
        await eventDetails.members.forEach(async member => {
            if(member !== interaction.user.username) {
                const memberUser = guildMembers.find(guildMember => guildMember.user.username === member)
                if(memberUser && memberUser.username !== interaction.user.username) {
                    mentions.push(`<@${memberUser.id}>`)
                }
            }
        })
        if(mentions.length > 0) {
            await channel.send(`${mentions.join(", ")} you were added by ${interaction.user.username} to the event **${newEvent.getMiniTitle()}**`)
        }
    }
    logger.debug(`should create scheduled event: ${eventDetails.isClanEvent}`)
    if(eventDetails.isClanEvent) {
        createScheduledEvent(interaction.guild, newEvent)
    }
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

async function notifyEventAttendees(interaction, newEvent, eventChannel) {
    if(newEvent.members && newEvent.members.length > 0) {
        let mentions = [];
        const guildMembers = await interaction.guild.members.fetch()
        await newEvent.members.forEach(async member => {
            if(member !== interaction.user.username) {
                const memberUser = guildMembers.find(guildMember => guildMember.user.username === member)
                if(memberUser && memberUser.username !== interaction.user.username) {
                    mentions.push(`<@${memberUser.id}>`)
                }
            }
        })
        if(mentions.length > 0) {
            await eventChannel.send(`${mentions.join(", ")} you were added by ${interaction.user.username} to the event **${newEvent.getMiniTitle()}**`)
        }
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
                    updateEventEmbed(originalMessage.guild, event)
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

async function deleteEvent(interaction, eventId) {
    logger.info(`delete event ${eventId}`)
    const event = await getEventById(interaction.guild.id, eventId)
    const config = await getConfiguration(interaction.guild.id)
    if(interaction.user.username === event.creator 
        || interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
            cleanupEvent(event, interaction.guild, config, 'Deleted')
            // const newEventEmbed = await getEventEmbed(newEvent, interaction.guild)
            await interaction.editReply({content: "Deleted event:", components: []})
            await interaction.followUp(`Deleted event: **${event.getMiniTitle()}**`)
    
    }
    else {
        sendReply(interaction, `You must have created the event or have administrator privilages to delete event: ${event.getMiniTitle()}, created by: ${event.creator}`)
    }
}

module.exports = {
    createNewEvent: createNewEvent,
    deleteEvent: deleteEvent,
    getEventDetails: getEventDetails,
    editEventWithId: editEventWithId,
    editEvent: editEvent,
    sendEditMessage: sendEditMessage,
}