const express = require('express');
const request = require('request');
const queryString = require('querystring');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require('./hide');
const { generateRandomString } = require('./utils');

const PORT = process.env.PORT || 8888;
var stateKey = 'spotify_auth_state';

const app = express();

app.use(cors());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Welcome to my spotify server!');
});

//////////////// App Authorization ////////////////
app.get('/login', (req, res) => {
    var scope = 'user-read-private user-read-email user-top-read user-read-recently-played';
    var state = generateRandomString(16);

    res.cookie(stateKey, state);

    res.redirect('https://accounts.spotify.com/authorize?' +
        queryString.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
            state: state
        }));
});

app.get('/token', (req, res) => {
    // application requests refresh and access tokens
    // after validating the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            queryString.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);

        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                // var acces_token = body.acces_token;
                // var refresh_token = body.refresh_token;

                res.redirect('http://127.0.0.1:3000/?' +
                    queryString.stringify(body));
            } else {
                res.redirect('/#' +
                    queryString.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', (req, res) => {
    // requesting access token using the refresh token

    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        header: {
            'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if(!error && response.statusCode === 200) {
            var access_token = body.acces_token;

            res.send(body);
        }
    });
});

//////////////// Error Handling ////////////////
app.get('*', (req, res) => {
    res.sendStatus(404);
});

//////////////// Server Activation ////////////////
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});