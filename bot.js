// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const Recognizers = require('@microsoft/recognizers-text-suite');
const { ActivityHandler, CardFactory } = require('botbuilder');
const { QnAMaker } = require('botbuilder-ai');
const request = require('request');
const MainDialog = require('./mainDialog')
const AdaptiveCard = require('./adaptiveCard.json');
const Joi = require('@hapi/joi');
const schema = Joi.object().keys({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().regex(/(?=^.{6,10}$)(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&amp;*()_+}{&quot;:;'?/&gt;.&lt;,])(?!.*\s).*$/),
    access_token: [Joi.string(), Joi.number()],
    birthyear: Joi.number().integer().min(1900).max(2013),
    email: Joi.string().email({ minDomainSegments: 2 }),
    number: Joi.number().integer().min(10000000).max(999999999999)
}).with('username','birthyear').without('password', 'access_token');

i = 0;
k = 0;

var display_data = {};
var master_data = {
    lat: 0,
    long: 0,
    master_id: "0",
    name: "0",
    radius: 250,
    state : "0"
};
var final_data = {
    booked_date: Date,
contact: String,
createdBy: String,
department: String,
master_id: String,
orderType: 0,
provider_id: String,
provider_name: String,
provider_type: 0,
search_id: String,
test_id: String,
user_id: String,
}

var flag = false; 
// The accessor names for the conversation flow and user profile state property accessors.

const CONVERSATION_FLOW_PROPERTY = 'CONVERSATION_FLOW_PROPERTY';

const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';

const question = {
    flag: 'test',

    register_flag: 'login_present',

    fname: 'rFirst_name',

    lname: 'rLast_Name',

    email: 'remailId',

    code: "rMobileCode",

    number: "rMobileno",

    dob: "rDOB",

    password: "rpassword",

    sign_up: "register_Sign_Up",

    otp: "OTP_Confirmation",

    name_test: 'testname',

    e_id: 'email.id',

    e_pass: 'Password',

    select_test: 'selectedtest',

    loc: 'loc',

    select_loc : 'selectedlocation',

    booking_date: 'selectedBooking_date',

    booking_time: 'selectedBooking_time',

    booking: 'final_booking',

    none: 'none'

};

class MyBot extends ActivityHandler {
    
    constructor(conversationState, userState, dialog, logger, configuration, qnaOptions) {
        super();

        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');       
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
        if (!logger) {

            logger = console;

            logger.log('[DialogBot]: logger not passed in, defaulting to console');

        }

        this.conversationFlow = conversationState.createProperty(CONVERSATION_FLOW_PROPERTY);
        this.userProfile = userState.createProperty(USER_PROFILE_PROPERTY);
        this.qnaMaker = new QnAMaker(configuration, qnaOptions);
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.logger = logger;
        this.dialogState = this.conversationState.createProperty('DialogState');
       
        this.onMessage(async(TurnContext, next) => {
            const flow = await this.conversationFlow.get(TurnContext, { lastQuestionAsked: question.none });

            const profile = await this.userProfile.get(TurnContext, {});

            const qnaResults = await this.qnaMaker.getAnswers(TurnContext);



            await MyBot.fillOutUserProfile(flow, profile, qnaResults, TurnContext, this.dialog, this.dialogState);



            // By calling next() you ensure that the next BotHandler is run.

            await next();

        });
        this.onDialog(async (context, next) => {

            // Save any state changes. The load happened during the execution of the Dialog.

            await this.conversationState.saveChanges(context, false);

            await this.userState.saveChanges(context, false);



            // By calling next() you ensure that the next BotHandler is run.

            await next();

        });
    }    
        // Manages the conversation flow for filling out the user's profile.

    static async fillOutUserProfile(flow, profile, qnaResults, turnContext, dialog, dialogState) {

        const input = turnContext.activity.text;

        let result

        switch (flow.lastQuestionAsked) {

            case question.none:
                if (flag == false|| input.toUpperCase() =="Hi".toUpperCase()||input.toUpperCase() == "Hello".toUpperCase()||input.toUpperCase() == 'Hey'.toUpperCase()){
                    await turnContext.sendActivity("Hello. Welcome to Zeamed");
                    await turnContext.sendActivity("Do you want to schedule a test?");
                    flow.lastQuestionAsked = question.flag;
                }
                else{
                    if (qnaResults[0]) {
                        await turnContext.sendActivity(`${ qnaResults[0].answer}`);
                    } 
                    else { 
                        // If no answers were returned from QnA Maker, reply with help.
                            await turnContext.sendActivity("No QnA Maker response was returned.");
                    }
                }
                break;

            case question.flag:
                result = this.validateFlag(input);
                if (result.success) {
                    profile.flag = result.flag;
                    await turnContext.sendActivity('Do you have a Zeamed account?');
                    flow.lastQuestionAsked = question.register_flag;
                    break;

                } else {

                    await turnContext.sendActivity(`${result.message}`);
                    await turnContext.sendActivity(`You can ask me questions`);
                    await turnContext.sendActivity(`Or say hi to schedule a test`);
                    flag = true
                    flow.lastQuestionAsked = question.none
                    break;

                }
            case question.register_flag:
                result = this.validateRegisterFlag(input);
                if (result.success) {

                    profile.flag = result.flag;
                    //console.log (profile.name_test)
                    if (result.flag.toUpperCase() === 'yes'.toUpperCase()){
                        await turnContext.sendActivity('Enter your email ID')
                        flow.lastQuestionAsked = question.e_id
                        break;
                    }
                    else{
                        await turnContext.sendActivity('Enter your first name');
                    }

                    flow.lastQuestionAsked = question.fname;

                    break;

                } else {

                    await turnContext.sendActivity(`${result.message}`);
                    break;

                }
            
            case question.fname:
                try{
                    result = await Joi.validate({ username: input, birthyear: 1994 }, schema);
                    profile.fname = input
                    await turnContext.sendActivity('Enter your last name')
                    flow.lastQuestionAsked = question.lname;
                    break;
                }catch  {
                    await turnContext.sendActivity('Enter a name at least 4 characters long')
                    flow.lastQuestionAsked = question.fname
                    break;
            }
                

            case question.lname:
                profile.lname = input
                //console.log("in q.l")
                await turnContext.sendActivity('Enter your email')
                flow.lastQuestionAsked = question.email;
                break;
            
            case question.email:
                try
                {
                    result = await Joi.validate({ username: profile.fname, birthyear: 1994, email: input}, schema);
                    profile.e_id = input
                    await turnContext.sendActivity('Enter the password you want to set')
                    flow.lastQuestionAsked = question.password;
                    break;
                }catch{
                    await turnContext.sendActivity('Enter a valid email')
                    break;
                }

            case question.password:
                try
                {
                    result = await Joi.validate({ username: profile.fname, birthyear: 1994, password: input}, schema);
                    profile.e_pass = input
                    await turnContext.sendActivity('Enter your mobile number')
                    flow.lastQuestionAsked = question.number;
                    break;
                }catch{
                    await turnContext.sendActivity('Enter a valid password with 1 Capital, 1 Small, 1 Numeric and 1 Symbol')
                    break;
                }

            case question.number:
                try
                    {
                        result = await Joi.validate({ username: profile.fname, birthyear: 1994, number: input}, schema);
                        profile.number = input
                        await dialog.run(turnContext, dialogState);
                        flow.lastQuestionAsked = question.code;
                        break;
                }catch {
                    await turnContext.sendActivity('Enter a valid mobile number') 
                    break;
                }

            case question.code:
                profile.code = input
                profile.code = profile.code.substring(5,8)
                profile.fullnumber = profile.code+profile.number
                await turnContext.sendActivity('Enter your year of birth')
                flow.lastQuestionAsked = question.sign_up;
                break;
            
            case question.sign_up:
                try
                {
                    result = await Joi.validate({ username: profile.fname, birthyear: input}, schema);
                    profile.dob = input
                    result = await this.validateRegister(profile);
                    if (result.success) {
                        profile.otp_token = result.reg
                        await turnContext.sendActivity('Enter the OTP sent to your mobile and email');
                        flow.lastQuestionAsked = question.otp
                        break;

                    } else {
                        await turnContext.sendActivity(`${result.message}`);
                        await turnContext.sendActivity('Try again');
                        await turnContext.sendActivity('Enter your first name');
                        flow.lastQuestionAsked = question.fname
                        break;
                    }
                }catch{
                    await turnContext.sendActivity('Enter a valid year')
                    break;
                }
            
            case question.otp:
                    result = await this.validateOTP(input, profile.otp_token);
                    console.log(result)
                    if (result.success) {
                        await turnContext.sendActivity('Enter your password to schedule the test');
                        flow.lastQuestionAsked = question.e_pass
                        break;

                    } else {
                        await turnContext.sendActivity(`${result.message}`);
                        await turnContext.sendActivity('Enter a valid OTP');
                        flow.lastQuestionAsked = question.otp
                        break;
                    }
 
            case question.e_id:
                result = input
                profile.e_id = result
                await turnContext.sendActivity('Enter your password');
                flow.lastQuestionAsked = question.e_pass;
                break;
           
            case question.e_pass:
                result = await this.validateLogin(input, profile.e_id);
                if (result.success) {
                    final_data.user_id = result.loc.response.id
                    profile.token = result.loc.response.token
                    //console.log (profile.name_test)
                    display_data.fname = result.loc.response.fname
                    display_data.lname = result.loc.response.lname 
                    //await turnContext.sendActivity(`You chose ${profile.name_test}`);
                    await turnContext.sendActivity('Enter the test you want to schedule');



                    flow.lastQuestionAsked = question.name_test;

                    break;

                } else {

                    // If we couldn't interpret their input, ask them for it again.
                    await turnContext.sendActivity(`${result.message}`);
                    await turnContext.sendActivity(`Please try again`);
                    await turnContext.sendActivity(`Enter your Email id`);
                    
                    // Don't update the conversation flag, so that we repeat this step.
                    flag = true
                    flow.lastQuestionAsked = question.e_id
                    break;

                }

            case question.name_test:
                result = await this.validateName(input);
                if (result.success) {

                    profile.name_test = result.text;
                    //console.log (profile.select_test)
                    
                    
                    //var testData = resolve.response;
                    i = profile.name_test.length
                    for (let j = 0; j < i; j++) {
                        //console.log(j+1)
                        await turnContext.sendActivity(`-${j+1}. ${profile.name_test[j].test_name}`);
                    }
                    await turnContext.sendActivity(`Enter your choice`);
                    
                    flow.lastQuestionAsked = question.select_test;
                    //console.log("inside the name-test after updating question")

                    break;

                } else {

                    // If we couldn't interpret their input, ask them for it again.

                    // Don't update the conversation flag, so that we repeat this step.

                    await turnContext.sendActivity(result.message);
                    await turnContext.sendActivity('Check the spelling or try entering a different test');
                    break;

                }
            
            case question.select_test:
                result = this.validateSelect_test(input);
                if (result.success) {
                    //console.log("inside the select-test before updating question")

                    profile.test_no = result.test_no;
                    master_data.name = profile.name_test[(profile.test_no)].test_name
                    master_data.master_id = profile.name_test[(profile.test_no)]._id
                    display_data.test_name = profile.name_test[(profile.test_no)].test_name
                    await turnContext.sendActivity(`You chose: ${profile.name_test[(profile.test_no)].test_name}.`);                  
                    await turnContext.sendActivity(`Enter the location you can take the test in`);
                    await turnContext.sendActivity(`(city and state)`);

                    flow.lastQuestionAsked = question.loc;

                    break;

                } else {

                    // If we couldn't interpret their input, ask them for it again.

                    // Don't update the conversation flag, so that we repeat this step.

                    await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                    //await turnContext.sendActivity("Try selecting an option mentioned above");

                    break;

                }

            case question.loc:
                result = await this.validateLoc(input);

                if (result.success) {

                    profile.loc = result.loc;
                    k = profile.loc.length
                    for (let j = 0; j < k; j++) {
                        //console.log(j+1)
                        await turnContext.sendActivity(`-${j+1}. ${profile.loc[j].description}`);
                    }

                    await turnContext.sendActivity(`Enter the location option`);

                    flow.lastQuestionAsked = question.select_loc;

                    break;

                } else {

                    // If we couldn't interpret their input, ask them for it again.

                    // Don't update the conversation flag, so that we repeat this step.

                    await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                    await turnContext.sendActivity("Please try entering a different closer location");

                    break;

                }  
            
            case question.select_loc:
                result = await this.validateSelect_loc(input, profile.loc);                  
                if (result.success) {
                profile.booking = result.booking;
                final_data.contact = profile.name_test
                await dialog.run(turnContext, dialogState, profile.booking);
                flow.lastQuestionAsked = question.booking_date;
                break;

                }else {

                // If we couldn't interpret their input, ask them for it again.

                // Don't update the conversation flag, so that we repeat this step.

                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                await turnContext.sendActivity("Try selecting another option mentioned above");
                break;

                }

            case question.booking_date:
                result = await this.validateChoice(turnContext.activity.text[11], profile.booking);

                if (result.success) {
                profile.date = result.date
                //console.log("inside the select-test before updating question")
                //console.log (profile.date)
                //await turnContext.sendActivity("Choose the Dates");
                await dialog.run(turnContext, dialogState, profile.date);
                
                //await dialog.run(turnContext, dialogState);
                flow.lastQuestionAsked = question.booking_time;

                break;

                } else {

                // If we couldn't interpret their input, ask them for it again.

                // Don't update the conversation flag, so that we repeat this step.

                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                await turnContext.sendActivity("Choose a booking from the displayed cards");
                await dialog.run(turnContext, dialogState, profile.booking);
                break;

                }
            
            case question.booking_time:
                result = await this.validateDate(turnContext.activity.text, profile.date);

                if (result.success) {
                profile.index = result.index
                //console.log("inside the select-test before updating question")
                //console.log (profile.date)
                //await turnContext.sendActivity("Choose the Dates");
                await dialog.run(turnContext, dialogState, profile.date, profile.index);
                
                //await dialog.run(turnContext, dialogState);
                //console.log(profile.date.response[0].timings)
                flow.lastQuestionAsked = question.booking;

                break;

                } else {

                // If we couldn't interpret their input, ask them for it again.

                // Don't update the conversation flag, so that we repeat this step.

                //await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                await turnContext.sendActivity("Choose the date from the cards mentioned below");
                await dialog.run(turnContext, dialogState, profile.date);
                break;

                }

            case question.booking:
                result = await this.validateTime(turnContext.activity.text, profile.date.response[profile.index], profile.token);
                if (result.success) {
                profile.final_booking = result.booking
                //console.log("inside the select-test before updating question")
                //console.log (profile.date)
                //await turnContext.sendActivity("Choose the Dates");
                //console.log(profile.date)
                await turnContext.sendActivity(`${profile.final_booking.message}`);
                //console.log(profile.date)
                AdaptiveCard.body[1].text = "Provider: "+display_data.provider
                AdaptiveCard.body[2].text = "Patient: "+display_data.fname+ " "+ display_data.lname
                AdaptiveCard.body[3].text = "Test/Procedure: "+ display_data.test_name
                AdaptiveCard.body[4].text = "Duration: "+ display_data.duration
                AdaptiveCard.body[5].text = "Booking Date: "+ display_data.datestring
                AdaptiveCard.body[6].text = "Booking Time: "+ display_data.time
                AdaptiveCard.body[7].text = "Price: $"+ display_data.price+".00"
                await turnContext.sendActivity({attachments: [CardFactory.adaptiveCard(AdaptiveCard)]});
                //console.log('in ques.booking')
                flow.lastQuestionAsked = question.none;
                //console.log("After")
                flag = true

                break;

                } else {

                // If we couldn't interpret their input, ask them for it again.

                // Don't update the conversation flag, so that we repeat this step.

                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                flow.lastQuestionAsked = question.none
                flag = true
                break;

                }


        }

    };

    static validateFlag(input) {

        const flag = input


        return flag.toUpperCase() === "yes".toUpperCase()

            ? { success: true, flag: flag }

            : { success: false, message: 'Okay' };



    };

    static validateRegisterFlag(input) {

        const flag = input


        return flag.toUpperCase() == 'yes'.toUpperCase() ||flag.toUpperCase() == 'No'.toUpperCase()

            ? { success: true, flag: flag }

            : { success: false, message: 'Enter yes or no' };



    };    

    static validateRegister(profile){
        
        //var log = pass
        return new Promise (async(resolve, reject)=>{
        profile.dob = parseInt(profile.dob, 10)
        var register = {
            confirmPassword: "",
            countryCode: profile.code,
            email: profile.e_id,
            final_no: profile.fullnumber,
            fname: profile.fname,
            lname: profile.lname,
            mobile: profile.number,
            password: profile.e_pass,
            yob: profile.dob
        }
        //console.log(register)
        var testData = await getData("https://api.zeamed.com:1002/BackEnd/userSignup",register)

        async function getData(text, login) {
                        try {
                            //console.log(text)
            
                            return new Promise((resolve, reject) => {
                                request.post(text,{
                            json: register } , (err, response, body) => {
            
                                // console.log({ "response": response, "body": body, "err": err })
                                if (err) {
                                    console.log(err);
                                } else if (!response.statusCode == 200) {
                                    console.log(null);


                                } else {
                                    var localData = body;
                                    var testData2 = localData
                                    //console.log(localData)
                                    return resolve (testData2)
                                }       


                            })
                        })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }
        return resolve (testData !== undefined && testData.success == true

            ? { success: true, reg: testData.response }

            : { success: false, message: testData.message });  
        })
    
    };

    static validateOTP(input, token){
        
        //var log = pass
        return new Promise (async(resolve, reject)=>{

        var testData = await getData("https://api.zeamed.com:1002/BackEnd/otpVerification/"+input+"/"+token)

        async function getData(text) {
                        try {
                            //console.log(text)
            
                            return new Promise((resolve, reject) => {
                                request.get(text,  (err, response, body) => {
            
                                // console.log({ "response": response, "body": body, "err": err })
                                if (err) {
                                    console.log(err);
                                } else if (!response.statusCode == 200) {
                                    console.log(null);


                                } else {
                                    var localData = body;
                                    var testData2 = localData
                                    //console.log(localData)
                                    return resolve (testData2)
                                }       


                            })
                        })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }

        testData = JSON.parse(testData)
        return resolve (testData !== undefined && testData.success == true

            ? { success: true, reg: testData }

            : { success: false, message: testData.message });  
        })
    
    };

    static validateLogin(id, pass){
        
        var log = pass
        return new Promise (async(resolve, reject)=>{
        //console.log(loc, typeof(loc))
        var login = {
            email : 'a',
            password : 'a'
        }
        login.email = log
        login.password = id
        //console.log(login)
        var testData = await getData("https://api.zeamed.com:1002/BackEnd/userLogin",login)

        async function getData(text, login) {
                        try {
                            //console.log(text)
            
                            return new Promise((resolve, reject) => {
                                request.post(text,{
                            json: login } , (err, response, body) => {
            
                                // console.log({ "response": response, "body": body, "err": err })
                                if (err) {
                                    console.log(err);
                                } else if (!response.statusCode == 200) {
                                    console.log(null);


                                } else {
                                    var localData = body;
                                    var testData2 = localData
                                    return resolve (testData2)
                                    //console.log(localData)

                                }       


                            })
                        })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }
        
        return resolve (testData !== undefined && testData.success == true

            ? { success: true, loc: testData }

            : { success: false, message: 'Login Failed' });  
        })
    
    };

    static async validateName(input) {

        const flag = input
        return new Promise (async(resolve, reject)=>{
        //console.log("inside the conversion");
        //await TurnContext.sendActivity(`Enter the choice`);
        var text = flag
        var testData = await getData("https://api.zeamed.com:1002/BackEnd/testsLookupForUser/" + text)

        async function getData(text) {
                        try {
            
            
                            return new Promise((resolve, reject) => {
                                request.get(text, function(err, response, body) {
            
                                    // console.log({ "response": response, "body": body, "err": err })
                                    if (err) {
                                        console.log(err);
                                    } else if (!response.statusCode == 200) {
                                        console.log(null);
            
            
                                    } else {
                                        var localData = JSON.parse(body);            
                                        //console.log(localData);
                                        var testData = localData.response;
                                        return resolve(testData);
            
            
                                    }
            
                                })
                            })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }
                
                    
                return resolve (testData !== undefined && testData.length !== 0

            ? { success: true, text: testData }

            : { success: false, message: 'We do not have that test yet' });
                });
    };

    static validateSelect_test(input) {

        let output;
    
        try{
            input = input-1

                if (input > -1 && input < i) {

                        output = { success: true, test_no: input };
            
                }

            

            return output || { success: false, message: 'Please enter an option displayed above' };

        } catch (error) {
            console.log(error)
            return {

                success: false,

                message: "I'm sorry, I could not interpret that as an option."

            };

        }

    };

    static async validateLoc(input) {

        var loc = input
        return new Promise (async(resolve, reject)=>{
        //console.log(loc, typeof(loc))
        var testData = await getData("https://maps.googleapis.com/maps/api/place/autocomplete/json?location=34.799809,-87.677254&key=AIzaSyCK7OgifJMx6kQZAVw61fDZUr6IV9tjo_Y&types=(regions)&radius=5000&components=country:us&input="+loc)

        async function getData(text) {
                        try {
                            //console.log(text)
            
                            return new Promise((resolve, reject) => {
                                request.get(text, function(err, response, body) {
            
                                    // console.log({ "response": response, "body": body, "err": err })
                                    if (err) {
                                        console.log(err);
                                    } else if (!response.statusCode == 200) {
                                        console.log(null);
            
            
                                    } else {
                                        var localData = JSON.parse(body);
            
            
                                        //console.log(localData);
                                        // await TurnContext.sendActivity(`Enter the choice`);
                                        var testData = localData.predictions;
                                        return resolve (testData)
                                    }       
            
            
                                    })
                            })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }
        //console.log(testData)
        return resolve (testData !== undefined && testData.length !== 0

            ? { success: true, loc: testData }

            : { success: false, message: 'We do not provide services in that area yet' });  
        });      
    };

    static validateSelect_loc(input, location) {
        //console.log(location)
        let output;
    
        try{
            input = input-1

                if (input > -1 && input < k) {
                        output = { success: true, loc_no: input };
                }

        var loc = output.loc_no
        //console.log(location[loc].description)
        return new Promise (async(resolve, reject)=>{
        //console.log(loc, typeof(loc))
        var testData = await getData("https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyCK7OgifJMx6kQZAVw61fDZUr6IV9tjo_Y&address="+location[loc].description)

        async function getData(text) {
                        try {
                            //console.log(text)
            
                            return new Promise((resolve, reject) => {
                                request.get(text, function(err, response, body) {
            
                                    // console.log({ "response": response, "body": body, "err": err })
                                    if (err) {
                                        console.log(err);
                                    } else if (!response.statusCode == 200) {
                                        console.log(null);
            
            
                                    } else {
                                        var localData = JSON.parse(body);
            
            
                                        //console.log(localData);
                                        // await TurnContext.sendActivity(`Enter the choice`);
                                        var testData = localData.results;
                                        return resolve (testData)
                                    }       
            
            
                                    })
                            })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }

        //                 location_obj['state'] = item['short_name'];
        for (let i in testData[0].address_components) {
            let item = testData[0].address_components[i];
            if (item['types'].indexOf("administrative_area_level_1")> -1){
                master_data.state = item['short_name'];
            }
        }
        master_data.lat = testData[0].geometry.location.lat
        master_data.long =  testData[0].geometry.location.lng

        var testData2 = await getBookings()

        async function getBookings() {
        //console.log (master_data)
            try {
                
                return new Promise((resolve, reject) => {
                    request.post('https://api.zeamed.com:1002/BackEnd/geocheck',{
                            json: master_data } , (err, response, body) => {
            
                                // console.log({ "response": response, "body": body, "err": err })
                                if (err) {
                                    console.log(err);
                                } else if (!response.statusCode == 200) {
                                    console.log(null);


                                } else {
                                    var localData = body;
                                    var testData2 = localData
                                    return resolve (testData2)
                                    //console.log(localData)

                                }       


                            })
                        })
                    }catch (error) {
            console.log(error)
            return {

                success: false,

                message: "I'm sorry, I could not interpret that as an option."

            };

                    }
                }

                //console.log(testData2)
                final_data.search_id = testData2.search_id
                return resolve (testData2 !== undefined && testData2.response.booking_prov.length !== 0

                    ? { success: true, booking: testData2.response.booking_prov }

                    : { success: false, message: 'We do not have registered hopitals in that area yet' });      
        
            
            })
            }
            catch (error) {
                console.log(error)
                return {

                    success: false,

                    message: "Wrong Option"

                };
            }
    };

    static validateChoice(input, booking) {
        
        
        //var booking = booking
        //var choice = input
        //console.log(booking[input-1])
        var datetime = Date.now();
        //console.log(datetime);
        final_data.contact = booking[input-1].contact
        final_data.master_id = booking[input-1].master_id
        final_data.department = booking[input-1].department
        final_data.orderType = 0
        final_data.provider_id = booking[input-1]._id
        final_data.test_id = booking[input-1].test_id
        final_data.provider_name = booking[input-1].name
        final_data.provider_type = booking[input-1].provider_type
        display_data.duration = booking[input-1].duration
        display_data.price = booking[input-1].price
        var provider = booking[input-1]._id
        var test_id = booking[input-1].test_id
        return new Promise (async(resolve, reject)=>{
        //console.log(loc, typeof(loc))
        //console.log(login)
        var postData = {
            provider: provider,
            test_id: test_id,
            current_date: datetime
        }
        var testData = await getData("https://api.zeamed.com:1002/BackEnd/getAvailableSlots",postData)

        async function getData(text, login) {
                        try {
                            //console.log(text)
            
                            return new Promise((resolve, reject) => {
                                request.post(text,{
                            json: postData } , (err, response, body) => {
            
                                // console.log({ "response": response, "body": body, "err": err })
                                if (err) {
                                    console.log(err);
                                } else if (!response.statusCode == 200) {
                                    console.log(null);


                                } else {
                                    var localData = body;
                                    var testData2 = localData
                                    //console.log(localData)
                                    return resolve (testData2)
                                    

                                }       


                            })
                        })
                        } catch (error) {
                            console.log("err", error)
                        }
                    }
        //console.log(testData)
        return resolve (testData !== undefined && testData.success == true

            ? { success: true, date: testData }

            : { success: false, message: 'That choice does not exist' });  
        })
    
    };

    static validateDate(input, book) {

        let j = -1
        return new Promise (async(resolve, reject)=>{
            //console.log(book.response.length)
        for (let i=0; i< book.response.length; i++){
            //console.log(input)
            //console.log(book.response[i].dateString)
            if (book.response[i].dateString == input)
            {   
                j = i;}
        };
        


        return resolve (j !== -1

            ? { success: true, index: j }

            : { success: false, message: 'That date is not available'});

    });

    };

    static validateTime(input, date, token) {
        
        var d = date.timings[0]
        var d1 = d.substring(0,11)
        var d3 = d.substring(16,)

        //console.log(d1)
        //console.log(d3)
        var m,h;
        m = input.substring(2,5)
        if (input[6] =='P'&& input.substring(0,2) !== '12'){    
            h = input.substring(0,2)
            h= 12+(parseInt(h,10))
            h = h.toString()
            
        }
        else{
            h = input.substring(0,2)
        }
        var datestring = d1+h+m+d3
        //console.log(MainDialog.time_store)
        //console.log(datestring)
        //console.log(datestring)
        return new Promise (async(resolve, reject)=>{
            //console.log(loc, typeof(loc))
            //console.log(login)
            
            final_data.createdBy = final_data.user_id
            //console.log(final_data)
            display_data.provider = final_data.provider_name
            display_data.time = input
            display_data.datestring = date.dateString
            //console.log(display_data)
            var options = {
                url: 'https://api.zeamed.com:1002/User/booking',
                headers: {
                  'authorization': token
                },
                json: final_data
              };
            //console.log(oauth)
            final_data.booked_date = datestring;
            var testData = await getData(options)
    
            async function getData(options) {
                            try {
                                //console.log(text)
                
                                return new Promise((resolve, reject) => {
                                    request.post(options, (err, response, body) => {
                
                                    // console.log({ "response": response, "body": body, "err": err })
                                    if (err) {
                                        console.log(err);
                                    } else if (!response.statusCode == 200) {
                                        console.log(null);
    
    
                                    } else {
                                        var localData = body;
                                        var testData2 = localData
                                        //console.log(localData)
                                        return resolve (testData2)
                                        
    
                                    }       
    
    
                                })
                            })
                            } catch (error) {
                                console.log("err", error)
                            }
                        }
            //console.log(testData.booked_date)
            return resolve (testData !== undefined && testData.message !== undefined
    
                ? { success: true, booking: testData }
    
                : { success: false, message: testData.message });  
            })
        
    };    
}

    module.exports.MyBot = MyBot;