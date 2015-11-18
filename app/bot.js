var _ = require('underscore'),
    irc = require('irc'),
    config = require('../config/config'),
    client,
    commands = [],
    msgs = [];

function checkUserMode(message, mode) {
    return true;
}

/**
 * Initialize the bot
 */
exports.init = function () {
    console.log('Initializing...');
    // init irc client
    console.log('Connecting to ' + config.server + ' as ' + config.nick + '...');
    client = new irc.Client(config.server, config.nick, config.clientOptions);

    // handle connection to server for logging
    client.addListener('registered', function (message) {
        console.log('Connected to server ' + message.server);
        // Send connect commands after joining a server
        if (typeof config.connectCommands !== 'undefined' && config.connectCommands.length > 0) {
            _.each(config.connectCommands, function (cmd) {
                if(cmd.target && cmd.message) {
                    client.say(cmd.target, cmd.message);
                }
            });
        }
    });

    // handle joins to channels for logging
    client.addListener('join', function (channel, nick, message) {
        // Send join command after joining a channel
        if (config.nick === nick) {
            console.log('Joined ' + channel + ' as ' + nick);
            if (typeof config.joinCommands !== 'undefined' &&config.joinCommands.hasOwnProperty(channel) && config.joinCommands[channel].length > 0) {
                _.each(config.joinCommands[channel], function (cmd) {
                    if(cmd.target && cmd.message) {
                        message = _.template(cmd.message)
                        client.say(cmd.target, message({nick: nick, channel: channel}));
                    }
                });
            }
        }
        else if (typeof config.userJoinCommands !== 'undefined' && config.userJoinCommands.hasOwnProperty(channel) && config.userJoinCommands[channel].length > 0) {
            console.log("User '" + nick + "' joined " + channel);
            _.each(config.userJoinCommands[channel], function (cmd) {
                if(cmd.target && cmd.message) {
                    message = _.template(cmd.message)
                    client.say(cmd.target, message({nick: nick, channel: channel}));
                }
            });
        }
    });

    // output errors
    client.addListener('error', function (message) {
        console.warn('IRC client error: ', message);
    });

    client.addListener('message', function (from, to, text, message) {
        console.log('message from ' + from + ' to ' + to + ': ' + text);
        // parse command
        var cmdArr = text.match(/^[\.|!]([^\s]+)\s?(.*)$/);
        if (!cmdArr || cmdArr.length <= 1) {
            // command not found
            return false;
        }
        var cmd = cmdArr[1];
        // parse arguments
        var cmdArgs = [];
        if (cmdArr.length > 2) {
            cmdArgs = _.map(cmdArr[2].match(/([^\s]+)\s?/gi), function (str) {
                return str.trim();
            });
        }
        // build callback options

        if (config.clientOptions.channels.indexOf(to) >= 0) {
            // public commands
            _.each(commands, function (c) {
                if (cmd === c.cmd) {
                    console.log('command: ' + c.cmd);
                    // check user mode
                    if (checkUserMode(message, c.mode)) {
                        c.callback(client, message, cmdArgs);
                    }
                }
            }, this);
        } else if (config.nick === to) {
            // private message commands
            _.each(msgs, function (c) {
                if (cmd === c.cmd) {
                    console.log('command: ' + c.cmd);
                    // check user mode
                    if (checkUserMode(message, c.mode)) {
                        c.callback(client, message, cmdArgs);
                    }
                }
            }, this);
        }
    });

    // don't die on uncaught errors
    if (typeof config.exitOnError !== "undefined" && config.exitOnError === false) {
        process.on('uncaughtException', function (err) {
            console.log('Caught exception: ' + err);
            console.log(err.stack);
            _.each(config.clientOptions.channels, function(channel) {
                client.say(channel, "WARNING: The bot has generated an unhandled error. Quirks may ensue.")
            });
        });
    }

};

/**
 * Add a public command to the bot
 * @param cmd Command keyword
 * @param mode User mode that is allowed
 * @param cb Callback function
 */
exports.cmd = function (cmd, mode, cb) {
    commands.push({
        cmd: cmd,
        mode: mode,
        callback: cb
    });
};

/**
 * Add a msg command to the bot
 * @param cmd Command keyword
 * @param mode User mode that is allowed
 * @param cb Callback function
 */
exports.msg = function (cmd, mode, cb) {
    msgs.push({
        cmd: cmd,
        mode: mode,
        callback: cb
    });
};

/**
 * Add an irc event listener to the bot
 * @param event Client event
 * @param cb Callback function
 */
exports.listen = function (event, cb) {
    client.addListener(event, function() {
        cb(client, arguments);
    });
};
