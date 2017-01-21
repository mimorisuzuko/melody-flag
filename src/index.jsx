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

class PlayerModel extends Record({ currentTime: 0, totalTime: 0, paused: true, id: '', changedId: false }) { }

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
			const trackList = Immutable.fromJS(_.map(tracks, (track) => {
				const {
					id,
					name,
					album: {id: albumId},
					artist: {name: artist}
				} = track;

				return new TrackModel({ id, name, albumId, artist });
			}));

			this.setState({ trackList });
		});
	}

	/**
	 * @param {{data: {paused: boolean, id: string}}} e
	 */
	onPlay(e) {
		const {state: {player}} = this;
		const {data: {paused, id}} = e;
		const changedId = player.get('id') !== id;

		this.setState({ player: player.merge({ paused: paused || changedId, id, changedId }) });
	}

	/**
	 * @param {{data: {currentTime: number, totalTime: number}}} e
	 */
	onTimer(e) {
		const {state: {player}} = this;
		const {data: {currentTime, totalTime}} = e;
		let changedId = player.get('changedId');

		if (changedId) {
			changedId = false;
			Rhapsody.player.pause();
		}

		this.setState({ player: player.merge({ currentTime, totalTime, changedId }) });
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
				<Body trackList={trackList} player={player} droneList={droneList} />
				<Footer player={player} />
			</div>
		);
	}
}

class Body extends Component {
	shouldComponentUpdate(nextProps) {
		const {props} = this;

		return !Immutable.is(Map(nextProps), Map(props));
	}

	render() {
		const {
			props: {trackList, player, droneList}
		} = this;

		return (
			<div style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'row',
			}}>
				<TrackList list={trackList} player={player} />
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

class TrackModel extends Record({ albumId: '', id: '', name: '', artist: '' }) { }

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
			props: {model}
		} = this;
		const id = model.get('id');

		if (Rhapsody.player.currentTrack === id) {
			if (!Rhapsody.player.playing) {
				Rhapsody.player.play(id);
			}
		} else {
			Rhapsody.player.play(id);
		}
	}
}

class TrackList extends Component {
	render() {
		const {
			props: {list, player}
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
					{list.map((model) => <Track model={model} selected={player.get('id')} />)}
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
		const {FPS: fps} = Timeline;
		const currentFrame = _.floor(player.get('currentTime') * fps);

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
					width: '100%',
					overflow: 'scroll'
				}}>
					{droneList.map((model) => <Timeline currentFrame={currentFrame} prevFrame={prevFrame} model={model} player={player} />)}
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
			props: {model, player, prevFrame, currentFrame},
			state: {motionList},
		} = this;
		const {SIZE: dy} = Motion;
		const {FPS: fps, INTERVAL: interval, HEIGHT: height} = Timeline;
		const keyframesNumber = fps * player.get('totalTime');
		const width = keyframesNumber * interval;
		const keyframes = [];
		const texts = [];
		const uuid = model.get('uuid');
		const motions = motionList.map((model, i) => {
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
				<Motion onDragEnd={this.onDragEndMotion.bind(this, i)} name={name} style={{
					position: 'absolute',
					top: height / 2 - dy / 2,
					left: keyframe * interval
				}} />
			);
		});

		for (let i = 0; i < keyframesNumber; i += 1) {
			const x = i * interval;
			keyframes.push(<rect width={1} height='100%' x={x} fill={i % fps === 0 ? llblackRGB : lblackRGB} stroke='none'></rect>);

			if (i % fps === 0) {
				const s = _.floor(i / fps);
				texts.push(<text x={x} y={height} fontSize='12'>{s}</text>);
			}
		}

		return (
			<div style={{
				position: 'relative',
				padding: '0 10px'
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
				<svg onDragOver={this.onDragOver.bind(this)} onDrop={this.onDrop.bind(this)} onClick={this.onClick.bind(this)} style={{
					display: 'block',
					height,
					width,
					borderBottom: `1px solid ${llblackRGB}`,
				}}>
					{keyframes}
					{texts}
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
		const {clientX, currentTarget, dataTransfer} = e;
		const {left, width} = currentTarget.getBoundingClientRect();
		const {INTERVAL: interval} = Timeline;
		const x = clientX - left;
		const keyframe = _.round(x / interval);
		const {name} = JSON.parse(dataTransfer.getData('text/plain'));

		if (motionList.get(keyframe)) { return; }

		this.setState({ motionList: motionList.set(keyframe, new MotionModel({ name, keyframe })) });
	}

	/**
	 * @param {number} index
	 */
	onDragEndMotion(index) {
		const {state: {motionList}} = this;

		this.setState({ motionList: motionList.delete(index) });
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
		const Icon = {
			takeoff: MdFlightTakeoff,
			land: MdFlightLand,
			up: FaAngleDoubleUp,
			down: FaAngleDoubleDown,
			turnRight: FaRepeat,
			turnLeft: FaRotateLeft,
			forward: FaArrowUp,
			backward: FaArrowDown,
			left: FaArrowLeft,
			right: FaArrowRight,
			frontFlip: MdFlipToBack,
			leftFlip: MdFlipToFront
		}[name];
		const {SIZE: size} = Motion;

		return (
			<div draggable onDragStart={this.onDragStart.bind(this)} onDragEnd={this.onDragEnd.bind(this)} style={_.assign({
				width: size,
				height: size,
				borderRadius: '50%',
				backgroundColor: blueRGB,
				textAlign: 'center',
				lineHeight: `${size}px`,
				cursor: 'pointer',
				opacity: 0.9999
			}, style)}>
				<Icon size={16} />
			</div>
		);
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragStart(e) {
		const {props: {name, onDragStart}} = this;
		const {dataTransfer} = e;

		dataTransfer.setData('text/plain', JSON.stringify({ name }));
	}

	/**
	 * @param {DragEvent} e
	 */
	onDragEnd(e) {
		const {props: {onDragEnd}} = this;

		onDragEnd();
	}

	static get defaultProps() {
		return {
			onDragEnd: () => { }
		};
	}

	static get SIZE() {
		return 24;
	}
}

class Footer extends Component {
	render() {
		const {props: {player}} = this;
		const Icon = player.get('paused') ? FaPlayCircle : FaPauseCircle;
		const [headMotionList, tailMotionList] = _.map([
			['takeoff', 'land', 'up', 'down', 'turnRight', 'turnLeft'],
			['forward', 'backward', 'left', 'right', 'frontFlip', 'leftFlip']
		], (a) => (
			<div style={{
				display: 'flex',
				flexDirection: 'row'
			}}>
				{_.map(a, (b) => <Motion name={b} />)}
			</div>
		));

		return (
			<div style={{
				display: 'flex',
				flexDirection: 'row',
				padding: '10px 10px',
				position: 'fixed',
				right: 10,
				bottom: 10,
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
					{headMotionList}
					{tailMotionList}
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