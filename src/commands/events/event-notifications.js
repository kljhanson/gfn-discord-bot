const Discord = require('discord.js')
const { parseDateString, addMinutesToDate, getCurrentUTCDate, getCurrentUTCDateToTheMinute, toTimeString } = require('../../lib/date-utils')
const { getEventById, JoinTypes, getEventsStartingAt, getDailyEvents} = require('../../models/event-model')
const { getEventsChannel, sendEventEmbed, handleCancel } = require('./event-utils')
const { getEventEmbed } = require('../../lib/events/event-ui')
const { getConfiguration } = require('../../models/configuration-model')
const { getNotificationPreferences, getUserPreference } = require('../../models/user-preferences-model')
const { getBotUser } = require('../../lib/global-vars')
const JoinEmotes = require('../../../assets/event-emotes.json')
const logger = require('../../lib/logger')
const { sendReply } = require('../../lib/discord-utils')

async function processDailyNotifications(client) {
    const currentDateTime = getCurrentUTCDateToTheMinute()
    const timeString = toTimeString(currentDateTime).replace("CST", "").replace("CDT", "")
    logger.info(`searching for daily notifications equal to time: ${timeString}`)
    getNotificationPreferences(timeString).then(preferences => {
        logger.info(preferences)
        preferences.forEach(preference => {
            let startTime = getCurrentUTCDate().hour(3).minute(0).second(0)
            let endTime = getCurrentUTCDate().hour(3).minute(0).second(0).day(startTime.day()+1)
            logger.info(`Searching for daily events for user ${preference.userName} between ${startTime} and ${endTime}`)
            getDailyEvents(preference.guildId, preference.userName, startTime, endTime).then(async events => {
                if(events.length > 0) {
                    logger.info(events)
                    let greeting = `Morning`
                    if(preference.dailyNotificationTime.indexOf('PM') > 0) {
                        greeting = 'Afternoon'
                    }
                    let description = `Good ${greeting}, ${preference.userName}. You are a member of the following ${events.length} events for today: \n`
                    
                    const guild = client.guilds.cache.filter(guild => guild.id === preference.guildId).first()
                    await guild.members.fetch()
                    const member = guild.members.cache.filter(member => member.id === preference.userId).first()
                    member.user.send(description)
                    events.forEach(async event => {
                        const embed = await getEventEmbed(event, guild)
                        member.user.send({ embeds: [embed]})
                    })
                } else {
                    logger.info(`No events found for today for user: ${preference.userName}`)
                }
            })
        })
    })
}

async function processEventNotifications(client) {
    const startTime = addMinutesToDate(getCurrentUTCDateToTheMinute(), 15)
    getNotificationPreferences()
    client.guilds.cache.forEach(guild => {
        logger.info(`Getting events for notifications starting at ${startTime}`)
        getEventsStartingAt(guild.id, startTime).then(async events => {
            events.forEach(async event => {
                let joinedUsers = []
                let joinedMembers = []
                await event.members.forEach(async member => {
                    await guild.members.fetch()
                    const memberUser = guild.members.cache.filter(guildMember => guildMember.user.username === member).first()
                    if(memberUser) {
                        joinedUsers.push(memberUser)
                        joinedMembers.push(`<@${memberUser.id}>`)
                    }
                    logger.info('members found for notify:')
                    logger.info(joinedMembers)
                })
                let message = `${joinedMembers.join(", ")} This event is starting in **15 minutes**. Please be ready to join up.`
                const channelName = event.getChannelName()
                const eventChannel = guild.channels.cache.filter(channel => channel.name == channelName).first()
                if(eventChannel) {
                    logger.info(`found event channel ${channelName}`)
                    eventChannel.send(message)
                }
                joinedUsers.forEach(async user => {
                    const userPref = await getUserPreference(guild.id, user.id)
                    if(userPref && userPref.optOutDirectMessages) {
                        logger.info(`skipping DM to ${user.username} as they have opted out of receiving direct messages`)
                    } else {
                        user.send(`The following which you have joined is starting in **15 minutes**. Please be ready to join up.`)
                        user.send({ embeds: [await getEventEmbed(event, guild)] })
                    }
                })
            })
        })
    })
}

module.exports = {
    processEventNotifications: processEventNotifications,
    processDailyNotifications: processDailyNotifications
}