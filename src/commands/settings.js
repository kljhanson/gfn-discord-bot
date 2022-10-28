const logger = require('../lib/logger')
const Discord = require('discord.js')
const { parseDateString, toTimeString } = require('../lib/date-utils')
const {updateCleanupWindow, updateEventsChannel, updateGameEventChannel, blessRole, smiteRole } = require('../models/configuration-model')
const { getUserPreference, updateUserDailyNotification, updateUserDirectMessagePreference } = require('../models/user-preferences-model')
const { matchMessage, sendMessage, sendReply, sendImage, getMessageParams } = require('../lib/discord-utils')
const { parseDate } = require('chrono-node/dist/locales/en')

function executeSettingsMessage(msg) {
    if (matchMessage(msg, 'conf')) {
        const command = getMessageParams(msg, "conf", 1)
        const param = getMessageParams(msg, "conf", 2)
        logger.debug(command)
        logger.debug(param)
        if(command == 'notifications') {
            sendNotifConfMessage(msg)
        }
        else {
            if(msg.member.hasPermission("ADMINISTRATOR")) {
                if(command === "channel") {
                    const channel = msg.mentions.channels.first()
                    if(channel) {
                        updateEventsChannel(channel.guild.id, channel.id, channel.name).then(config => {
                            sendReply(msg, `Updated events channel. Events will now be sent to <#${config.eventsChannelID}>.`)
                        })
                    } else {
                        sendReply(msg, `Please try again with the channel you wish to configure mentioned in your message.`)
                    }
                }
                else if(command === "bless") {
                    let role = msg.content.substring("gfn/conf bless ".length)
                    if(role && role.trim().length > 0) {
                        blessRole(msg.guild.id, role).then(config => {
                            sendReply(msg, `@${role} is now able to execute elevated bot commands (create/edit game types) 😇`)
                        })
                    } else {
                        sendReply(msg, `Please try again with the name of the role you wish to grant enhanced privilages.`)
                    }
                }
                else if(command === "smite") {
                    let role = msg.content.substring("gfn/conf smite ".length)
                    if(role && role.trim().length > 0) {
                        smiteRole(msg.guild.id, role).then(config => {
                            sendReply(msg, `@${role} has been sent back to pesantry ⚡`)
                        })
                    } else {
                        sendReply(msg, `Please try again with the name of the role you wish to remove enhanced privilages.`)
                    }
                }
                else if(command === "gameevents") {
                    configureGameEventChannel(msg)
                }
                else if(command === "expires") {
                    logger.debug(param)
                    if(param) {
                        updateCleanupWindow(msg.guild.id, param).then(config => {
                            logger.debug(config)
                            sendReply(msg, `Updated events expiration. Events will now be cleaned up after ${config.eventCleanupWindow} hours.`)
                        })
                    } else {
                        sendReply(msg, `Please provide the time you want events to expire after in hours.`)
                    }
                }
                
            }
            else {
                sendReply(msg, `You do not have sufficient privilages to execute this function.`)
            }
        }
    }
}

function configureGameEventChannel(msg) {
    const channel = msg.mentions.channels.first()
    if(!channel) {
        sendReply(msg, `Please try again with the channel you wish to configure mentioned in your message.`)
    }
    else {
        sendReply(msg, `Please reply with the game you want to assign for the channel ${channel.name}:`).then(replyMsg => {
            const timeCollector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, { time: 60000 });
            timeCollector.on('collect', message => {
                replyMsg.delete()
                message.delete()
                timeCollector.stop()
                const game = message.content
                updateGameEventChannel(channel.guild.id, game, channel.id, channel.name).then(config => {
                    sendReply(msg, `Updated events channel for game: ${game}. Events for ${game} will now be sent to <#${channel.id}>.`)
                })
            })
            timeCollector.on('end', (collected, reason) => {
                if(reason === 'time') {
                    replyMsg.delete()
                    timeCollector.stop()
                    sendReply(msg, `No reply given in the required time (60 seconds). Please try your command over from the start.`)
                }
            });
        })
    }
}

