const mockingoose = require('mockingoose')
const {ReactionRoles} = require('../../src/models/reaction-roles-model')

describe('reactionRoles model tests', () => {

    it('should return reaction roles by guildId', () => {
        const rrByGuild = [
            {
                guildId: 'guild1',
                messageId: '1234',
                channelId: '5555',
                roleName: 'rr-test1',
                emojiId: 'gg',
                emojiName: 'gg'
            },
            {
                guildId: 'guild1',
                messageId: '9999',
                channelId: '5555',
                roleName: 'rr-test2',
                emojiId: 'aa',
                emojiName: 'aa'
            },
            {
                guildId: 'otherguild',
                messageId: '1234',
                channelId: '5555',
                roleName: 'rr-test3',
                emojiId: 'bb',
                emojiName: 'bb'
            }
        ]

        mockingoose(ReactionRoles).toReturn
    })
})