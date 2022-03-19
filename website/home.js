var tweet_container = document.getElementById("tweet-container")
var init_button = document.getElementById('init-button')
var reset_button = document.getElementById('reset-button')
var screen_container = document.getElementById('screen-container')
var disp_image_container = document.getElementById('disp-image-container')
var disp_image_elem = document.getElementById('disp-image')
var close_screen_button = document.getElementById('close-screen')
var sidebar = document.getElementById('sidebar')
var sidebar_buffer = document.getElementById('sidebar-buffer')
var settings_button = document.getElementById('sidebar-settings')

const br = function () { return document.createElement('br') }

var twitter_access_token_input = document.getElementById('twitter_access_token')
var twitter_access_token_secret_input = document.getElementById('twitter_access_token_secret')

var auth = LocalStorage.getItem('auth')

if (auth != null && auth != "[object Object]") {
	init_button.onclick = function (e) {
		socket.emit('init', JSON.parse(auth))
	}
} else {
	init_button.onclick = function (e) {
		window.location.href = "/sign_in"
	}
}

reset_button.onclick = function (e) {
	LocalStorage.clear()
	init_button.onclick = function (e) {
		window.location.href = "/sign_in"
	}
}

settings_button.onclick = function (e) {
	print("SETTINGS")
}

var screens = ["user"]

function sidebar_button(id, SVG, label, onclick) {
	let button_elem = document.createElement('button')
	button_elem.id = `sidebar-${id}`
	button_elem.innerHTML = `<div class="sidebar-label">${label}</div>`+SVG
	button_elem.onclick = onclick
	sidebar.insertBefore(button_elem, sidebar_buffer)
	sidebar.insertBefore(br(), sidebar_buffer)
}

var tweet_objs = {}

function hide_screen() {
	screen_container.style = "display: none;"
	screens.forEach(screen => {
		let current_screen = document.getElementById(`screen-${screen}`)
		current_screen.style = "display: none;"
	})
}

hide_screen()

close_screen_button.onclick = function (e) {
	hide_screen()
}

function hide_disp_image() {
	disp_image_container.style = "display: none;"
}

disp_image_container.onclick = function (e) {
	hide_disp_image()
}

function disp_image(source) {
	disp_image_elem.src = source
	hide_screen()
	disp_image_container.style = ""
}

setInterval(function () {
	if (window.innerWidth < window.innerHeight) {
		disp_image_elem.setAttribute('mode', 'width')
	} else {
		disp_image_elem.setAttribute('mode', 'height')
	}
}, 10)

function show_screen(screen, info) {
	if (typeof(info) === "String") {
		try {
			info = JSON.parse(info)
		} catch (e) {
			def_print(e)
		}
	}
	hide_screen()
	let current_screen = document.getElementById(`screen-${screen}`)
	current_screen.style = ""
	screen_container.style = ""
	let elements = {}
	Array.from(current_screen.children).forEach(elem => {
		elements[elem.id.replace(`screen-${screen}-`, "")] = elem
	})
	
	switch (screen) {
		case 'user':
			let user = info
			elements['username'].textContent = user.name
			elements['screen-name'].textContent = "@" + user.screen_name
			elements['screen-name'].href = `https://twitter.com/${user.screen_name}`
			elements['icon'].src = user.profile_image_url_https.replace("_normal", "_400x400")
			elements['banner'].style = `background-image: url('${user.profile_banner_url}');`
			elements['desc'].textContent = user.description
			if (user.following) {
				elements['follow'].textContent = "Following"
				elements['follow'].style = "background: white; color: var(--follow-button);"
				elements['follow'].onclick = function (e) {
					socket.emit('unfollow', user)
				}
			} else {
				elements['follow'].textContent = "Follow"
				elements['follow'].style = "background: var(--follow-button); color: white;"
				elements['follow'].onclick = function (e) {
					socket.emit('follow', user)
				}
			}
		break;
	}
}

function clear_tweets() {
	tweet_container.replaceChildren()
}