function sendNotifConfMessage(msg) {
    getUserPreference(msg.guild.id, msg.author.id).then(preference => {
        logger.info(preference)
        let dmOptOut = false
        let optInVal = false
        let notifTime = "none"
        if(preference) {
            dmOptOut = preference.optOutDirectMessages
            optInVal = preference.optInDailyNotifications
            notifTime = preference.dailyNotificationTime
        }
        const embed = new Discord.EmbedBuilder()
            .setTitle(`${msg.author.username}'s notification preferences`)
            .addFields([
                { name: `Direct Message Opt Out`, value: `${dmOptOut}`, inline: true },
                { name: `Daily Notifications`, value: `${optInVal}`, inline: true },
                { name: `Notification Time`, value: `${notifTime}`, ineline: true },
                { name: `Options`, value: `🤖 = Toggle DMs on/off for event notifications\n✅ = Opt-In to daily notifications\n❌ = Opt-Out of daily notifications\n⌚ = Change daily notification time` }
            ])
        sendMessage(msg, embed).then(botMessage => {
            botMessage.react('🤖')
            botMessage.react('✅')
            botMessage.react('❌')
            botMessage.react('⌚')

            const emotes = ['🤖', '✅', '❌', '⌚']
            const filter = (reaction, user) => {
                return emotes.includes(reaction.emoji.name) && user.id === msg.author.id;
            };
            botMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
                    const emote = reaction.emoji.name
                    logger.info(emote)
                    if (emotes.includes(emote)) {
                        botMessage.delete()
                        if(emote === '🤖') {
                            updateUserDirectMessagePreference(msg.guild.id, msg.author.id, msg.author.username, !dmOptOut).then(updatedPref => {
                                let optInOutText = 'out of'
                                if(dmOptOut) {
                                    optInOutText = 'in to'
                                }
                                sendReply(msg, `You have opted ${optInOutText} receiving event notifications via Direct Message.`)
                            })
                        }
                        if(emote === '✅') {
                            let time = toTimeString(parseDateString('9:00 AM CT'))
                            if(preference && preference.dailyNotificationTime) {
                                time = preference.dailyNotificationTime
                            }
                            updateUserDailyNotification(msg.guild.id, msg.author.id, msg.author.username, true, time).then(updatedPref => {
                                sendReply(msg, `You have opted into receiving daily event notifications. Default time is 9am CT.`)
                            })
                        }
                        if(emote === '❌') {
                            let time = toTimeString(parseDateString('9:00 AM CT'))
                            if(preference && preference.dailyNotificationTime) {
                                time = preference.dailyNotificationTime
                            }
                            updateUserDailyNotification(msg.guild.id, msg.author.id, msg.author.username, false, time).then(updatedPref => {
                                sendReply(msg, `You have opted out of receiving daily event notifications`)
                            })
                        }
                        if(emote === '⌚') {
                            logger.info('test reply')
                            sendReply(msg, `Please reply with the time you wish to receive daily event notifications:`).then(replyMsg => {
                                const timeCollector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, { time: 60000 });
                                timeCollector.on('collect', message => {
                                    const notifDate = parseDateString(message.content)
                                    if (!notifDate) {
                                        sendReply(message, "hmm, that didn't work, try to keep the date format simple and try again")
                                    } else {
                                        timeCollector.stop()
                                        message.delete()
                                        replyMsg.delete()
                                        const notifTime = toTimeString(notifDate)
                                        
                                        updateUserDailyNotification(msg.guild.id, msg.author.id, msg.author.username, true, notifTime).then(updatedPref => {
                                            sendReply(msg, `You have opted into receiving daily event notifications at ${notifTime}`)
                                        })
                                    }
                                })
                                timeCollector.on('end', (collected, reason) => {
                                    if(reason === 'time') {
                                        replyMsg.delete()
                                        timeCollector.stop()
                                        sendReply(msg, `No reply given in the required time (60 seconds). Please try your command over from the start.`)
                                    }
                                });
                            })
                        }
                    } 
                })
                .catch(collected => {
                    logger.warn('no reaction detected');
                    logger.warn(collected)
                    // botMessage.reactions.removeAll()
                });
        })
    })
}

module.exports = {
    executeSettingsMessage: executeSettingsMessage
}