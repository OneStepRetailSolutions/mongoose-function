const mongoose = require("mongoose");
require("mongoose-function")(mongoose, {
    toFunction: toFunction,
    isLocalFunction: isLocalFunction,
});

//Test to see if original arg or "function string" should be stored in database
function isLocalFunction(arg) {
    //Two options here given our local function schema setup
    // 1: "<field>:source:<path>:<functionName>" - this function would have to detect this and return true to store the arg string in the database
    // 2: "<field>:source:<path>:<functionName>:true/false" - the final value being true would cause the arg to be kept, false would force the loaded function into the db.

    if (typeof arg == "string") {
        let functionalArray = arg.split(":");

        if (functionalArray && functionalArray.length >= 4) {
            if (functionalArray.length >= 5) {
                return functionalArray[4].toLowerCase() == "true" ? true : false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
}

//new toFunction
// Basically mirrors existing non-custom toFunction.
// Supports new embedded reference to a local function. Could be done differently,
// but this is our implementation.
function toFunction(arg) {
    ("use strict");

    arg = arg.trim();

    // zero length strings are considered null instead of Error
    if (0 == arg.length) return null;

    let functionalArray = arg.split(":");

    //If it has our special delimiters <field>:source:<sourceFile>:<functionName>
    if (functionalArray && functionalArray.length > 1 && functionalArray[1].toLowerCase() == "source") {
        //Then Go Get Source locally
        //In this case the first element is ignored
        //this option uses a defined source file to require.
        let sourceCode = functionalArray[2];
        let replaceCode = functionalArray[3];
        let fn = undefined;
        //if sourceCode == '.' then assume the function is local
        if (sourceCode == ".") {
            fn = global[replaceCode];
        } else {
            //require load of sourceCode. Assumes it exports all the functions that might be run from this eval.
            const replaceFunctions = require(`${__dirname}/${sourceCode}`);
            fn = replaceFunctions[replaceCode];
        }
        if (typeof fn === "function") {
            return fn;
        } else {
            throw error(arg);
        }
    }
    //existing functionality
    // must start with "function"
    else if (!/^function\s*[^\(]*\(/.test(arg)) {
        throw error(arg);
    }

    // trim string to function only
    //   brought local and renamed to trimStringFunctionToJustFunction
    //   this is inside "mongoose-function/lib/type.js"
    //   Made to support existing functionality in custom toFunction.
    arg = trimStringFunctionToJustFunction(arg);

    let func = eval("(" + arg + ")");
    return func;
}

//The following is mongoose-function/libs/type.js "trim" function.
//  Renamed to keep from confusing anyone...
function trimStringFunctionToJustFunction(arg) {
    var match = arg.match(/^function\s*[^\(]*\([^\)]*\)\s*{/);
    if (!match) throw error(arg);

    // we included the first "{" in our match
    var open = 1;

    for (var i = match[0].length; i < arg.length; ++i) {
        switch (arg[i]) {
            case "{":
                open++;
                break;
            case "}":
                open--;
                if (open === 0) {
                    // stop at first valid close of function
                    return arg.substring(0, i + 1);
                }
        }
    }
    throw error(arg);
}

//"Global" function for allowed reference in mongoose-function
global.setNumeric = function setNumeric(key, keyName, val, config, obj, objkey, objvalue, rootobj) {
    console.log("breakpoint");
    return "test setNumeric";
};

//The example
mongoose.connection.on("disconnected", () => {
    console.log("Disconnected from Database");
});

mongoose.connection.on("error", (err) => {
    console.log(`mongoose connection error: ${err}`);
});

//Create the schema
let theSchema = new mongoose.Schema(
    {
        name: String,
        function1: Function,
        function2: Function,
        function3: Function,
        function4: Function,
    },
    { strict: false }
);

//Instantiate model.
theSchemaModel = mongoose.model("theSchemaModel", theSchema, "theSchema");

//Example run.
async function doIt() {
    //connect to Mongo and start up Mongoose.
    await mongoose.connect("mongodb://127.0.0.1:27017/test");

    //Use the model to create a record with each style of "Function"
    let saved = await theSchemaModel.create({
        name: "Test1",
        function1: "function(){return 'test1'}",
        function2: function () {
            return "test2";
        },
        function3: "Weight:source:.:setNumeric", //global func (pre-defined)
        function4: "Weight:source:./functionStorage.js:theFunc", //sourced locally (pre-defined)
    });

    //Use the model to GET the record
    let loaded = await theSchemaModel.findOne({ _id: saved._id });

    //Show the record to the outside world.
    console.log(JSON.stringify(loaded));

    //Run the loaded record functions.
    console.log(`function1 output: ${loaded.function1()}`);
    console.log(`function2 output: ${loaded.function2()}`);
    console.log(`function3 output: ${loaded.function3()}`);
    console.log(`function4 output: ${loaded.function4()}`);
}

//Run it.
doIt();
