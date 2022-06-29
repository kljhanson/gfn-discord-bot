const Discord = require('discord.js')
const { getEventTypeById } = require('../../models/event-types-model')
const { toDateString } = require('../../lib/date-utils')
const JoinEmotes = require('../../../assets/event-emotes.json')

async function getEventEmbed(event, guild) {
    const typeDetails = await getEventTypeById(event.type)
    return getEventEmbedWithDetails(guild, event.type, event.subtype, typeDetails.color, typeDetails.icon,
         event.id, event.name, event.description, event.eventDate, event.creator, event.maxMembers, event.members,
         event.getMemberList(), event.getAlternatesList(), event.getInterestedList(),
         event.getChannelName(), event.isFull())
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
    const embed = new Discord.MessageEmbed()
        .setTitle(eventName)
        .setDescription(description)
        .setColor(color)
        .addField('Type', `${eventType}`, true)
        .addField('Start Time', `${startDateString}\n${centralTime}\n${pacificTime}`, true)
        .addField('Event ID', `${eventId}`, true)
        .addField(`${JoinEmotes.JOIN} Joined (${members.length}/${maxMembers}):`, membersList, true)
        .addField(`${JoinEmotes.ALT} Alternates:`, altList, true)
        .addField(`${JoinEmotes.INTERESTED} Interested:`, intList, true)
        .setFooter(`Created by ${creator} | Your time `, 'https://i.imgur.com/zE3qV4g.png')
        .setTimestamp(eventDate)
    if(icon) {
        embed.setThumbnail(icon)
    }
    return embed
}

module.exports = {
    getEventEmbed: getEventEmbed,
    getEventEmbedWithDetails: getEventEmbedWithDetails
}