function append_tweets(tweets) {
	def_print(tweets)
	tweets.forEach(tweet => {
		let container = document.createElement('div')
		let author_info = document.createElement('div')
		let tweet_elem = document.createElement('div')
		tweet_elem.classList.add("tweet")
		let icon = document.createElement('img')
		let username = document.createElement('p')
		let tweet_buttons_elem = document.createElement('div')
		container.classList.add("tweet-container")
		
		let tweet_user = tweet.user
		let tweet_text = tweet.full_text
		let tweet_text_length = tweet.display_text_range[1]
		let retweet_count = tweet.retweet_count
		let favorite_count = tweet.favorite_count
		let tweet_id_str = tweet.id_str
		let tweet_id = tweet.id

		if (tweet.retweeted_status != null) {
			tweet_user = tweet.retweeted_status.user
			tweet_text = tweet.retweeted_status.full_text
			tweet_id = tweet.retweeted_status.id
			tweet_id_str = tweet.retweeted_status.id_str
			tweet_text_length = tweet.retweeted_status.display_text_range[1]
			favorite_count = tweet.retweeted_status.favorite_count
			retweet_count = tweet.retweeted_status.retweet_count
			let retweet_ind = document.createElement('p')
			let user_rt = document.createElement('button')
			user_rt.textContent = tweet.user.name
			user_rt.classList.add('text-button')
			user_rt.setAttribute('onclick', `show_screen("user", ${JSON.stringify(tweet.user)})`)
			user_rt.style = "color: #ffffff7c; font-weight: bolder"
			retweet_ind.innerHTML = `${user_rt.outerHTML} Retweeted ♻️`
			retweet_ind.classList.add('tweet-button', 'like-button')
			retweet_ind.style = "color: #ffffff7c;"
			container.appendChild(retweet_ind)
		}

		tweet_text = tweet_text.slice(0, tweet_text_length).replace(/(?:\r\n|\r|\n)/g, '<br>')

		icon.src = tweet_user.profile_image_url
		icon.classList.add('tweet-user-icon')
		author_info.appendChild(icon)

		username.textContent = tweet_user.name
		username.classList.add('tweet-username')
		username.onclick = function (e) {
			show_screen("user", tweet_user)
		}
		author_info.appendChild(username)

		container.appendChild(author_info)
		
		let tweet_text_elem = document.createElement('p')
		tweet_text_elem.innerHTML = tweet_text
		tweet_elem.appendChild(tweet_text_elem)

		if (tweet.extended_entities != null && tweet.extended_entities.media != null) {
			if (tweet.extended_entities.media[0].type == "video") {
				var src = tweet.extended_entities.media[0].video_info.variants.filter(i => i.content_type == "video/mp4").sort((a, b) => b.bitrate - a.bitrate)[0].url
				var media_elem = document.createElement('video')
				media_elem.controls = true
				media_elem.src = src
				media_elem.classList.add("media")
				tweet_elem.appendChild(media_elem)
				var media_container = document.createElement('div')
	 		} else if (tweet.extended_entities.media[0].type == "animated_gif") {
				var src = tweet.extended_entities.media[0].video_info.variants.filter(i => i.content_type == "video/mp4").sort((a, b) => b.bitrate - a.bitrate)[0].url
				var media_elem = document.createElement('video')
				media_elem.controls = false
				media_elem.autoplay = true
				media_elem.loop = true
				media_elem.src = src
				media_elem.classList.add("media")
				tweet_elem.appendChild(media_elem)
			} else {
				var media_container = document.createElement('div')
				let alphabet = ["a", "b", "c", "d"]
				let medias = tweet.extended_entities.media
				medias.forEach((media, index) => {
					var src = media.media_url_https
					var media_elem = document.createElement('div')
					if (medias.length != 3) {
						media_elem.style = `background-image: url(${src});`
					} else {
						media_elem.style = `background-image: url(${src}); grid-area: ${alphabet[index]};`
					}
					media_elem.classList.add('image-media')
					media_elem.onclick = function (e) {
						disp_image(src)
					}
					media_container.appendChild(media_elem)
				})
				media_container.classList.add('media-container')
				tweet_elem.appendChild(media_container)
				switch (medias.length) {
					case 2:
						media_container.style = `grid-template-columns: 50% 50%;`
					break;
					case 3:
						media_container.style = `grid-template-columns: 50% 50%; grid-template-columns: 50% 50%; grid-template-areas: "a c" "b c";`
					break;
					case 4:
						media_container.style = `grid-template-columns: 50% 50%; grid-template-columns: 50% 50%;`
					break;
				}
			}
		}
		
		container.appendChild(tweet_elem)

		tweet_buttons_elem.classList.add("tweet-buttons")
		let buttons = []

		let like_button = document.createElement('button')
		if (!tweet.favorited) {
			like_button.innerHTML = LIKE_SVG
			like_button.classList.add('tweet-button', 'like-button')
			like_button.style = "color: #ffffff7c;"
			like_button.setAttribute('not', 'true')
			like_button.onclick = function (e) {
				socket.emit('like', tweet)
			}
		} else {
			like_button.innerHTML = LIKED_SVG
			like_button.classList.add('tweet-button', 'unlike-button')
			like_button.style = "color: #ffffff7c; fill: var(--like-button);"
			like_button.onclick = function (e) {
				socket.emit('unlike', tweet)
			}
		}
		like_button.innerHTML += favorite_count
		buttons.push(like_button)

		let rt_button = document.createElement('button')
		if (!tweet.retweeted) {
			rt_button.innerHTML = RETWEET_SVG
			rt_button.classList.add('tweet-button', 'rt-button')
			rt_button.style = "color: #ffffff7c;"
			rt_button.setAttribute('not', 'true')
			rt_button.onclick = function (e) {
				socket.emit('retweet', tweet)
			}
		} else {
			rt_button.innerHTML = RETWEETED_SVG
			rt_button.classList.add('tweet-button', 'unrt-button')
			rt_button.style = "color: #ffffff7c; fill: var(--rt-button);"
			rt_button.onclick = function (e) {
				socket.emit('unretweet', tweet)
			}
		}
		rt_button.innerHTML += retweet_count
		buttons.push(rt_button)

		let info_button = document.createElement('button')
		info_button.innerHTML = INFO_SVG
		info_button.classList.add('tweet-button', 'info-button')
		info_button.setAttribute('not', 'true')
		info_button.onclick = function (e) {
			window.navigator.clipboard.writeText(JSON.stringify(tweet)).then(() => {
				print("COPIED TWEET OBJECT")
			})
		}
		buttons.push(info_button)

		let open_button = document.createElement('a')
		open_button.textContent = "original"
		open_button.classList.add('tweet-button', 'open-button')
		let link = `https://fxtwitter.com/${tweet_user.screen_name}/status/${tweet_id_str}`
		open_button.href = link
		buttons.push(open_button)
		
		buttons.forEach(button => {
			tweet_buttons_elem.appendChild(button)
		})
		container.appendChild(tweet_buttons_elem)
		
		tweet_container.appendChild(container)

		tweet_objs[tweet.id_str] = {element: container, tweet: {
			favorite_count: favorite_count,
			retweet_count: retweet_count
		}}
	})
}

