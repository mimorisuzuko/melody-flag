const _ = require('lodash');
const qs = require('querystring');
const React = require('react');
const ReactDOM = require('react-dom');
const Immutable = require('immutable');
const Color = require('color');
const {FaPlayCircle, FaPauseCircle, FaMusic, FaUser, FaAngleDoubleUp, FaAngleDoubleDown, FaRepeat, FaRotateLeft, FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight} = require('react-icons/lib/fa');
const {MdFlightTakeoff, MdFlightLand, MdFlipToBack, MdFlipToFront} = require('react-icons/lib/md');
const {List, Map, Record} = Immutable;
const {Component} = React;

const white = Color('rgb(212, 212, 212)');
const whiteRGB = white.string();
const blue = Color('rgb(0, 122, 204)');
const blueRGB = blue.string();
const black = Color('rgb(30, 30, 30)');
const lblackRGB = black.lighten(0.2).string();
const llblackRGB = black.lighten(0.6).string();
const blackRGB = black.string();

class PlayerModel extends Record({ currentTime: 0, totalTime: 0, paused: true, id: '' }) { }

class DroneModel extends Record({ uuid: '', name: '' }) { }

class App extends Component {
	constructor(props) {
		super(props);

		const {accessToken, refreshToken, consumerKey} = qs.parse(location.search.substring(1));
		Rhapsody.init({ consumerKey });
		Rhapsody.player.on('ready', this.onReady.bind(this, accessToken, refreshToken));
		Rhapsody.player.on('playevent', this.onPlay.bind(this));
		Rhapsody.player.on('playtimer', this.onTimer.bind(this));

		this.state = {
			trackList: List(),
			player: new PlayerModel(),
			droneList: List()
		};

		this.draw();
	}

	draw() {
		fetch('/drones').then((r) => r.json()).then((r) => {
			const {state: {droneList}} = this;

			this.setState({ droneList: droneList.merge(r) });
			setTimeout(this.draw.bind(this), 500);
		});
	}

	/**
	 * @param {string} accessToken
	 * @param {string} refreshToken
	 */
	onReady(accessToken, refreshToken) {
		Rhapsody.member.set({ accessToken, refreshToken });
		Rhapsody.api.get(false, '/tracks/top', (tracks) => {
			const {state: {player}} = this;
			const trackList = Immutable.fromJS(_.map(tracks, (track, i) => {
				const {
					id,
					name,
					album: {id: albumId},
					artist: {name: artist},
					duration
				} = track;

				if (i === 0) {
					this.setState({ player: player.merge({ id, totalTime: duration }) });
				}

				return new TrackModel({ id, name, albumId, artist, duration });
			}));

			this.setState({ trackList });
		});
	}

	/**
	 * @param {{data: {paused: boolean, id: string}}} e
	 */
	onPlay(e) {
		const {state: {player}} = this;
		const {data: {paused}} = e;

		this.setState({ player: player.merge({ paused }) });
	}

	/**
	 * @param {{data: {currentTime: number, totalTime: number}}} e
	 */
	onTimer(e) {
		const {state: {player}} = this;
		const {data: {currentTime, totalTime}} = e;

		this.setState({ player: player.merge({ currentTime, totalTime }) });
	}

	render() {
		const {state: {trackList, player, droneList}} = this;

		return (
			<div style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column'
			}}>
				<Body trackList={trackList} onClickTrack={this.onClickTrack.bind(this)} player={player} droneList={droneList} />
				<Footer player={player} />
			</div>
		);
	}

	/**
	 * @param {string} id
	 * @param {number} totalTime
	 */
	onClickTrack(id, totalTime) {
		const {state: {player}} = this;
		const currentTime = 0;

		if (player.get('id') !== id) {
			Rhapsody.player.pause();
		}

		this.setState({ player: player.merge({ id, totalTime, currentTime }) });
	}
}

class Body extends Component {
	shouldComponentUpdate(nextProps) {
		const {props} = this;

		return !Immutable.is(Map(nextProps), Map(props));
	}

	render() {
		const {
			props: {trackList, player, droneList, onClickTrack}
		} = this;

		return (
			<div style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'row',
			}}>
				<TrackList list={trackList} player={player} onClickTrack={onClickTrack} />
				<TimelineList player={player} droneList={droneList} />
			</div>
		);
	}
}

class NavTitle extends Component {
	render() {
		const {
			props: {text}
		} = this;

		return (
			<div style={{
				backgroundColor: lblackRGB,
				textTransform: 'uppercase',
				padding: '5px 20px'
			}}>
				{text}
			</div>
		);
	}
}

class TrackModel extends Record({ albumId: '', id: '', name: '', artist: '', duration: 0 }) { }

class Track extends Component {
	constructor(props) {
		super(props);

		this.state = { thumbnail: '' };
	}

	componentDidMount() {
		const {
			props: {model}
		} = this;

		Rhapsody.api.get(false, `/albums/${model.get('albumId')}`, (album) => {
			const thumbnail = album.images[0].url;
			this.setState({ thumbnail });
		});
	}

