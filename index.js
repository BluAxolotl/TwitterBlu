const print = console.log

const path = require('path')
var Twitter = require('twitter')
const express = require('express')
const app = express()
const server = require('http').createServer(app);
const io = require('socket.io')(server);

var port = 4000

var clients = new Map()
var accounts = new Map()

io.on('connection', (socket) => {
	print("! CONNECTION")
	socket.on('init', (auth) => {
		let client = new Twitter({
		  consumer_key: auth.twitter_api_key,
		  consumer_secret: auth.twitter_api_key_secret,
		  access_token_key: auth.twitter_access_token,
		  access_token_secret: auth.twitter_access_token_secret
		})
		clients.set(socket.id, client)
		
		// socket.emit("init", require('./sample_timeline.json'), [])
		client.get('account/verify_credentials', {}, (err, account, res) => {
			accounts.set(socket.id, account)
			client.get('collections/list', { user_id: account.id }, (err, object, res) => {
				client.get('statuses/home_timeline', {count: 200, tweet_mode: "extended", exclude_replies: true, include_entities: true, trim_user: false}, (err, tweets, res) => {
					if (err) {
						print(err)
						return
					}
					let collections = []
					Object.keys(object.objects.timelines).forEach(coll_id => {
						let coll = object.objects.timelines[coll_id]
						collections.push({
							id: coll_id,
							name: coll.name
						})
					})
					socket.emit("init", tweets, collections)
				})
			})
		})
	})
	
	socket.on('print', print)

	socket.on('user', (id) => {
		let client = clients.get(socket.id)
		client.get('users/lookup', { user_id: id, trim_user: false }, (err, user, res) => {
			if (err) {
				print(err)
				return
			}
			socket.emit("user", user)
		})
	})

	socket.on('follow', (user) => {
		let client = clients.get(socket.id)
		client.post('friendships/create', {user_id: user.id_str}, (err, follow_user, res) => {
			follow_user.following = true
			socket.emit('follow', follow_user, res)
		})
	})

	socket.on('unfollow', (user) => {
		let client = clients.get(socket.id)
		client.post('friendships/destroy', {user_id: user.id_str}, (err, follow_user, res) => {
			follow_user.following = false
			socket.emit('unfollow', follow_user, res)
		})
	})
	
	socket.on('like', (tweet) => {
		let client = clients.get(socket.id)
		client.post('favorites/create', {id: tweet.id_str, tweet_mode: "extended"}, (err, like_tweet, res) => {
			socket.emit('like', like_tweet, res)
		})
	})

	socket.on('unlike', (tweet) => {
		let client = clients.get(socket.id)
		client.post('favorites/destroy', {id: tweet.id_str, tweet_mode: "extended"}, (err, like_tweet, res) => {
			socket.emit('unlike', like_tweet, res)
		})
	})

	socket.on('retweet', (tweet) => {
		let client = clients.get(socket.id)
		client.post('statuses/retweet', {id: tweet.id_str, tweet_mode: "extended"}, (err, rt_tweet, res) => {
			socket.emit('retweet', tweet, rt_tweet.retweeted_status.retweet_count)
		})
	})

	socket.on('unretweet', (tweet) => {
		let client = clients.get(socket.id)
		client.post('statuses/unretweet', {id: tweet.id_str, tweet_mode: "extended"}, (err, rt_tweet, res) => {
			socket.emit('unretweet', tweet, rt_tweet.retweet_count)
		})
	})
})

app.use( '/', express.static('website') )

app.get('/', (req, res) => {
  res.sendFile('/home.html', {root: path.join(__dirname, 'website')});
})

 server.listen(8090, "0.0.0.0")

// statuses/home_timeline