socket.on('init', (tweets, collections) => {
	init_button.remove()
	reset_button.remove()
	clear_tweets()
	append_tweets(tweets)
	def_print(collections)
	collections.forEach(coll => {
		sidebar_button(`coll-${coll.id}`, LIKED_SVG, coll.name, function (e) {
			
		})
	})
})

socket.on('follow', (user, res) => {
	def_print(user)
	show_screen("user", user)
})

socket.on('unfollow', (user, res) => {
	def_print(user)
	show_screen("user", user)
})

socket.on('like', (tweet, res) => {
	let tweet_obj = tweet_objs[tweet.id_str]
	let button = tweet_obj.element.querySelector("div.tweet-buttons > button.tweet-button.like-button")
	button.innerHTML = LIKED_SVG
	button.innerHTML += tweet_obj.tweet.favorite_count+1
	button.style = "color: #ffffff7c; fill: var(--like-button);"
	button.classList.add('tweet-button', 'unlike-button')
	button.removeAttribute('not')
	button.onclick = function (e) {
		socket.emit('unlike', tweet)
	}
})

socket.on('unlike', (tweet, res) => {
	let tweet_obj = tweet_objs[tweet.id_str]
	let button = tweet_obj.element.querySelector("div.tweet-buttons > button.tweet-button.like-button")
	button.innerHTML = LIKE_SVG
	button.innerHTML += tweet_obj.tweet.favorite_count
	button.style = "color: #ffffff7c;"
	button.classList.add('tweet-button', 'like-button')
	button.setAttribute('not', 'true')
	button.onclick = function (e) {
		socket.emit('like', tweet)
	}
})

socket.on('retweet', (tweet, rt_count) => {
	let tweet_obj = tweet_objs[tweet.id_str]
	let button = tweet_obj.element.querySelector("div.tweet-buttons > button.tweet-button.rt-button")
	button.innerHTML = RETWEETED_SVG
	button.innerHTML += rt_count
	button.style = "color: #ffffff7c; fill: var(--rt-button);"
	button.classList.add('tweet-button', 'unrt-button')
	button.removeAttribute('not')
	button.onclick = function (e) {
		socket.emit('unretweet', tweet)
	}
})

socket.on('unretweet', (tweet, rt_count) => {
	let tweet_obj = tweet_objs[tweet.id_str]
	let button = tweet_obj.element.querySelector("div.tweet-buttons > button.tweet-button.rt-button")
	button.innerHTML = RETWEET_SVG
	button.innerHTML += rt_count
	button.style = "color: #ffffff7c;"
	button.classList.add('tweet-button', 'rt-button')
	button.setAttribute('not', 'true')
	button.onclick = function (e) {
		socket.emit('retweet', tweet)
	}
})

setInterval(function () {
	let elems = Array.from(sidebar.children)
	elems.forEach( elem => {
		elem.onpointerenter = function (e) {
			e.clientX
			e.clientY
		}
		elem.onpointerleave = function (e) {
			
		}
	})
}, 100)