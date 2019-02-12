const Discord = require("discord.js");

exports.run = async (client, message, args) => {
    console.log("Create new triumph from user: "+message.author.id);
    message.channel.send('Please provide a title and description for your triumph')
        .then(() => {message.channel.awaitMessages(response =>
            response.author.id === message.author.id, {
            max: 1,
            time: 30000,
            errors: ['time'],

        })
        .then((response) => {
            console.log("Got reply from user: "+response.first().author.id);
            var contents = response.first().content.split('=');

            const triumph = new client.Triumph({ title: contents[0], description: contents[1] });
            triumph.save().then(() => {
                const embed = new Discord.RichEmbed()
                // Set the title of the field
                    .setTitle(contents[0])
                    // Set the color of the embed
                    .setColor(0xfda50f)
                    // Set the main content of the embed
                    .setDescription(contents[1])
                    .setThumbnail("https://i.imgur.com/7IaMctA.png")
                    .setFooter('Created by ' + message.author.username + ' on ' + new Date());
                message.channel.send(embed);
            });
        })
        .catch((err) => {
            message.channel.send('There was no collected message that passed the filter within the time limit!');
            console.log("Message did not pass filter: expected user: "+message.author.id);
            console.log(err)
        });
    });
};