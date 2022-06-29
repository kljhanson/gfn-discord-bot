/**
 * Handle general messages
 * Created: Kyle Hanson
 * Updated: 2020-10-09
 */
const Discord = require('discord.js')
const logger = require('../lib/logger')
const { matchMessage, sendMessage, sendReply, sendImage, getMessageParams } = require('../lib/discord-utils')
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
        const embed = new Discord.MessageEmbed()
            .setColor(0xa0a0a0)
            .setTitle('GFN Discord Bot')
            //.setDescription('Beep boop, I am a bot made for the GFN clan. My purpose is to ~~destroy Rogue~~ help in any way I can.')
            .addField(`Version`, `${getVersion()}`)
            .setFooter(`Made with ❤ by digitalFlame`)
        msg.channel.send(embed)
    }
}

function sendGeneralHelp(msg) {
    const embed = new Discord.MessageEmbed()
        .setTitle(`GFN Bot - Commands`)
        .setDescription(`Below is a list of commands that the GFN bot currently supports. For more details use \`gfn/help <command>\` or \`gfn/help admin\``)
        .setColor(0xa0a0a0)
        .addField(`gfn/create`, `Create a new LFG event`)
        .addField(`gfn/create <eventType>`, `Create a new scheduled event for a specific game type (for a full list, use \`gfn/create\` to view)`)
        .addField(`gfn/get <eventId>`, `View a scheduled event card.`)
        .addField(`gfn/[join/alt/int/kick] <eventId> [@member]`, `Join or leave a scheduled event. Use join/alt/int to specify your join type.`)
        .addField(`gfn/delete <eventId>`, `Delete a scheduled event.`)
        .addField(`gfn/edit [time/description/max] <eventId>`, `Edit a scheduled event content, use time/description/max to select what you want to edit.`)
        .addField(`gfn/transfer <eventId> [@member]`, `Transfer ownership of an event to another member.`)
    sendMessage(msg, embed)
}

function sendAdminHelp(msg) {
    const embed = new Discord.MessageEmbed()
        .setTitle(`GFN Bot - Admin Options`)
        .setDescription(`Below are some administrative options the bot offers`)
        .setColor(0xa0a0a0)
        .addField(`gfn/conf channel #<defaultEventChannel>`, `Set the default event channel for games without a specific events channel.`)
        .addField(`gfn/conf gameevents #<defaultEventChannel>`, `Set an event channel for a game.`)
        .addField(`gfn/conf expires <timeInHours>`, `Set expiration time for events (in hours)`)
        .addField(`gfn/conf bless <role>`, `Grant extended privilages to the supplied role for bot commands.`)
        .addField(`gfn/conf smite <role>`, `Revoke privilages for the supplied role`)

        .addField(`gfn/roles #<channel> <messageId>`, `Start a new reaction role for the supplied message (channel must match where the message was sent)`)

        .addField(`gfn/addgame <gameName>`, `Create a new game category for events`)
        .addField(`gfn/addtype`, `Create a new event type for a game`)
        .addField(`gfn/addsubtype`, `Create a subtype for an event type`)
    sendMessage(msg, embed)

}

function sendCreateEventHelp(msg) {
    const embed = new Discord.MessageEmbed()
        .setTitle(`GFN Bot - Create Event`)
        .setDescription(`Below are the options available when creating an event using \`gfn/create\``)
        .setColor(0xa0a0a0)
        .addField(`gfn/create [eventType]`, `eventType is optional - start creating from a specific event type. Full list includes Raid, Crucible, or Other for non-destiny events.`)
        .addField(`event start date`, `When creating a new event, your start date can be typed in a friendly format. For example, \`Friday at 9pm CST\`. For timezone, please use full timezone abbreviation (e.g. EST or EDT, don't use ET)`)
    sendMessage(msg, embed)

}

module.exports = {
    executeGeneralMessage: executeGeneralMessage
}