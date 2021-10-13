const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

const port = process.argv[2] ? process.argv[2] : 4041;

const http = require('http').createServer(app);
const io = require('socket.io')(http.listen(port, () => {
    console.log('Serever has been started:\n PORT: ' + port);
}));

const { generat } = require('./q.js')

app.use('/', express.static(path.join(__dirname + '/dist')))

const getUsers = () => JSON.parse(fs.readFileSync('./json/users.json', 'utf-8'));
const loadUsers = data => fs.writeFile('./json/users.json', JSON.stringify(data), 'utf-8', err => err ? console.log(err) : '')

const getMessages = () => JSON.parse(fs.readFileSync('./json/messages.json', 'utf-8'));
const loadMessages = data => fs.writeFile('./json/messages.json', JSON.stringify(data), 'utf-8', err => err ? console.log(err) : '')

const getPlatform = pf => {
    if (/Windows/.test(pf)) return 'Windows'
    if (/Android/.test(pf)) return 'Android'
    if (/iPhone/.test(pf)) return 'iPhone'
    if (/Linux/.test(pf)) return 'Linux'
}

io.on('connection', socket => {

    // * User Events
    socket.on('user:connect', userID => {
        let users = getUsers();
        let id = userID;
        if (!users[userID]) {
            id = generat({ type: 'All', length: 24 })
            users[id] = { id, username: '', color: '#fff', avatar: '' }
            loadUsers(users)
        }
        users[id]['platform'] = getPlatform(socket.handshake.headers['user-agent'])
        socket.userID = id;
        socket.emit('user:loadUser', users[id])
    })

    socket.on('user:update', params => {
        let users = getUsers();
        let user = users[socket.userID]
        for (let param in params) user[param] = params[param];
        loadUsers(users)
    })


    // * Chat Events
    socket.on('chat:getMessages', () => {
        let messages = getMessages(),
            users = getUsers();
        socket.emit('chat:loadMessages', messages.map(x => {
            x.user = users[x.user]
            return x
        }))
    })

    socket.on('chat:sendMessage', message => {
        let data = {
            content: message,
            id: generat({ type: 'All', length: 18 }),
            user: socket.userID,
            date: Date.now()
        }
        let messages = getMessages()
        messages.push(data)
        loadMessages(messages)
        data.user = getUsers()[socket.userID]
        io.emit('chat:addMessage', data)
    })
})