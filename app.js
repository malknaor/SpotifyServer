const express = require('express');
const request = require('request');
const queryString = require('querystring');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const { spotify } = require('./spotify');
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

//////////////// Authorization ////////////////
// Redirect the user to login and authorize the app
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

// Request acces-token from spotify after the user authorize the app
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
                var acces_token = body.acces_token;
                var refresh_token = body.refresh_token;

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

// Requset to refresh the acces_token after expiration
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

//////////////// Data Requests ////////////////
// fetch user data
app.get('/me', async (req, res) => {
    const response = await spotify.get('/me', {
        headers: {
            Authorization: req.headers.authorization
        }
    })
    .then(res => res.data)
    .catch(err => err.message);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(response);
});

// fetch user recently played
app.get('/recently-played', async (req, res) => {
    const response = await spotify.get('/me/player/recently-played', {
        headers: {
            Authorization: req.headers.authorization
        }
    })
    .then(res => res.data)
    .catch(err => err.message);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(response);
});

// fetch user top tracks / artists
app.get('/user-top-x', async (req, res) => {
    const response = await spotify.get(`/me/top/${req.body.type}`, {
        headers: {
            Authorization: req.headers.authorization
        }
    })
    .then(res => res.data)
    .catch(err => err.message);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(response);
});

//////////////// Error Handling ////////////////
app.get('*', (req, res) => {
    res.sendStatus(404);
});

//////////////// Server Activation ////////////////
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});