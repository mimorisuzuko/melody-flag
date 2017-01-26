const express = require('express');
const libpath = require('path');
const rq = require('request-promise');
const qs = require('querystring');
const bodyParser = require('body-parser');
const minimist = require('minimist');
const _ = require('lodash');
const settings = require('./settings/index');
const DroneWatcher = require('./drone-watcher');
const {argv} = process;
const {debug: debugNumber} = minimist(_.slice(argv, 2));
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
		const q = qs.stringify({ accessToken, refreshToken, consumerKey: client_id, debugNumber });
		res.redirect(`${baseUrl}/docs?${q}`);
	});
});

app.post('/motion', (req, res) => {
	const {body: {name, uuid, speed, steps}} = req;
	const drone = watcher.drone(uuid);
	console.log(`Name: ${name}, Speed: ${speed}, Steps: ${steps}, UUID: ${uuid}`);

	if (drone) {
		if (name === 'takeOff') {
			drone.takeOff();
		} else if (name === 'land') {
			drone.land();
		} else if (name === 'up') {
			drone.up({ speed, steps });
		} else if (name === 'down') {
			drone.down({ speed, steps });
		} else if (name === 'turnRight') {
			drone.turnRight({ speed, steps });
		} else if (name === 'turnLeft') {
			drone.turnLeft({ speed, steps });
		} else if (name === 'forward') {
			drone.forward({ speed, steps });
		} else if (name === 'backward') {
			drone.backward({ speed, steps });
		} else if (name === 'left') {
			drone.left({ speed, steps });
		} else if (name === 'right') {
			drone.right({ speed, steps });
		} else if (name === 'frontFlip') {
			drone.frontFlip();
		} else if (name === 'backFlip') {
			drone.backFlip();
		}
	}
	res.sendStatus(200);
});

app.get('/drones', (req, res) => {
	const {query: {debugNumber}} = req;
	res.json(watcher.connectedDrones(_.parseInt(debugNumber)));
});

app.listen(port);