const express = require('express');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('./hide');

const PORT = process.env.PORT || 8888;
const app = express();

app.get('/', (req, res) => {
    res.send('Welcome to my spotify server!');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});