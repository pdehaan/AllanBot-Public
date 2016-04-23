var log = require("npmlog");
var v = require('./globalVariables');
var f = require('./firebase');
var translate = require('./translate');

function yesNoNickname(api, message) {
    if (message.body == '--nonickname' || message.body == '--nnickname') {
        changeNickname(api, message, false);
    } else if (message.body == '--yesnickname' || message.body == '--ynickname') {
        changeNickname(api, message, true);
    }
}

function changeNickname(api, message, t) {
    v.continue = false;
    if (t) { //restore nicknames
        try {
            if (v.sBase.nicknames[message.threadID]) {
                for (var n in v.sBase.nicknames[message.threadID]) {
                    api.changeNickname(v.sBase.nicknames[message.threadID][n], message.threadID, n, function callback(err) {
                        if (err) {
                            f.setDataSimple(v.f.Nick.child(message.threadID).child(n), null, null);
                            return console.log('changeNickname failed, removed nickname');
                        }
                    });
                }
            } else {
                api.sendMessage('No nicknames saved.', message.threadID);
            }
        } catch (err) {
            api.sendMessage('No nicknames saved.', message.threadID);
            return console.log(err);
        }
    } else { //remove nicknames
        api.getThreadInfo(message.threadID, function callback(err, info) {
            if (err) return console.error(err);
            log.info('info nick ' + info.nicknames.toString());
            for (var id in info.nicknames) {
                // console.log('id ' + id);
                f.setDataSimple(v.f.Nick.child(message.threadID).child(id), info.nicknames[id], null);
                api.changeNickname('', message.threadID, id, function callback(err) {
                    if (err) return console.error(err);
                });

            }
        });
    }
}

function changeNicknameBasic(api, message, input) {
    if (input.toLowerCase().slice(0, 8) != 'nickname') return;
    log.warn('c', input.charAt(8));
    if (input.charAt(8) == ':') {
        v.continue = false;
        api.changeNickname(input.slice(9).trim(), message.threadID, message.senderID, function callback(err) {
            if (err) return console.error(err);
        });
        return;
    }
    if (input.charAt(8) == '~') {
        v.continue = false;
        var name = input.slice(9).trim();
        var name2 = '';
        translate.translateRequest('auto', 'en', name, function callback(err1, en) {
            if (err1) return console.error(err1);
            name2 += en + '/';
            translate.translateRequest('auto', 'fr', name, function callback(err2, fr) {
                if (err2) return console.error(err2);
                name2 += fr + '/';
                translate.translateRequest('auto', 'zh-CN', name, function callback(err3, ch) {
                    if (err3) return console.error(err3);
                    name2 += ch;
                    api.changeNickname(name2, message.threadID, message.senderID, function callback(err) {
                        if (err) return console.error(err);
                    });
                });
            });
        });
    }

}

module.exports = {
    yesNoNickname: yesNoNickname,
    changeNickname: changeNickname,
    changeNicknameBasic: changeNicknameBasic
}