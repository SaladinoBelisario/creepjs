(async () => {

	const hashMini =  x => {
		if (!x) return x
		const json = `${JSON.stringify(x)}`
		const hash = json.split('').reduce((hash, char, i) => {
			return Math.imul(31, hash) + json.charCodeAt(i) | 0
		}, 0x811c9dc5)
		return ('0000000' + (hash >>> 0).toString(16)).substr(-8)
	}

	const hashify = async (x) => {
		const json = `${JSON.stringify(x)}`
		const jsonBuffer = new TextEncoder().encode(json)
		const hashBuffer = await crypto.subtle.digest('SHA-256', jsonBuffer)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
		return hashHex
	}

	// template views
	const patch = (oldEl, newEl) => oldEl.parentNode.replaceChild(newEl, oldEl)
	const html = (str, ...expressionSet) => {
		const template = document.createElement('template')
		template.innerHTML = str.map((s, i) => `${s}${expressionSet[i] || ''}`).join('')
		return document.importNode(template.content, true)
	}

	// system
	const getOS = userAgent => {
		const os = (
			// order is important
			/windows phone/ig.test(userAgent) ? 'Windows Phone' :
				/win(dows|16|32|64|95|98|nt)|wow64/ig.test(userAgent) ? 'Windows' :
					/android/ig.test(userAgent) ? 'Android' :
						/cros/ig.test(userAgent) ? 'Chrome OS' :
							/linux/ig.test(userAgent) ? 'Linux' :
								/ipad/ig.test(userAgent) ? 'iPad' :
									/iphone/ig.test(userAgent) ? 'iPhone' :
										/ipod/ig.test(userAgent) ? 'iPod' :
											/ios/ig.test(userAgent) ? 'iOS' :
												/mac/ig.test(userAgent) ? 'Mac' :
													'Other'
		)
		return os
	}

	const decryptUserAgent = ({ ua, os, isBrave }) => {
		const apple = /ipad|iphone|ipod|ios|mac/ig.test(os)
		const isOpera = /OPR\//g.test(ua)
		const isVivaldi = /Vivaldi/g.test(ua)
		const isDuckDuckGo = /DuckDuckGo/g.test(ua)
		const isYandex = /YaBrowser/g.test(ua)
		const paleMoon = ua.match(/(palemoon)\/(\d+)./i)
		const edge = ua.match(/(edgios|edg|edge|edga)\/(\d+)./i)
		const edgios = edge && /edgios/i.test(edge[1])
		const chromium = ua.match(/(crios|chrome)\/(\d+)./i)
		const firefox = ua.match(/(fxios|firefox)\/(\d+)./i)
		const likeSafari = (
			/AppleWebKit/g.test(ua) &&
			/Safari/g.test(ua)
		)
		const safari = (
			likeSafari &&
			!firefox &&
			!chromium &&
			!edge &&
			ua.match(/(version)\/(\d+)\.(\d|\.)+\s(mobile|safari)/i)
		)

		if (chromium) {
			const browser = chromium[1]
			const version = chromium[2]
			const like = (
				isOpera ? ' Opera' :
					isVivaldi ? ' Vivaldi' :
						isDuckDuckGo ? ' DuckDuckGo' :
							isYandex ? ' Yandex' :
								edge ? ' Edge' :
									isBrave ? ' Brave' : ''
			)
			return `${browser} ${version}${like}`
		} else if (edgios) {
			const browser = edge[1]
			const version = edge[2]
			return `${browser} ${version}`
		} else if (firefox) {
			const browser = paleMoon ? paleMoon[1] : firefox[1]
			const version = paleMoon ? paleMoon[2] : firefox[2]
			return `${browser} ${version}`
		} else if (apple && safari) {
			const browser = 'Safari'
			const version = safari[2]
			return `${browser} ${version}`
		}
		return 'unknown'
	}

	// compute window
	const getNestedWindowFrameContext = () => {
		try {
			const isFirefox = typeof InstallTrigger !== 'undefined'
			const createIframe = context => {
				const numberOfIframes = context.length
				const div = document.createElement('div')
				div.setAttribute('style', 'display:none')
				document.body.appendChild(div)

				const id = [...crypto.getRandomValues(new Uint32Array(10))]
					.map(n => n.toString(36)).join('')

				// avoid dead object error
				const ghost = `
				style="
				height: 100vh;
				width: 100vw;
				position: absolute;
				left:-10000px;
				visibility: hidden;
				"
			`
				const hide = `style="display: none;"`
				patch(div, html`<div ${ghost} id="${id}"><iframe ${isFirefox ? ghost : hide}></iframe></div>`)
				const el = document.getElementById(id)

				return {
					el,
					iframeWindow: context[numberOfIframes],
					remove: () => el.parentNode.removeChild(el)
				}
			}

			const parentNest = createIframe(window)
			const { iframeWindow } = parentNest
			return { iframeWindow, parentNest }
		}
		catch (error) {
			console.error(error)
			return { iframeWindow: window, parentNest: undefined }
		}
	}

	const { iframeWindow, parentNest } = getNestedWindowFrameContext()

	const getIframeContentWindowVersion = iframeWindow => {

		return new Promise(async resolve => {
			try {
				const keys = Object.getOwnPropertyNames(iframeWindow)
				const moz = keys.filter(key => (/moz/i).test(key)).length
				const webkit = keys.filter(key => (/webkit/i).test(key)).length
				const apple = keys.filter(key => (/apple/i).test(key)).length
				const data = { keys, apple, moz, webkit }
				const $hash = await hashify(data)
				return resolve({ ...data, $hash })
			}
			catch (error) {
				console.error(error)
				return resolve()
			}
		})
	}

	const { $hash: hash } = await getIframeContentWindowVersion(iframeWindow)
		.catch(error => console.error(error))

	if (parentNest) {
		parentNest.remove()
	}

	// get data
	const webapp = 'https://script.google.com/macros/s/AKfycbw26MLaK1PwIGzUiStwweOeVfl-sEmIxFIs5Ax7LMoP1Cuw-s0llN-aJYS7F8vxQuVG-A/exec'
	const samples = await fetch(webapp)
		.then(response => response.json())
		.catch(error => {
			console.error(error)
			return
		})

	if (!samples) {
		const el = document.getElementById('fingerprint-data')
		return patch(el, html`
			<div id="fingerprint-data">
				<div class="visitor-info">
					<strong>Window Version</strong>
					<div>Failed sample fetch...</div>
				</div>
			</div>
		`)
	}
	
	const { window: windowSamples } = samples || {}

	// construct template 
	let matchingIndex
	const computeTemplate = ({ name, fingerprints, index }) => {
		fingerprints = fingerprints.sort((a, b) => (a.systems[0] > b.systems[0]) ? 1 : -1)
		const style = `
		style="
			background: #657fca;
    		color: #fff;
    		padding: 2px 4px;
    		border-radius: 2px;
		"
	`
		let hasMatch
		const idTemplate = fingerprints.map(fp => {
			const match = fp.id == hash
			if (match) {
				hasMatch = true
				matchingIndex = index
			}
			return `<div ${match ? style : ''}>${hashMini(fp.id)}: ${fp.systems.join(', ')}</div>`
		}).join('')

		return `
	<div ${ hasMatch ? 'style="background: #657fca26;"' : ''}>
		<strong>${name}</strong>
		${idTemplate}
	</div>
	`
	}

	let fingerprintMatch
	Object.keys(windowSamples).filter(key => {
		const version = windowSamples[key]
		const match = version.filter(fp => fp.id == hash)
		const found = match.length
		if (found) {
			const { systems } = match[0]
			fingerprintMatch = key
		}
		return found ? true : false
	})


	let uaTemplates = Object.keys(windowSamples).sort().map((key, index) => {
		return computeTemplate({ name: key, fingerprints: windowSamples[key], index })
	})
	const matchingTemplate = uaTemplates[matchingIndex]
	uaTemplates = uaTemplates.filter((item, index) => index != matchingIndex)

	const isBrave = 'brave' in navigator
	const { userAgent: reportedUserAgent } = navigator
	const el = document.getElementById('fingerprint-data')
	patch(el, html`
		<div id="fingerprint-data">
			<div class="visitor-info">
				<strong>Window Version</strong>
			</div>
			<div>
				<div>
					<div>reported user agent: ${
			decryptUserAgent({
				ua: reportedUserAgent,
				os: getOS(reportedUserAgent),
				isBrave
			})
			}</div>
					<div>our guess:</div>
					<div class="block-text" style="font-size:30px">${
			fingerprintMatch ? fingerprintMatch : `new (${hashMini(hash)})`
			}</div>
					${matchingTemplate ? matchingTemplate : ''}
				</div>
			</div>
			<div class="relative">
				<div class="ellipsis"><span class="aside-note">updated weekly</span></div>
				${uaTemplates.join('')}
			</div>
		</div>
	`)

})()
