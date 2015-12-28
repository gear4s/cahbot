// import modules
var      _ = require('underscore'),
      util = require('util'),
    moment = require('moment'),
         c = require('irc-colors'),
      Game = require('./game'),
    Player = require('../models/player'),
    config = require('../../config/config'),
         p = config.commandPrefixChars[0];

var Games = function Games() {
    var self = this;
    self.games = [];

    /**
     * Find a game by channel it is running on
     * @param [channel]
     * @returns {*}
     */
    self.findGame = function (channel) {
        if (channel)
            return _.findWhere(self.games, {channel: channel});
        return _.find(self.games, function(game) { return (game.channel); });
    };

    /**
     * Get the command data associated with 'alias'
     * @param alias
     */
    self.findCommand = function(alias) {
        return _.find(config.commands, function(command) { return (_.contains(command.commands, alias)); });
    };

    /**
     * Say there's no game running
     * @param client
     * @param channel
     */
    self.sayNoGame = function (client, channel) {
        client.say(channel, util.format('No game running. Start the game by typing %sstart.', p));
    };

    /**
     * Start a game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.start = function (client, message, cmdArgs) {
        // check if game running on the channel
        var  channel = message.args[0],
                nick = message.nick,
                user = message.user,
            hostname = message.host,
                game;

        game = self.findGame(channel);
        if (typeof game !== 'undefined') {
            // game exists
            if (game.getPlayer({nick: nick})) {
                client.say(channel, 'You are already in the current game.');
            } else {
                client.say(channel, util.format('A game is already running. Type %sjoin to join the game.', p));
            }
        } else {
            // init game
            game = new Game(channel, client, config, cmdArgs);
            self.games.push(game);
            self.join(client, message, cmdArgs);
        }

    };

    /**
     * Stop a game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.stop = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.stop(game.getPlayer({user: user, hostname: hostname}));
            self.games = _.without(self.games, game);
        }
    };

    /**
     * Pause a game
     * @param client
     * @param message
     * @param cmdArgs
     */
     self.pause = function(client, message, cmdArgs) {
         var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.pause();
        }
     };

    /**
     * Resume a game
     * @param client
     * @param message
     * @param cmdArgs
     */
     self.resume = function(client, message, cmdArgs) {
         var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.resume();
        }
     };

    /**
     * Add player to game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.join = function (client, message, cmdArgs) {
        var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);

        if (typeof game === 'undefined') {
            if (config.startOnFirstJoin === false) {
                self.sayNoGame(client, channel);
            } else {
                self.start(client, message, cmdArgs);
            }
        } else {
            var player = new Player(nick, user, hostname);
            game.addPlayer(player);
        }
    };

    /**
     * Remove player from game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.quit = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.removePlayer(game.getPlayer({user: user, hostname: hostname}));
        }
    };

    /**
     * Remove a player
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.remove = function (client, message, cmdArgs) {
        var channel = message.args[0],
            game = self.findGame(channel),
            target = cmdArgs[0];
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            var player = game.getPlayer({nick: target});
            if (typeof(player) === 'undefined') {
                client.say(channel, target + ' is not currently playing.');
            } else {
                game.removed.push(game.getPlayerUhost(player));
                game.removePlayer(player);
            }
        }
    };

    /**
     * Get players cards
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.cards = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            game.showCards(player);
        }
    };

    /**
     * Play cards
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.play = function (client, message, cmdArgs) {
        // check if everyone has played and end the round
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            if (typeof(player) !== 'undefined') {
                game.playCard(cmdArgs, player);
            }
        }
    };

    /**
     * Lisst players in the game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.list = function (client, message, cmdArgs) {
        var channel = message.args[0],
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.listPlayers();
        }
    };

    /**
     * Select the winner
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.winner = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            if (typeof(player) !== 'undefined') {
                game.selectWinner(cmdArgs[0], player);
            }
        }
    };

    /**
     * Show top players in current game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.points = function (client, message, cmdArgs) {
        var channel = message.args[0],
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.showPoints();
        }
    };

    /**
     * Show top players in current game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.status = function(client, message, cmdArgs) {
        var channel = message.args[0],
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            self.sayNoGame(client, channel);
        } else {
            game.showStatus();
        }
    };

    /**
     * Alias command for winner and play
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.pick = function (client, message, cmdArgs)
    {
        // check if everyone has played and end the round
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel),
            fastPick = false;
        if (config.enableFastPick) {
            fastPick = cmdArgs[1];
            if (fastPick === true) { cmdArgs = cmdArgs[0]; }
        }
        if (typeof game === 'undefined') {
            fastPick || self.sayNoGame(client, channel);
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});

            if (typeof(player) !== 'undefined') {
                if (game.state === Game.STATES.PLAYED) {
                    game.selectWinner(cmdArgs[0], player, fastPick);
                } else if (game.state === Game.STATES.PLAYABLE) {
                    game.playCard(cmdArgs, player, fastPick);
                } else {
                    fastPick || client.say(channel, util.format('%spick command not available in current state.', p));
                }
            }
        }
    };

    /**
     * Show game help
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.help = function(client, message, cmdArgs) {
        var help, channel = message.args[0];
        if (cmdArgs[0] === undefined) {
            // list commands and aliases
            var commands = _.map(config.commands, function(cmd) {
                                var result = p + cmd.commands[0];
                                if (cmd.commands.length > 1) {
                                    var aliases =  _.chain(cmd.commands)
                                                    .rest()
                                                    .map(function(a) { return p + a; })
                                                    .join(', ');
                                    result += util.format(' (%s)', aliases);
                                }
                                return result;
                            });
            help = 'Commands: ' + commands.join('; ') + util.format(' [%shelp <command> for details]', p);
        } else {
            // single command details
            var alias = cmdArgs[0].toLowerCase();
            var cmd = self.findCommand(alias);
            if (!cmd) {
                client.say(channel, util.format('No command "%s%s"', p, cmd));
                return;
            }
            help = p + cmd.commands[0];
            _.each(cmd.params, function(param) {
                var paramHelp = param.name;
                if (param.type === 'number')
                    paramHelp += 'Number';
                if (param.multiple)
                    paramHelp += ', ...';
                paramHelp = (param.required) ? util.format('<%s>', paramHelp)
                                             : util.format('[%s]', paramHelp);
                help += ' ' + paramHelp;
            });
            help += ' - ';
            if (cmd.flag && cmd.flag === 'o')
                help += '(op) ';
            help += cmd.info;
            if (cmd.commands.length > 1)
                help += util.format(' (aliases: %s)', _.chain(cmd.commands)
                                                        .rest()
                                                        .map(function(a) { return p + a; })
                                                        .join(', '));
        }
        client.say(channel, help);
    };

    /**
     * Send someone a NOTICE to help them test their client
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.test = function(client, message, cmdArgs) {
        var nick = message.nick;
        client.notice(nick, 'Can you hear me now?');
    };

    /**
     * Send beer
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.beer = function (client, message, cmdArgs)
    {
        var channel  = message.args[0],
            user     = message.user,
            hostname = message.host,
            game     = self.findGame(channel),
            nicks    = [ message.nick ];

        var beerNicks = [], beer = [], action = '', beerToBot = false,
            maxNicks  = _.min([config.beers.length, 7]);
            message = '';
        var actions = [
            'pours a tall, cold glass of <%= beer %> and slides it down the bar to <%= nick %>.',
            'cracks open a bottle of <%= beer %> for <%= nick %>.',
            'pours a refreshing pint of <%= beer %> for <%= nick %>',
            'slams a foamy stein of <%= beer %> down on the table for <%= nick %>'
        ];
        var plurals = {
            'tall, cold glasses': 'a tall, cold glass',
            'bottles':            'a bottle',
            'refreshing pints':   'a refreshing pint',
            'foamy steins':       'a foamy stein',
            'them':               'it'
        };
        var listToString = function(list) {
            var last = list.pop();
            return (list.length) ? list.join(', ') + ' and ' + last : last;
        };

        if (cmdArgs[0] == 'all' && game)
            nicks = game.getPlayerNicks();
        else if (cmdArgs.length)
            nicks = cmdArgs;

        if (_.isEqual(nicks, [ client.nick ])) {
            message = _.template('pours itself a tall, cold glass of <%= beer %>. cheers, <%= from %>!');
            client.action(channel, message({
                beer: _.sample(config.beers, 1)[0],
                from: message.nick,
                nick: client.nick
            }));
            return true;            
        }
        _.chain(nicks).uniq().each(function (nick) {
            if (client.nick == nick)
                beerToBot = true;
            else if (client.nickIsInChannel(nick, channel))
                beerNicks.push(nick);
        });
        if (beerNicks.length > maxNicks) {
            client.say(channel, "There's not enough beer!");
            return false;
        }
        if (beerNicks.length) {
            action = _.sample(actions, 1)[0];
            if (beerNicks.length > 1) {
                _.each(plurals, function(from, to) { // value, key
                    action = action.split(from).join(to);
                });
            }
            message = _.template(action);
            client.action(channel, message({
                beer: listToString(_.sample(config.beers, beerNicks.length)),
                nick: listToString(beerNicks)
            }));
        }
        if (beerToBot) // pour for self last
            self.beer(client, message, [ client.nick ]);
    };

    /**
     * List the card decks available
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.decks = function(client, message, cmdArgs) {
        var reply  = util.format('Card decks available (use %sdeckinfo for details): %s', p, config.decks.join(', '));
            reply += util.format('; default decks: %s', config.defaultDecks.join(', '));
        client.say(message.args[0], reply);
    };

    /**
     * Get information about a deck
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.deckinfo = function(client, message, cmdArgs) {
        var data, deckCode = cmdArgs[0], channel = message.args[0];

        if (!deckCode || !deckCode.match(/^\w{5}$/)) {
            client.say(channel, 'Invalid deck code format: ' + cmdArgs[0]);
            return false;
        }
        else {
            deckCode = deckCode.toUpperCase();
            if (!_.contains(config.decks, deckCode)) {
                client.say(channel, 'Deck ' + deckCode + ' is not enabled. If you really want it, yell about it.');
                return false;
            }
        }

        config.decksTool.fetchDeck(deckCode).then(function(data) {
            data.q = data.calls.length;
            data.a = data.responses.length;
            data = _.pick(data, 'name', 'description', 'created', 'author', 'q', 'a');
            data.url = 'https://www.cardcastgame.com/browse/deck/' + deckCode;
            if (typeof data.created === 'object')
                data.created = moment(data.created).format('YYYY-MM-DD');
            else if (typeof data.created == 'string')
                data.created = data.created.match(/^(\d{4}-\d{2}-\d{2})/)[1];
            var reply = util.format('%s: "%s" [%s/%s] by %s on %s (%s) - %s',
                            deckCode,    data.name, 
                            c.bold(data.q),
                                   data.a, 
                            data.author, data.created, 
                            data.url,    data.description.split('\n')[0]
                        ).substring(0, 400);
            client.say(channel, reply);
            return true;
        }, function(error) {
            if (error.name === 'NotFoundError')
                error.message = error.message.split('/').reverse()[0];
            util.log(error.name + ': ' + error.message);
            client.say(channel, 'Error ' + error.name + ': ' + error.message);
            return false;
        });
    };

};

exports = module.exports = Games;
