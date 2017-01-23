const express = require('express');
const libpath = require('path');
const rq = require('request-promise');
const qs = require('querystring');
const bodyParser = require('body-parser');
const settings = require('./settings/index');
const DroneWatcher = require('./drone-watcher');

const port = 3000;
const baseUrl = `http://localhost:${port}`;
const redirect_uri = `${baseUrl}/authorize`;
const client_id = settings.get('key');
const client_secret = settings.get('secret');
const app = express();
const watcher = new DroneWatcher();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/docs', express.static(libpath.join(__dirname, 'lib')));
app.use('/docs', express.static(libpath.join(__dirname, 'docs')));

app.get('/', (req, res) => {
	const q = qs.stringify({
		response_type: 'code',
		client_id,
		redirect_uri
	});

	res.redirect(`https://api.rhapsody.com/oauth/authorize?${q}`);
});

app.get('/authorize', (req, res) => {
	const {query: {code}} = req;
	rq.post('https://api.rhapsody.com/oauth/access_token', {
		form: {
			client_id,
			client_secret,
			response_type: 'code',
			code,
			redirect_uri,
			grant_type: 'authorization_code'
		}
	}).then((body) => {
		const {access_token: accessToken, refresh_token: refreshToken} = JSON.parse(body);
		const q = qs.stringify({ accessToken, refreshToken, consumerKey: client_id });
		res.redirect(`${baseUrl}/docs?${q}`);
	});
});

app.post('/motion', (req, res) => {
	const {body: {name, uuid}} = req;
	const drone = watcher.drone(uuid);
	console.log(`${name}	${uuid}`);

	if (drone) {
		if (name === 'takeOff') {
			drone.takeOff();
		} else if (name === 'land') {
			drone.land();
		}
	}

	res.sendStatus(200);
});

app.get('/drones', (req, res) => {
	res.json(watcher.connectedDrones());
});

app.listen(port);