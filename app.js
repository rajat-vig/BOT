const env = require('dotenv');
env.config();

var builder = require('botbuilder');
var restify = require('restify');
var githubClient = require('./github-client.js');

//create the bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(
    connector,
    (session) => {
        session.endConversation(`Hi there!, I'm the Github bot. I can help you find the Github users`);
        }
);

const recognizer =  new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
recognizer.onEnabled((context, callback) => {
    if (context.dialogStack().length > 0) {
        //we are in a conversation
        callback(null, false);
    } else {
        callback(null, true);
    }
});

bot.recognizer(recognizer);

bot.dialog('search', [
    (session, args, next) => {
        const query = builder.EntityRecognizer.findEntity(args.intent.entities, 'query')
//        if(session.message.text.toLowerCase() == 'search'){
        if(!query) {
            //No matching entity
            //TODO : prompt user for text
            builder.Prompts.text(session, `Who did you want to search for? `);
        } else {
//            var query = session.message.text.substring(7);
//            next({response: query});
            next({response: query.entity});
        }
    },
    (session, results, next) => {
        var query =results.response;
        if(!query) {
            session.endDialog('Request cancelled');
        } else {
            githubClient.executeSearch(query, (profiles) => {
                var totalCount = profiles.total_count;
                if(totalCount==0) {
                    session.endDialog('Sorry, no results found.');
                } else if(totalCount > 10) {
                    session.endDialog('More than 10 results were found. Please provide more details')
                } else {
                    session.dialogData.property = null;
                    var usernames = profiles.items.map((item) => { return item.login })
                    //TODO
                    builder.Prompts.choice(
                        session,
                        `Please choose a user`,
                        usernames,
                        { listStyle: builder.ListStyle.button }
                    )
                }
            });
        }
    }, (session, results, next) => {
        //TODO
        //when you are using choice, the value is inside of results.response.entity
        //session.endConversation(`You chose ${results.response.entity}`);

        session.sendTyping();
        var username = results.response.entity;
        githubClient.loadProfile(username, (profile) => {
            var card = new builder.HeroCard(session);

            card.title(profile.login);

            card.images([builder.CardImage.create(session, profile.avatar_url)]);

            if (profile.name) card.subtitle(profile.name);

            var text = '';
            if (profile.company) text += profile.company + '\n\n';
            if (profile.email) text += profile.email + '\n\n';
            if (profile.bio) text += profile.bio;
            card.text(text);

            card.tap(new builder.CardAction.openUrl(session, profile.html_url));
            
            var message = new builder.Message(session).attachments([card]);
            session.endConversation(message);
        });
    }
]).triggerAction({
//    matches: /^search/i
    matches: "search"
})

//create the host web server
var server = restify.createServer();
server.listen(
    process.env.port || process.env.PORT || 3978, function(){
        console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages',connector.listen()); 


