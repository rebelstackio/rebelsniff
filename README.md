# rebelsniff
A solution providing geolocation, browser-fingerprinting, visitor and analytic logs, fraudster flagging and blacklisting

By using this javascript api (service), a client application will be able to identify (fingerprint) browsers, log page activity (analytics), request aggregate analytics, identify browsers exhibiting suspicious activity (anonymous proxy, changing headers, spamming) and browsers that have been blacklisted by our system.

The browser is identified by a base64 encoded (JWT) (gzipped) json associative array which can be transformed (by the api) to an object with properties. Basically, it is a base64 JWT token of varying length which we'll call the finger-print.

Like google analytics, simply loading in the browser will log the event which is a timestamped "load" with the url, ip, and geoip.

On unload (page departure), a subsequent event is logged and associated to the prior load event to provide browse-time.

The client may submit custom events in json object format - a hash table where properties may be of simple types only (no depth)

load, browse-time and custom events are logged in an influxdb server with short retention policies.

On-load, the api will trigger a finger-printing or draw the finger-print from cache (cookie). The api will watch for change that would require a new finger-print (otherwise considered a suspicious evnet) and log the suspicious event. In any case, a finger-print will be submitted...

/* load */
POST /load?url=https://mysite.com/mypage.html
Authorization: Bearer aaa.bbb.ccc

/* or load without existing fingerprint */
POST /load?url=https://mysite.com/mypage.html
X-Sniff-print: [...]
/* which returns a JWT token by cookie */

/* subsequent calls must use Auth token */
POST /event?url=https://mysite.com/mypage.html&time=12345
Authorization: Bearer aaa.bbb.ccc
X-Sniff-event: { prop:value, ...}

https://github.com/nodeca/pako
