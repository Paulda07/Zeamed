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

            //this.showCardStep.bind(this)

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

    async run(turnContext, accessor, book , ind = -1) {
           
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        booking = book
        index = ind
        const dialogContext = await dialogSet.createContext(turnContext);
        var yes = await dialogContext.beginDialog(this.id);
    }



    /**

     * 1. Prompts the user if the user is not in the middle of a dialog.

     * 2. Re-prompts the user when an invalid input is received.

     *

     * @param {WaterfallStepContext} stepContext

     */

    async choiceCardStep(stepContext) {
        //console.log("Entered choice cards")
        if (booking.response !== undefined){
            //console.log("Entered the first if cond")
            var options
            if (index == -1){
                
             //console.log("in here")
                    options = {

                        prompt: 'What is the date you want to book on?',
            
                        retryPrompt: 'That was not a valid choice, please select a card',
            
                        choices: this.getChoices(booking.response, index)
            
                    };
            
            }
            else
            { 
                //console.log("in time sec")
                options = {

                prompt: 'What is the time you want to take the test?',

                retryPrompt: 'That was not a valid choice, please select a card',

                choices: this.getChoices(booking.response, index)

                };
            }
                //console.log("Before the prompt")
                return await stepContext.prompt('cardPrompt', options);
        }
        
        else {
            if (booking === undefined){
                options = {

                    prompt: 'Enter your country code',
        
                    retryPrompt: 'That was not a valid choice, please select a card',
        
                    choices: ["IND (+91)", "USA (+1)"]
        
                };
                return await stepContext.prompt('cardPrompt', options);
            }
            else {
                return await stepContext.context.sendActivity({

                    attachments: this.attachment_cards(),

                    attachmentLayout: AttachmentLayoutTypes.Carousel

                });
            }
                
            }
        } 
    



    /**

     * Send a Rich Card response to the user based on their choice.

     * This method is only called when a valid prompt response is parsed from the user's response to the ChoicePrompt.

     * @param {WaterfallStepContext} stepContext

     */

    // async showCardStep(stepContext) {

    //     this.logger.log('MainDialog.showCardStep');



    //     switch (stepContext.result.value) {

    //         case 'Adaptive Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createAdaptiveCard()] });

    //             break;

    //         case 'Animation Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createAnimationCard()] });

    //             break;

    //         case 'Audio Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createAudioCard()] });

    //             break;

    //         case 'Hero Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createHeroCard()] });

    //             break;

    //         case 'Receipt Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createReceiptCard()] });

    //             break;

    //         case 'Signin Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createSignInCard()] });

    //             break;

    //         case 'Thumbnail Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createThumbnailCard()] });

    //             break;

    //         case 'Video Card':

    //             await stepContext.context.sendActivity({ attachments: [this.createVideoCard()] });

    //             break;

    //         default:

    //             await stepContext.context.sendActivity({

    //                 attachments: [

    //                     this.createAdaptiveCard(),

    //                     this.createAnimationCard(),

    //                     this.createAudioCard(),

    //                     this.createHeroCard(),

    //                     this.createReceiptCard(),

    //                     this.createSignInCard(),

    //                     this.createThumbnailCard(),

    //                     this.createVideoCard()

    //                 ],

    //                 attachmentLayout: AttachmentLayoutTypes.Carousel

    //             });

    //             break;

    //     }



    //     // Give the user instructions about what to do next

    //     await stepContext.context.sendActivity('Type anything to see another card.');



    //     return await stepContext.endDialog();

    // }



    /**

     * Create the choices with synonyms to render for the user during the ChoicePrompt.

     * (Indexes and upper/lower-case variants do not need to be added as synonyms)

     */

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

    attachment_cards(){
        var attachment = []
        for (let i=0; i<booking.length; i++){
            attachment.push(this.createHeroCard(booking, i))
        }
        return attachment  
    }

    // createAdaptiveCard() {

    //     return CardFactory.adaptiveCard(AdaptiveCard);

    // }



    // createAnimationCard() {

    //     return CardFactory.animationCard(

    //         'Microsoft Bot Framework',

    //         [

    //             { url: 'https://i.giphy.com/Ki55RUbOV5njy.gif' }

    //         ],

    //         [],

    //         {

    //             subtitle: 'Animation Card'

    //         }

    //     );

    // }



    // createAudioCard() {

    //     return CardFactory.audioCard(

    //         'I am your father',

    //         ['https://www.mediacollege.com/downloads/sound-effects/star-wars/darthvader/darthvader_yourfather.wav'],

    //         CardFactory.actions([

    //             {

    //                 type: 'openUrl',

    //                 title: 'Read more',

    //                 value: 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back'

    //             }

    //         ]),

    //         {

    //             subtitle: 'Star Wars: Episode V - The Empire Strikes Back',

    //             text: 'The Empire Strikes Back (also known as Star Wars: Episode V – The Empire Strikes Back) is a 1980 American epic space opera film directed by Irvin Kershner. Leigh Brackett and Lawrence Kasdan wrote the screenplay, with George Lucas writing the film\'s story and serving as executive producer. The second installment in the original Star Wars trilogy, it was produced by Gary Kurtz for Lucasfilm Ltd. and stars Mark Hamill, Harrison Ford, Carrie Fisher, Billy Dee Williams, Anthony Daniels, David Prowse, Kenny Baker, Peter Mayhew and Frank Oz.',

    //             image: 'https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg'

    //         }

    //     );

    // }



    createHeroCard(booking, i) {

        //console.log(booking)
        return CardFactory.heroCard(

            // {title:booking.name},
            // {text: booking.geo_location_addr},
            // {text: "Rating:"+booking.rating+" ("+booking.user_rating_count+") "},
            // {text: ''+booking.price+'$'},
            // {images: [' ']},
            //CardFactory.images(['']),
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

    

//     createReceiptCard() {

//         return CardFactory.receiptCard({

//             title: 'John Doe',

//             facts: [

//                 {

//                     key: 'Order Number',

//                     value: '1234'

//                 },

//                 {

//                     key: 'Payment Method',

//                     value: 'VISA 5555-****'

//                 }

//             ],

//             items: [

//                 {

//                     title: 'Data Transfer',

//                     price: '$38.45',

//                     quantity: 368,

//                     image: { url: 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png' }

//                 },

//                 {

//                     title: 'App Service',

//                     price: '$45.00',

//                     quantity: 720,

//                     image: { url: 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png' }

//                 }

//             ],

//             tax: '$7.50',

//             total: '$90.95',

//             buttons: CardFactory.actions([

//                 {

//                     type: 'openUrl',

//                     title: 'More information',

//                     value: 'https://azure.microsoft.com/en-us/pricing/details/bot-service/'

//                 }

//             ])

//         });

//     }



//     createSignInCard() {

//         return CardFactory.signinCard(

//             'BotFramework Sign in Card',

//             'https://login.microsoftonline.com',

//             'Sign in'

//         );

//     }



//     createThumbnailCard() {

//         return CardFactory.thumbnailCard(

//             'BotFramework Thumbnail Card',

//             [{ url: 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg' }],

//             [{

//                 type: 'openUrl',

//                 title: 'Get started',

//                 value: 'https://docs.microsoft.com/en-us/azure/bot-service/'

//             }],

//             {

//                 subtitle: 'Your bots — wherever your users are talking.',

//                 text: 'Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.'

//             }

//         );

//     }



//     createVideoCard() {

//         return CardFactory.videoCard(

//             '2018 Imagine Cup World Championship Intro',

//             [{ url: 'https://sec.ch9.ms/ch9/783d/d57287a5-185f-4df9-aa08-fcab699a783d/IC18WorldChampionshipIntro2.mp4' }],

//             [{

//                 type: 'openUrl',

//                 title: 'Lean More',

//                 value: 'https://channel9.msdn.com/Events/Imagine-Cup/World-Finals-2018/2018-Imagine-Cup-World-Championship-Intro'

//             }],

//             {

//                 subtitle: 'by Microsoft',

//                 text: 'Microsoft\'s Imagine Cup has empowered student developers around the world to create and innovate on the world stage for the past 16 years. These innovations will shape how we live, work and play.'

//             }

//         );

//     }

// }

}

module.exports.MainDialog = MainDialog;