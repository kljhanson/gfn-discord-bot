const Discord = require('discord.js')

// a counter so that all the ids are unique
let count = 0

// the user that executes the commands
const mockUser = {id: count++, username: 'mockUser', discriminator: '9999'}
const mockBotUser = {id: count++, username: 'mockBotUser', discriminator: '1234'}

class MockGuild extends Discord.Guild {
    constructor(client) {
        super(client, {
            // you don't need all of these but I just put them in to show you all the properties that Discord.js uses
            id: count++,
            name: 'Mock Guild',
            icon: null,
            splash: null,
            owner_id: '',
            region: '',
            afk_channel_id: null,
            afk_timeout: 0,
            verification_level: 0,
            default_message_notifications: 0,
            explicit_content_filter: 0,
            roles: [],
            emojis: [],
            features: [],
            mfa_level: 0,
            application_id: null,
            system_channel_flags: 0,
            system_channel_id: null,
            widget_enabled: false,
            widget_channel_id: null
        })
        this.client.guilds.cache.set(this.id, this)
    }
}

class MockAttachment extends Discord.MessageAttachment {
    constructor(url) {
        
    }
}
  
class MockTextChannel extends Discord.TextChannel {
    constructor(guild) {
        super(guild, {
            id: count++,
            type: 0
        })
        this.client.channels.cache.set(this.id, this)
    }

    // you can modify this for other things like attachments and embeds if you need
    send(content, options) {
        let attachments = []
        if(options && options.files) {
            options.files.forEach(file => {
                attachments.push({
                    id: count++,
                    url: file.attachment,
                    filename: file.name
                })
            })
        }

        let mentions = []
        if(options && options.mentions) {
            options.mentions.forEach(mention => {
                mentions.push({
                    id: mention.id,
                    username: mention.username,
                    discriminator: mention.discriminator,
                    bot: false
                })
            })
        }
        return this.client.actions.MessageCreate.handle({
            id: count++,
            type: 0,
            channel_id: this.id,
            content,
            author: {
                id: mockBotUser.id,
                username: mockBotUser.username,
                discriminator: mockBotUser.discriminator,
                bot: true
            },
            pinned: false,
            tts: false,
            nonce: '',
            embeds: [],
            attachments: attachments,
            timestamp: Date.now(),
            edited_timestamp: null,
            mentions: mentions,
            mention_roles: [],
            mention_everyone: false
        })
    }
}
  
class MockMessage extends Discord.Message {
    constructor(content, channel, author) {
        super(channel.client, {
            id: count++,
            type: 0,
            channel_id: channel.id,
            content,
            author,
            pinned: false,
            tts: false,
            nonce: '',
            embeds: [],
            attachments: [],
            timestamp: Date.now(),
            edited_timestamp: null,
            mentions: [],
            mention_roles: [],
            mention_everyone: false
        }, channel)
    }

    reply(content) {
        this.channel.send(content, {
            mentions: [
                {
                    id: this.author.id,
                    username: this.author.username,
                    discriminator: this.author.discriminator
                }
            ]
        })
    }
}
  
const client = new Discord.Client({restSweepInterval: 0})
const guild = new MockGuild(client)
const textChannel = new MockTextChannel(guild)

module.exports = {
    MockGuild: MockGuild,
    MockTextChannel: MockTextChannel,
    MockMessage: MockMessage,
    textChannel: textChannel,
    mockBotUser: mockBotUser,
    mockUser: mockUser
}