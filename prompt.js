const builder = require('botbuilder');
const restify = require('restify');

//create the bot
const connector = new builder.ChatConnector();
const bot = new builder.UniversalBot(
    connector,
    [
        (session) => {
            // session.send("Hello AI Avengers!");
            builder.Prompts.text(session, 'Hello!, What is your name?', 
            {retryPrompt: `Please enter your name ... `}
            );
        },
        (session, results) => {
            session.endDialog(`Hello, ${results.response}`);
        }
    ]
);

bot.dialog('help', [
    (session) => {
        session.endDialog(`I'm a simple bot ...`);
    }
]).triggerAction({
    matches: /^help$/i,
    onSelectAction: (session, args) => {
        //Execute just before the dialogs launches
        //Change the default behaviour
        //The default behavior is to REPLACE the dialog stack
        session.beginDialog(args.action, args);
    }
})

//create the host web server
const server = restify.createServer();
server.post('/api/messages',connector.listen())
server.listen(
    process.env.PORT || 3978,
    () => console.log('Server up!!')
);



