// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');

// This bot's main dialog.
const { RichCardsBot } = require('./richCardsBot'); 
const { MainDialog } = require('./mainDialog');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Create HTTP server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
    console.log(`\nTo talk to your bot, open the emulator select "Open Bot"`);
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Create conversation and user state with in-memory storage provider.

const memoryStorage = new MemoryStorage();

let conversationState = new ConversationState(memoryStorage);

let userState = new UserState(memoryStorage);
// Map knowledgebase endpoint values from .env file into the required format for `QnAMaker`.
const configuration = {
    knowledgeBaseId: process.env.QnAKnowledgebaseId,
    endpointKey: process.env.QnAAuthKey,
    host: process.env.QnAEndpointHostName
};

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
    await conversationState.delete(context);
};

const logger = console;
// Create the main dialog.
const dialog = new MainDialog(logger);
const bot = new RichCardsBot(conversationState, userState, dialog, logger, configuration, {});

// Catch-all for errors.

adapter.onTurnError = async (context, error) => {

    // This check writes out errors to console log .vs. app insights.

    console.error(`\n [onTurnError]: ${error}`);

    // Send a message to the user

    await context.sendActivity(`Oops. Something went wrong!`);

    // Clear out state

    await conversationState.load(context);

    await conversationState.clear(context);

    // Save state changes.

    await conversationState.saveChanges(context);

};
// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await bot.run(context);
    });
});


