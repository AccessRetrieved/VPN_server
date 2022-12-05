var express = require('express');
var application = express();
var server = require('http').createServer(application);
var io = require('socket.io')(server);
const process = require('process');
const NetworkSpeed = require('network-speed');
const testNetworkSpeed = new NetworkSpeed();
const prompt = require('prompt-sync')({
    history: require('prompt-sync-history')(),
    autocomplete: complete(['setLimit', 'exit']),
    sigint: true
});
const colors = require('colors');

async function getDownloadSpeed() {
    try {
        const url = "https://eu.httpbin.org/stream-bytes/500000"
        const bytes = 500000
        const speed = await testNetworkSpeed.checkDownloadSpeed(url, bytes);
        io.sockets.emit('ReturnPortDownload', { 'download': `${JSON.stringify(speed["mbps"])}` });
    } catch (err) {
        // console.log(`Couldn't retrieve download speed: ${err}`);
    }
};

async function getUploadSpeed() {
    try {
        const options = {
            hostname: "www.google.com",
            port: 80,
            path: '/catchers/544b09b4599c1d0200000289',
            method: 'POST',
            headers: {
                'Content-Type': "application/json",
            },
        };
    
        const size = 200000
        const speed = await testNetworkSpeed.checkUploadSpeed(options, size);
        io.sockets.emit('ReturnPortUpload', { 'upload': `${JSON.stringify(speed["mbps"])}` });
    } catch (err) {
        // console.log(`Couldn't retrieve upload speed: ${err}`);
    }
};

function complete(commands) {
    return function(str) {
        var i;
        var ret = [];
        for (i = 0; i < commands.length; i++) {
            if (commands[i].indexOf(str) == 0) {
                ret.push(commands[i]);
            }
        }

        return ret;
    }
};

function readJSON(file, variable) {
    let rawData = fs.readFileSync(file);
    let info = JSON.parse(rawData);
    return info[variable];
}

function log(type, content) {
    if (type == 'err') {
        console.log(`[!] ${content}`.red);
    } else if (type == 'info') {
        console.log(`[*] ${content}`.green);
    } else if (type == 'log') {
        console.log(`[#] ${content}`.cyan);
    }
}

const fs = require('fs');

connections = [];
var accessLimit = readJSON('info.json', 'usageLimit');
const file = 'info.json';

fs.watchFile(file, { interval: 1000 }, (curr, prev) => {
    log('info', `Changing limit to ${readJSON('info.json', 'usageLimit')}`);
    accessLimit = readJSON('info.json', 'usageLimit');
})

server.listen(process.env.PORT || 3000);
console.log('Starting server... Ready');
console.log(`Setting limit to ${accessLimit}... Done`)

io.sockets.on('connection', function(socket) {
    connections.push(socket);
    socket.on('disconnect', function(data) {
        connections.splice(connections.indexOf(socket), 1);
    });

    socket.on('NodeJS Server Port', function(data) {
        if (data == "requestSpeed") {
            try {
                getDownloadSpeed();
                getUploadSpeed();
            } catch (err) {

            };
        } else if (data == "requestLimit") {
            io.sockets.emit('ReturnPort', { 'content': `accessLimit:${accessLimit}` });
        } else if (data.includes("upgradeLimit-") == true) {
            accessLimit = accessLimit + Number(data.replace('upgradeLimit-', ''));
            io.sockets.emit('ReturnPort', { 'content': `accessLimit:${accessLimit}` });
            io.sockets.emit('ReturnPort', { 'content': 'restoreUsageProgress' });
            console.log(`Upgrading limit to ${accessLimit}`);

            let info = {
                usageLimit: accessLimit
            }
            let data = JSON.stringify(info)
            fs.writeFileSync('info.json', data);
        } else if (data.includes('currentUsage-') == true) {
            let usage = data.replace('currentUsage-', '');
            console.log(`Current Usage: ${usage}`);
        };
    });
});