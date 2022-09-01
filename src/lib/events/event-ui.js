const Discord = require('discord.js')
const { getEventTypeById } = require('../../models/event-types-model')
const { toDateString } = require('../date-utils')
const JoinEmotes = require('../../../assets/event-emotes.json')
const logger = require('../logger')
const { getBotUser } = require('../global-vars')
const { getConfiguration } = require('../../models/configuration-model')

async function getEventEmbed(event, guild) {
    logger.debug(event.type)
    const typeDetails = await getEventTypeById(event.type)
    logger.debug(typeDetails)
    return getEventEmbedWithDetails(guild, event.type, event.subtype,
         typeDetails?typeDetails.color:null, 
         typeDetails?typeDetails.icon:null,
         event.id, event.name, event.description, event.eventDate, event.creator, event.maxMembers, event.members,
         event.getMemberList(), event.getAlternatesList(), event.getInterestedList(),
         event.getChannelName(), event.isFull())
}

function getEventEmbedWithOptions(options) {
    return getEventEmbedWithDetails(
        options.guild,
        options.type,
        options.subtype,
        options.typeColor,
        options.icon,
        options.eventId,
        options.eventName,
        options.description,
        options.eventDate,
        options.creator,
        options.maxMembers,
        options.members,
        options.membersList,
        options.altList,
        options.intList,
        options.channelName,
        options.isFull
    )
}


function getEventEmbedWithDetails(guild, type, subtype, typeColor, icon,
    eventId, eventName, description, eventDate, creator, maxMembers, 
    members, membersList, altList, intList, channelName, isFull) {
    let color = 0x228c22
    if(typeColor) {
        color = typeColor
    }
    let startDateString = toDateString(eventDate, 'h:mm A zz MM/DD (ddd)', 'America/New_York')
    let centralTime = toDateString(eventDate, 'h:mm A zz', 'America/Chicago')
    let pacificTime = toDateString(eventDate, 'h:mm A zz', 'America/Los_Angeles')
    if(guild) {
        const eventChannel = guild.channels.cache.filter(channel => channel.name == channelName).first()
        if(eventChannel) {
            description += `\n_View event channel:_ <#${eventChannel.id}>`
        }
    }
    if(isFull) {
        description += `\n\n🥳 **EVENT FULL**🥳`
    }
    let eventType
    if(type) {
        eventType = type.charAt(0).toUpperCase() + type.slice(1)
    } else {
        eventType = "Unknown"
    }
    if(subtype) {
        eventType += ` - ${subtype}`
    }
    const embed = new Discord.EmbedBuilder()
        .setTitle(eventName)
        .setDescription(description)
        .setColor(color)
        .addFields(
            [
                {name: 'Type', value: `${eventType}`, inline: true },
                {name: 'Start Time', value: `${startDateString}\n${centralTime}\n${pacificTime}`, inline: true },
                {name: 'Event ID', value: `${eventId}`, inline: true },
                {name: `${JoinEmotes.JOIN} Joined (${members.length}/${maxMembers}):`, value: membersList, inline: true },
                {name: `${JoinEmotes.ALT} Alternates:`, value: altList, inline: true },
                {name: `${JoinEmotes.INTERESTED} Interested:`, value: intList, inline: true }
            ])
        .setFooter({ text: `Created by ${creator} | Your time `, iconURL: 'https://i.imgur.com/zE3qV4g.png'})
        .setTimestamp(eventDate)
    if(icon) {
        embed.setThumbnail(icon)
    }
    return embed
}

function sendEventEmbed(channel, event) {
    return channel.send({embeds: [event]}).then(async eventMessage => {
        await eventMessage.react(JoinEmotes.JOIN)
        await eventMessage.react(JoinEmotes.ALT)
        await eventMessage.react(JoinEmotes.INTERESTED)
        await eventMessage.react(JoinEmotes.LEAVE)
    })
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
    getEventEmbed: getEventEmbed,
    getEventEmbedWithDetails: getEventEmbedWithDetails,
    getEventEmbedWithOptions: getEventEmbedWithOptions,
    sendEventEmbed: sendEventEmbed,
    editEventEmbed: editEventEmbed
}