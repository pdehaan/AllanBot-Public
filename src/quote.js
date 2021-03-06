var log = require("npmlog");
var v = require('./globalVariables');
var f = require('./firebase');
var moment = require('moment-timezone');

function listener(api, message, input) {
    v.section = 'quote listener';
    if (input.slice(0, 11) == '--find all ') {
        v.continue = false;
        api.getThreadInfo(message.threadID, function callback(error, info) {
            if (error) return log.error('Count error', error);
            create(api, message, input.slice(11), info.messageCount);
        });
        return;
    }
    if (input.slice(0, 7) == '--find ') return create(api, message, input.slice(7), 1000);
    if (input.slice(0, 8) == '--quote ') return create(api, message, input.slice(8), 1000, true);
    if (input == '--quotes') return print(api, message);
    if (input == '--all quotes') return print(api, message, true);
    if (input == '--count') return countFunction(api, message);
}

function countFunction(api, message) {
    v.section = 'quote countFunction';
    v.continue = false;
    api.getThreadInfo(message.threadID, function callback(error, info) {
        if (error) return log.error('Count error', error);
        api.sendMessage('There are ' + info.messageCount + ' messages', message.threadID);
    });
}

function print(api, message, all) {
    v.section = 'quote print';
    v.continue = false;
    var quotes = f.get('threads/' + message.threadID + '/quotes');
    if (quotes) {
        var s = 'Quotes:';
        for (var c in quotes) {
            if (!all) {
                if (c.split('_')[1] != message.senderID) continue;
            }
            s += '\n\n' + quotes[c];
        }
        api.sendMessage(s, message.threadID);
    } else {
        api.sendMessage('No quotes found', message.threadID);
    }
}

function create(api, message, input, i, save) {
    v.section = 'quote create';
    input = input.trim().toLowerCase();
    v.continue = false;
    if (input.length == 0) return;
    var count = 0;
    log.info('finding', input, '...');
    setTimeout(function() {
        if (count == 0) api.sendMessage('Still looking for ' + input + '...', message.threadID);
    }, 5000);
    api.getThreadHistory(message.threadID, 1, i, null, function callback(error, history) {
        if (error) return log.error('Error in getting quote', error);
        for (var j = history.length - 2; j >= 0; j--) { //do not include last message
            if (!history[j].body) continue;
            if (v.contains(history[j].body, input)) {
                if (history[j].body.toLowerCase().slice(0, 1) == '@') {
                    if (v.contains(history[j].body, v.botNameL)) continue;
                    if (v.contains(history[j].body, '--')) continue;
                }
                if (v.contains(v.ignoreArray, history[j].senderID.split(':')[1])) continue;
                output(api, message, history[j], save);
                count++;
                if (save) return;
                if (count >= 5 && i == 1000) return;
                if (count >= 20) return; //add more if find all is used
            }
        }
        // if (i > 100) return;
        // create(api, message, input, save, i * 2);

        if (count == 0) {
            count = -1;
            api.sendMessage('Could not find text that contains ' + v.quotes(input) + ' within the last ' + history.length + ' messages.', message.threadID);
        }
        // if (i > 500) return;
        // create(api, message, input, i + 20);
    });
}

function output(api, message, text, save) {
    v.section = 'quote output';
    var tag = '-' + text.senderName + ' ' + moment(text.timestamp).format('MM/DD/YYYY');
    var s = text.body;
    if (!v.contains(text.body, tag)) s += '\n' + tag;
    api.sendMessage(s, message.threadID);
    if (save) f.setDataSimple('threads/' + message.threadID + '/quotes/' + Date.now() + '_' + message.senderID, s, null);
}

function context(api, threadID, key) {
    v.section = 'quote context';
    v.continue = false;
    var searching = true;
    setTimeout(function() {
        if (searching) api.sendMessage('Still finding context for ' + key + '...', threadID);
    }, 5000);
    api.getThreadHistory(threadID, 1, 1000, null, function callback(error, history) {
        if (error) return log.error('Error in getting quote', error);
        for (var j = history.length - 2; j >= 0; j--) { //do not include last message
            if (!history[j].body) continue;
            if (!searching) break;
            if (v.contains(history[j].body, key) && !v.contains(history[j].body, v.botName) && !v.contains(history[j].body, "@" + key) && !v.contains(history[j].senderID, v.botID)) {
                searching = false;
                var result = 'Context for ' + key;
                var lastID = 0;
                var contextRange = 5;
                for (var k = j - contextRange; k <= j + contextRange; k++) {
                    if (k < 0) continue;
                    if (k > history.length - 1) continue;
                    if (!history[k].body) continue;
                    result += '\n';
                    if (lastID != history[k].senderID) {
                        result += '\n' + history[k].senderName + ': ';
                        lastID = history[k].senderID;
                    }
                    result += history[k].body;
                }
                api.sendMessage(result, threadID);
            }

        }


        if (searching) {
            searching = false;
            api.sendMessage('Could not find ' + key + ' within the last ' + history.length + ' messages.', threadID);
        }

    });
}

module.exports = {
    create: create,
    listener: listener,
    print: print,
    context: context
}
