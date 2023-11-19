const mongoose = require("mongoose");
require("mongoose-function")(mongoose, {
    toFunction: function (arg) {
        ("use strict");

        arg = arg.trim();

        // zero length strings are considered null instead of Error
        if (0 == arg.length) return null;

        let functionalArray = arg.split(":");

        //If it has our special delimiters <field>:source:<sourceFile>:<functionName>
        if (functionalArray && functionalArray.length > 1 && functionalArray[1].toLowerCase() == "source") {
            //Then Go Get Source locally
            //In this case the first element is only the key
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
                //Don't run it. Just GET it.
                return fn;
                /*                try {
                    let result = fn(key, keyName, val, config, obj, objkey, objvalue, rootObj);
                    obj[objkey] = result;
                } catch (err) {
                    logger.error(
                        `mapping exception: ${err} - params: key: ${key}, keyName: ${keyName}, val: ${val}, obj: ${JSON.stringify(
                            obj
                        )}, objkey: ${objkey}, objvalue: ${objvalue}`
                    );
                }*/
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
        arg = trimStringFunctionToJustFunction(arg);

        let func = eval("(" + arg + ")");
        return func;
    },
});
//the following is mongoose-function/libs/type.js "trim" function renamed to keep from confusing us...
/**
 * Trim `arg` down to only the function
 */

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

const { format } = require("logform");
const util = require("util");

global.setNumeric = function setNumeric(key, keyName, val, config, obj, objkey, objvalue, rootobj) {
    return 'test setNumeric';
};

mongoose.connection.on("disconnected", () => {
    console.log("Disconnected from Database");
});

mongoose.connection.on("error", (err) => {
    console.log(`mongoose connection error: ${err}`);
});

mongoose.set("strictQuery", true);

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

theSchemaModel = mongoose.model("theSchemaModel", theSchema, "theSchema");

async function doIt() {
    await mongoose.connect("mongodb://127.0.0.1:27017/test");
    
    let saved = await theSchemaModel.create({
        name: "Test1",
        function1: "function(){return 'test1'} bla bla bla",
        function2: function () {
            return "test2";
        },
        function3: "Weight:source:.:setNumeric", //global func (pre-defined)
        function4: "Weight:source:./functionStorage.js:theFunc", //sourced locally (pre-defined)
    });

    let loaded = await theSchemaModel.findOne({ _id: saved._id });
    console.log(JSON.stringify(loaded));
    
    console.log(`function1 output: ${loaded.function1()}`);
    console.log(`function2 output: ${loaded.function2()}`);
    console.log(`function3 output: ${loaded.function3()}`);
    console.log(`function4 output: ${loaded.function4()}`);
}

doIt();
