/**
 * Handle general messages
 * Created: Kyle Hanson
 * Updated: 2020-10-09
 */
const Discord = require('discord.js')
const logger = require('../lib/logger')
const { matchMessage, sendMessage, sendEmbed, sendReply, replyEmbed, sendImage, getMessageParams } = require('../lib/discord-utils')
const { getVersion } = require('../lib/global-vars')

function executeGeneralMessage(msg) {
    if(matchMessage(msg, 'help')) {
        const helpSubtype = getMessageParams(msg, "help", 1)
        if(!helpSubtype) {
            sendGeneralHelp(msg)
        }
        else if(helpSubtype.toLowerCase() === 'create') {
            sendCreateEventHelp(msg)
        }
        else if(helpSubtype.toLowerCase() === 'admin') {
            sendAdminHelp(msg)
        }
    }
    if(matchMessage(msg, 'info') || matchMessage(msg, 'version')) {
        const embed = new Discord.EmbedBuilder()
            .setColor(0xa0a0a0)
            .setTitle('GFN Discord Bot')
            //.setDescription('Beep boop, I am a bot made for the GFN clan. My purpose is to ~~destroy Rogue~~ help in any way I can.')
            .addFields({name: `Version`, value: `${getVersion()}`})
            .setFooter({ text: `Made with ❤ by digitalFlame` })
        msg.reply({ embeds: [embed] })
    }
}

function sendGeneralHelp(msg) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`GFN Bot - Commands`)
        .setDescription(`Below is a list of commands that the GFN bot currently supports. For more details use \`gfn/help <command>\` or \`gfn/help admin\``)
        .setColor(0xa0a0a0)
        .addFields(
            [
                { name: `gfn/create`, value: `Create a new LFG event` },
                { name: `gfn/create <eventType>`, value: `Create a new scheduled event for a specific game type (for a full list, use \`gfn/create\` to view)` },
                { name: `gfn/get <eventId>`, value: `View a scheduled event card.` },
                { name: `gfn/[join/alt/int/kick] <eventId> [@member]`, value: `Join or leave a scheduled event. Use join/alt/int to specify your join type.` },
                { name: `gfn/delete <eventId>`, value: `Delete a scheduled event.` },
                { name: `gfn/edit [time/description/max] <eventId>`, value: `Edit a scheduled event content, use time/description/max to select what you want to edit.` },
                { name: `gfn/transfer <eventId> [@member]`, value: `Transfer ownership of an event to another member.` }
            ]
        )
        replyEmbed(msg, embed)
}

function sendAdminHelp(msg) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`GFN Bot - Admin Options`)
        .setDescription(`Below are some administrative options the bot offers`)
        .setColor(0xa0a0a0)
        .addFields(
            [
                { name: `gfn/conf channel #<defaultEventChannel>`, value: `Set the default event channel for games without a specific events channel.` },
                { name: `gfn/conf gameevents #<defaultEventChannel>`, value: `Set an event channel for a game.` },
                { name: `gfn/conf expires <timeInHours>`, value: `Set expiration time for events (in hours)` },
                { name: `gfn/conf bless <role>`, value: `Grant extended privilages to the supplied role for bot commands.` },
                { name: `gfn/conf smite <role>`, value: `Revoke privilages for the supplied role` },
                { name: `gfn/roles #<channel> <messageId>`, value: `Start a new reaction role for the supplied message (channel must match where the message was sent)` },
                { name: `gfn/addgame <gameName>`, value: `Create a new game category for events` },
                { name: `gfn/addtype`, value: `Create a new event type for a game` },
                { name: `gfn/addsubtype`, value: `Create a subtype for an event type` }
            ]
        )
        replyEmbed(msg, embed)
}

function sendCreateEventHelp(msg) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`GFN Bot - Create Event`)
        .setDescription(`Below are the options available when creating an event using \`gfn/create\``)
        .setColor(0xa0a0a0)
        .addFields(
            [
                { name: `gfn/create [eventType]`, value: `eventType is optional - start creating from a specific event type. Full list includes Raid, Crucible, or Other for non-destiny events.`},
                { name: `event start date`, value: `When creating a new event, your start date can be typed in a friendly format. For example, \`Friday at 9pm CST\`. For timezone, please use full timezone abbreviation (e.g. EST or EDT, don't use ET)`}
            ]
        )
        replyEmbed(msg, embed)
}

module.exports = {
    executeGeneralMessage: executeGeneralMessage
}