	render() {
		const {
			state: {thumbnail},
			props: {model, selected}
		} = this;
		const width = 48;
		const contents = _.map([
			[FaMusic, model.get('name')],
			[FaUser, model.get('artist')]
		], ([Icon, text]) => (
			<div style={{
				whiteSpace: 'nowrap',
				textOverflow: 'ellipsis',
				overflow: 'hidden'
			}}>
				<Icon style={{
					marginRight: 2
				}} />
				{text}
			</div>
		));

		return (
			<div onClick={this.onClick.bind(this)} style={{
				display: 'flex',
				flexDirection: 'row',
				cursor: 'pointer',
				opacity: model.get('id') === selected ? 1 : 0.5
			}}>
				<img src={thumbnail} style={{
					display: 'block',
					width,
					height: width
				}} />
				<div style={{
					paddingLeft: 4,
					boxSizing: 'border-box',
					width: `calc(100% - ${width}px)`
				}}>
					{contents}
				</div>
			</div>
		);
	}

	onClick() {
		const {
			props: {model, onClick}
		} = this;
		const id = model.get('id');
		const duration = model.get('duration');

		onClick(id, duration);
	}
}

class TrackList extends Component {
	render() {
		const {
			props: {list, player, onClickTrack}
		} = this;
		const {WIDTH: width} = TrackList;

		return (
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				borderRight: `1px solid ${llblackRGB}`,
				boxSizing: 'border-box',
				width
			}}>
				<NavTitle text='explorer' />
				<div style={{
					overflowY: 'scroll',
					height: '100%'
				}}>
					{list.map((model) => <Track model={model} selected={player.get('id')} onClick={onClickTrack} />)}
				</div>
			</div>
		);
	}

	static get WIDTH() {
		return 220;
	}
}

class TimelineList extends Component {
	constructor(props) {
		super(props);

		this.prevFrame = -1;
	}

	render() {
		const {
			props: {droneList, player},
			prevFrame
		} = this;
		const {WIDTH: dwidth} = TrackList;
		const {FPS: fps, INTERVAL: interval} = Timeline;
		const totalTime = player.get('totalTime');
		const keyframesNumber = fps * totalTime;
		const width = keyframesNumber * interval;
		const currentFrame = Math.floor(player.get('currentTime') * fps);
		const height = 18;
		const texts = [];
		const grid = [];

		for (let i = 1; i < totalTime; i += 1) {
			const x = i * interval * fps;
			const y = 12;
			const mm = `0${Math.floor(i / 60)}`.slice(-2);
			const ss = `0${Math.floor(i % 60)}`.slice(-2);
			texts.push(<text x={x} y={y}>{`${mm}:${ss}:00`}</text>);
			grid.push(<rect x={x} y={height - 5} height={5} width={1}></rect>);
		}
		this.prevFrame = player.get('paused') ? -1 : currentFrame;

		return (
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				width: `calc(100% - ${dwidth}px)`
			}}>
				<NavTitle text='Timeline' />
				<div style={{
					height: '100%',
					width: 'calc(100% - 30px)',
					margin: '0 15px',
					boxSizing: 'border-box',
					overflow: 'scroll'
				}}>
					<svg width={width} height={height} style={{
						display: 'block',
						padding: '1px 0'
					}}>
						<rect width='100%' height='100%' fill={lblackRGB}></rect>
						<g fontSize={10} textAnchor='middle'>
							{texts}
						</g>
						<g fill={llblackRGB}>
							{grid}
						</g>
					</svg>
					{droneList.map((model) => <Timeline
						currentFrame={currentFrame}
						prevFrame={prevFrame}
						model={model}
						player={player}
						keyframesNumber={keyframesNumber}
						width={width}
						/>
					)}
				</div>
			</div>
		);
	}
}

class MotionModel extends Record({ name: '', keyframe: 0 }) { }

class Timeline extends Component {
	constructor(props) {
		super(props);

		this.state = {
			motionList: List()
		};
	}

	render() {
		const {
			props: {model, player, prevFrame, currentFrame, width, keyframesNumber},
			state: {motionList},
		} = this;
		const {SIZE: dy} = Motion;
		const {FPS: fps, INTERVAL: interval, HEIGHT: height} = Timeline;
		const keyframes = [];
		const uuid = model.get('uuid');
		const motions = motionList.map((model) => {
			if (!model) { return null; }
			const keyframe = model.get('keyframe');
			const name = model.get('name');

			if (currentFrame !== prevFrame && currentFrame === keyframe) {
				fetch('/motion', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ name, keyframe, uuid })
				}).then((r) => r.text()).then((r) => console.log('Send a motion!', keyframe, name));
			}

