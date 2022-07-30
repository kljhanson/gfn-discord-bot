const Discord = require('discord.js')
const memes = require('../../src/commands/memes')
const {MockGuild, MockMessage, MockTextChannel, textChannel, mockBotUser, mockUser} = require('../test-helpers')

// replace this with whatever the execute command is
// e.g. const ping = require('./commands/ping').execute
const ping = async (message, args) => {
    message.channel.send('Pong')
}

describe('ping', () => {
  it('sends Pong', async () => {
    await ping(new MockMessage('ping', textChannel, mockUser))
    expect(textChannel.lastMessage.content).toBe('Pong')
  })
})

describe('memes', () => {

    it('makes fun of Snek', async() => {
        await memes.executeMemeMessages(new MockMessage('gfn/snek', textChannel, mockUser))
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(textChannel.lastMessage.attachments.array()[0].url).toBe('https://media.tenor.com/images/f88700a975e4139be55cb933e05f64d7/tenor.gif')
    })

    it('threatens Rogue', async() => {
        await memes.executeMemeMessages(new MockMessage('gfn/rogue', textChannel, mockUser))
        expect(textChannel.lastMessage.content).toBe('<@251761701194563584> Hello muppet, beep boop. I calculate we are enemies.')
    })

    it('polishes the Knob', async() => {
        await memes.executeMemeMessages(new MockMessage('gfn/knobie', textChannel, mockUser))
        expect(textChannel.lastMessage.attachments.array()[0].url).toBe('https://media.giphy.com/media/Qxp1ahQCHArlK/giphy.gif')
    })

    it('gets spooked', async() => {
        await memes.executeMemeMessages(new MockMessage('gfn/spook', textChannel, mockUser))
        expect(textChannel.lastMessage.attachments.array()[0].url).toBe('https://media.discordapp.net/attachments/503667887576317982/640994085909430323/ezgif.com-crop.gif')
    })
})