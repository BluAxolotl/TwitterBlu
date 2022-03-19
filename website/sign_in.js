var sign_in_button = document.getElementById('sign-in-button')

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

var auth = LocalStorage.getItem('auth')

sign_in_button.onclick = function (e) {
	socket.emit('request_signin', window.location.href, auth)
}

socket.on('authenticate', oauth_token => {
	SessionStorage.setItem('request_token', oauth_token)
	window.location.href = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`
})

if (params.oauth_token != null && params.oauth_verifier != null) {
	socket.emit('signin', params)
}

socket.on('signin', (auth) => {
	print(auth.user_id)
	LocalStorage.clear()
	LocalStorage.setItem('auth', JSON.stringify({
		'access_token': auth.oauth_token,
		'access_token_secret': auth.oauth_token_secret,
	}))
	window.location.href = "/"
})