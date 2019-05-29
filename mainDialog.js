// Copyright (c) Microsoft Corporation. All rights reserved.

// Licensed under the MIT License.

var booking
var index
const { AttachmentLayoutTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const moment = require('moment')
const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';

class MainDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');
        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }
        this.logger = logger;
        this.time_store = []
        // Define the main dialog and its related components.

        this.addDialog(new ChoicePrompt('cardPrompt'));

        this.addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
            this.choiceCardStep.bind(this),
        ]));
        // The initial child Dialog to run.
        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }
    /**

     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.

     * If no dialog is active, it will start the default dialog.

     * @param {*} turnContext

     * @param {*} accessor

     */
    async run(turnContext, accessor, book, ind) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        booking = book
        index = ind
        const dialogContext = await dialogSet.createContext(turnContext);
        var yes = await dialogContext.beginDialog(this.id);
        booking = undefined
        index = undefined
    }



    /**

     * 1. Prompts the user if the user is not in the middle of a dialog.

     * 2. Re-prompts the user when an invalid input is received.

     *

     * @param {WaterfallStepContext} stepContext

     */

    async choiceCardStep(stepContext) {
        // if (booking === undefined){
        //     options = {

        //         prompt: 'Enter your country code',
    
        //         retryPrompt: 'That was not a valid choice, please select a card',
    
        //         choices: ["IND (+91)", "USA (+1)"]
    
        //     };
        //     return await stepContext.prompt('cardPrompt', options);
        // }
        // else if (booking.response === undefined) {
            return await stepContext.context.sendActivity({

                attachments: this.attachment_cards(index),
                attachmentLayout: AttachmentLayoutTypes.Carousel
            });
        // }       
        // else {
        //     //console.log("Entered the first if cond")
        //     var options
        //     if (index === undefined){
                
        //      //console.log("in here")
        //             options = {
        //                 prompt: 'What is the date you want to book on?',
        //                 retryPrompt: 'That was not a valid choice, please select a card',
        //                 choices: this.getChoices(booking.response, index)   
        //             };       
        //             return await stepContext.prompt('cardPrompt', options);      
        //     }
        //     if (index !== undefined&& booking.response !== undefined)
        //     { 
        //         //console.log("in time sec")
        //         options = {

        //         prompt: 'What is the time you want to take the test?',

        //         retryPrompt: 'That was not a valid choice, please select a card',

        //         choices: this.getChoices(booking.response, index)

        //         };
        //         return await stepContext.prompt('cardPrompt', options);
        //     }
        //         //console.log("Before the prompt")
                
            
        // } 
    
    }
    getChoices(book, index =-1)  {
        var cardOptions = []
        
        if (index !== -1){
            for (let i = 0; i<book[index].timings.length; i++)
            {
                //console.log("in getChoices")
                var i1 = this.timeConversion(book[index].timings[i])
                cardOptions.push({value: `${i1}`, data: book[index].timings[i]})

            }
            //console.log(book[index].timings.length)
           
        }
        else{
            for (let i =0; i<book.length; i++)
                {
                    if (book[i].timings.length>0){
                        cardOptions.push({value: `${book[i].dateString}`})
                    }
                    
    
                }
    
        } 
         



        return cardOptions;

    }

    timeConversion(value) {
        let x = new Date(value);
        let myNewDate = new Date(x.getTime() + 60000 * x.getTimezoneOffset());
        let changedTime = moment.parseZone(myNewDate).format('hh:mm A');
        this.time_store.push({changedTime: value})
        return changedTime;
    }

    // ======================================

    // Helper functions used to create cards.

    // ======================================

    attachment_cards(ind){
        var attachment = []
        if (ind === 2)
        {
            for (let i=0; i<booking.length; i++){
                    attachment.push(this.createHeroCard1(booking, i))
            }
        }
        else if (ind === 3)
        {
            for (let i=0; i<booking.length; i++){
                attachment.push(this.createHeroCard2(booking, i))
        }
        }
        else
        {
            for (let i=0; i<booking.length; i++){
            attachment.push(this.createHeroCard(booking, i))
            }
        }
        return attachment  
    }

    createHeroCard(booking, i) {
        return CardFactory.heroCard(
            booking[i].name,
            CardFactory.images(['htg']),
            CardFactory.actions([
                {
                    type: 'imBack',
                    title: 'Book Now',
                    value: 'You chose: '+(i+1)
                }
            ]),
            {text: booking[i].geo_location_addr+"\n    Rating: "+booking[i].rating+"("+booking[i].user_rating_count+") "+"\n"+"            $"+booking[i].price},
        );
    }
    createHeroCard1(booking, i) {
        return CardFactory.heroCard(
            booking[i].test_name,
            CardFactory.images(['htg']),
            CardFactory.actions([
                {
                    type: 'imBack',
                    title: 'Re-schedule',
                    value: 'Booking #'+booking[i].order_id+ ' rescheduling'
                }
            ]),
            {text: "Id: #"+booking[i].order_id},
        );
    }

    createHeroCard2(booking, i) {
        return CardFactory.heroCard(
            booking[i].test_name,
            CardFactory.images(['htg']),
            CardFactory.actions([
                {
                    type: 'imBack',
                    title: 'Cancel',
                    value: 'Booking #'+booking[i].order_id+ ' cancelling'
                }
            ]),
            {text: "Id: #"+booking[i].order_id},
        );
    }
}

module.exports.MainDialog = MainDialog;