			return (
				<Motion name={name} style={{
					position: 'absolute',
					top: height / 2 - dy / 2,
					left: keyframe * interval - dy / 2
				}} />
			);
		});

		for (let i = 0; i < keyframesNumber; i += 1) {
			const x = i * interval;
			keyframes.push(<rect width={1} height='100%' x={x} fill={i % fps === 0 ? llblackRGB : lblackRGB}></rect>);
		}

		return (
			<div onDragOver={this.onDragOver.bind(this)} onDrop={this.onDrop.bind(this)} style={{
				position: 'relative',
				width
			}}>
				<div style={{
					position: 'fixed',
					backgroundColor: lblackRGB,
					borderBottomRightRadius: 4,
					padding: 2
				}}>
					{model.get('name')}
				</div>
				{motions}
				<svg width={width} height={height} onClick={this.onClick.bind(this)}
					style={{
						display: 'block',
						borderBottom: `1px solid ${llblackRGB}`,
					}}>
					<g stroke='none'>
						{keyframes}
					</g>
					<rect width={1} height='100%' x={currentFrame * interval} fill={blueRGB} stroke='none'></rect>
				</svg>
			</div>
		);
	}

	/**
	 * @param {MouseEvent} e
	 */
	onClick(e) {
		const {INTERVAL: interval, FPS: fps} = Timeline;
		const {target, currentTarget, clientX} = e;
		const {left} = currentTarget.getBoundingClientRect();
		const x = clientX - left;
		const t = x / interval / fps;

		Rhapsody.player.seek(t);
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragOver(e) {
		const {dataTransfer} = e;
		e.preventDefault();

		dataTransfer.dropEffect = 'move';
	}

	/**
	 * @param {DragEvent} e
	 */
	onDrop(e) {
		const {state: {motionList}} = this;
		const {clientX, dataTransfer} = e;
		const {left, width} = ReactDOM.findDOMNode(this).getBoundingClientRect();
		const {INTERVAL: interval} = Timeline;
		const x = clientX - left;
		const keyframe = Math.round(x / interval);
		const {name} = JSON.parse(dataTransfer.getData('text/plain'));

		this.setState({ motionList: motionList.set(keyframe, new MotionModel({ name, keyframe })) });
	}

	static get HEIGHT() {
		return 70;
	}

	static get INTERVAL() {
		return 20;
	}

	static get FPS() {
		return 3;
	}
}

class Motion extends Component {
	render() {
		const {props: {name, style}} = this;
		const {LIST: list} = Motion;
		const {Element} = _.find(list, { name });
		const {SIZE: size} = Motion;

		return (
			<div draggable onDragStart={this.onDragStart.bind(this)} style={_.assign({
				width: size,
				height: size,
				borderRadius: '50%',
				backgroundColor: blueRGB,
				textAlign: 'center',
				lineHeight: `${size}px`,
				cursor: 'pointer',
				opacity: 0.9999
			}, style)}>
				<Element size={16} />
			</div>
		);
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragStart(e) {
		const {props: {name}} = this;
		const {dataTransfer} = e;

		dataTransfer.setData('text/plain', JSON.stringify({ name }));
	}

	static get SIZE() {
		return 24;
	}

	static get LIST() {
		return [
			{ name: 'takeoff', Element: MdFlightTakeoff },
			{ name: 'land', Element: MdFlightLand },
			{ name: 'up', Element: FaAngleDoubleUp },
			{ name: 'down', Element: FaAngleDoubleDown },
			{ name: 'turnRight', Element: FaRepeat },
			{ name: 'turnLeft', Element: FaRotateLeft },
			{ name: 'forward', Element: FaArrowUp },
			{ name: 'backward', Element: FaArrowDown },
			{ name: 'left', Element: FaArrowLeft },
			{ name: 'right', Element: FaArrowRight },
			{ name: 'frontFlip', Element: MdFlipToBack },
			{ name: 'leftFlip', Element: MdFlipToFront }
		];
	}
}

class Footer extends Component {
	render() {
		const {props: {player}} = this;
		const Icon = player.get('paused') ? FaPlayCircle : FaPauseCircle;
		const {LIST: list} = Motion;
		const {length} = list;
		const motionList = _.map(_.chunk(list, length / 2), (a) => (
			<div style={{
				display: 'flex',
				flexDirection: 'row'
			}}>
				{_.map(a, ({name}) => <Motion name={name} />)}
			</div>
		));

		return (
			<div style={{
				display: 'flex',
				flexDirection: 'row',
				padding: '10px 10px',
				position: 'fixed',
				right: 15,
				bottom: 15,
				backgroundColor: blueRGB,
				borderRadius: 4,
				boxShadow: '0 3px 3px 0 rgba(0, 0, 0, 0.14), 0 1px 7px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -1px rgba(0, 0, 0, 0.2)'
			}}>
				<div onClick={this.onClick.bind(this)} style={{
					cursor: 'pointer',
					borderRight: `1px solid ${whiteRGB}`,
					paddingRight: 10
				}}>
					<Icon size={24} />
				</div>
				<div style={{
					paddingLeft: 10
				}}>
					{motionList}
				</div>
			</div>
		);
	}

	onClick() {
		const {props: {player}} = this;

		if (player.get('paused')) {
			Rhapsody.player.play(player.get('id'));
		} else {
			Rhapsody.player.pause();
		}
	}
}

ReactDOM.render(<App />, document.querySelector('main'));