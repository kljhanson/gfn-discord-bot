const Discord = require('discord.js');
const config = require('./config.json');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/gfndiscord', {useNewUrlParser: true});

const Triumph = mongoose.model('Triumph', { title: String, description: String });

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    //return if the message doesn't begin with the bot prefix, or if the message is from the bot itself
    if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;

    if (msg.content.startsWith(config.prefix)) {
        var messages = msg.content.split(' ');
        var cmd = messages[1];
        if(cmd === 'create') {
            console.log("Create new triumph from user: "+msg.author.id);
            msg.channel.send('Please provide a title and description for your triumph')
                .then(() => {msg.channel.awaitMessages(response =>
                    response.author.id === msg.author.id, {
                        max: 1,
                        time: 30000,
                        errors: ['time'],

                })
                .then((response) => {
                    console.log("Got reply from user: "+response.first().author.id);
                    var contents = response.first().content.split('=');

                    const triumph = new Triumph({ title: contents[0], description: contents[1] });
                    triumph.save().then(() => {
                        const embed = new Discord.RichEmbed()
                        // Set the title of the field
                            .setTitle(contents[0])
                            // Set the color of the embed
                            .setColor(0xfda50f)
                            // Set the main content of the embed
                            .setDescription(contents[1])
                            .setThumbnail("https://i.imgur.com/7IaMctA.png")
                            .setFooter('Created by ' + msg.author.username + ' on ' + new Date());
                        msg.channel.send(embed);
                    });
                })
                .catch((err) => {
                    msg.channel.send('There was no collected message that passed the filter within the time limit!');
                    console.log("Message did not pass filter: expected user: "+msg.author.id);
                    console.log(err)
                });
            });
        }
    }
});

client.login(config.token);