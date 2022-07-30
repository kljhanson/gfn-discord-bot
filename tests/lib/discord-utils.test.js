const Discord = require('discord.js')
const discordUtils = require('../../src/lib/discord-utils')
const {MockGuild, MockMessage, MockTextChannel, textChannel, mockBotUser, mockUser} = require('../test-helpers')

describe('discord utils -- matchMessage', () => {

    it('should match a message with the proper prefix', async() => {
        const matches = discordUtils.matchMessage(new MockMessage('gfn/info', textChannel, mockUser), 'info')
        expect(matches === true)
    })

    it('should match a message with different casing on prefix', async() => {
        const allLower = discordUtils.matchMessage(new MockMessage('gfn/info', textChannel, mockUser), 'info')
        expect(allLower === true)
        const allUpper = discordUtils.matchMessage(new MockMessage('GFN/info', textChannel, mockUser), 'info')
        expect(allUpper === true)
        const mixedCase = discordUtils.matchMessage(new MockMessage('Gfn/info', textChannel, mockUser), 'info')
        expect(mixedCase === true)
    })


    it('should not match a message without the right prefix', async() => {
        const matches = discordUtils.matchMessage(new MockMessage('abc/info', textChannel, mockUser), 'info')
        expect(matches === true)
    })

    it('should not match a message without a correct command', async() => {
        const matches = discordUtils.matchMessage(new MockMessage('gfn/deleterogue', textChannel, mockUser), 'info')
        expect(matches === true)
    })
})

describe('discord utils -- sendMessage', () => {

    it('should send a given text message to the same channel it was send from', async() => {
        discordUtils.sendMessage(new MockMessage('gfn/info', textChannel, mockUser), 'bot response')
        const responseMessage = textChannel.lastMessage
        expect(responseMessage.content === 'bot response')
        expect(responseMessage.author.username === mockBotUser.username)
    })
})

describe('discord utils -- sendReply', () => {

    it('should send a given text message and mention the user who sent the original message', async() => {
        discordUtils.sendReply(new MockMessage('gfn/info', textChannel, mockUser), 'bot response')
        const responseMessage = textChannel.lastMessage
        expect(responseMessage.content === 'bot response')
        expect(responseMessage.author.username === mockBotUser.username)
        expect(responseMessage.mentions.users.array()[0].username === mockUser.username)
    })
})
