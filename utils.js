'use strict'

const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')

class Utils {

    constructor() {
        let self = this
    }
    
	request(request_url, options, callback) {
		let self = this
		callback = callback || Function()
        request_url = request_url.split(':')
        let url_parse = url.parse(request_url[0] + ':' + request_url[1])
        let port = url_parse.protocol == 'http:' ? (request_url.length >= 2 ? self.intval(request_url[2]) : 80) : 443
        let sendOptions = {
            host: url_parse.host,
            path: url_parse.path,
            port: port,
            method: options.method || 'GET',
            headers: {'User-Agent': 'VK Bot lib 0.0.1'}
        }
        if (sendOptions.method == 'GET' && options.params) {
        	sendOptions.path += '?' + self.toURL(options.params)
        }
        let protocol = (url_parse.protocol == 'http:' ? http : https)
        sendOptions.agent = new protocol.Agent({keepAlive: true})
        let request = protocol.request(sendOptions, (response) => {
            var chunks = []
            response.on('data', (chunk) => {
                chunks.push(chunk)
            })
            response.on('end', () => {
            	if (options.encode) {
            		callback(Buffer.concat(chunks).toString('utf-8'), response)
            	} else {
            		callback(Buffer.concat(chunks), response)
            	}
            })
        })
        request.on('error', (e) => {
            console.log(e)
            callback(false, false)
        })
        if (options.method == 'POST' && options.multipart) {
        	let field = Object.keys(options.multipart)[0]
        	let data = options.multipart[field]
        	if (data.file) {
        		data.buffer = fs.readFile(data.file, (err, data) => {
                    if (err || !data) {
                        callback(false, false)
                        return
                    }
                    delete data.file
                    options.multipart[field].buffer = data
                    self.request(request_url, options, callback)
                })
        		return
        	}
        	let boundaryKey = '----WebKitFormBoundary' + self.rand() + 'time' + self.time()
        	let header = self.multipartHeader(boundaryKey, field, data) 
        	let endBoundary = "\r\n--" + boundaryKey + "--\r\n"
        	let length = Buffer.byteLength(data.buffer) + header.length + endBoundary.length
        	request.setHeader('Content-Type', 'multipart/form-data; boundary="' + boundaryKey + '"')
        	request.setHeader('Content-Length', length)
        	request.write(header)
        	request.write(data.buffer)
        	request.write(endBoundary)
        	request.end()
        } else if (options.method == 'POST' && options.params) {
        	request.setHeader('Content-Type', 'application/x-www-form-urlencoded')
        	let postbody = self.toURL(options.params)
            request.setHeader('Content-Length', Buffer.byteLength(postbody))
        	request.end(postbody)
        } else {
        	request.setHeader('Content-Length', 0)
        	request.end()
        }
	}

	multipartHeader(boundaryKey, field, data) {
		var header = "Content-Disposition: form-data; name=\"" + field + 
  	            "\"; filename=\"" + (data.filename || 'file') + "\"\r\n" +
  	            "Content-Length: " + data.buffer.length + "\r\n" +
  	            "Content-Transfer-Encoding: binary\r\n" + 
  	            "Content-Type: " + (data.mimetype || 'application/octet-stream');
  	    return "--" + boundaryKey + "\r\n" + header + "\r\n\r\n";
	}

	getBuffer(request_url, params, callback) {
		try {
            callback = callback || Function()
            let options = {
                method: 'POST'
            }
            if (!Object.keys(params).length) {
                options.method = 'GET'
            } else {
                options.params = params
            }
            this.request(request_url, options, callback)
        } catch(e) {
            console.log(e)
            callback(false)
        }
	}

	upload(server, params, callback) {
		callback = callback || Function()
		let options = {
			method: 'POST',
			encode: true,
			multipart: params
		}
		this.request(server, options, callback)
    }

	post(request_url, params, callback) {
		callback = callback || Function()
		let options = {
			method: 'POST',
			params: params,
			encode: true
		}
		this.request(request_url, options, callback)
    }

    get(request_url, params, callback) {
    	callback = callback || Function()
		let options = {
			method: 'GET',
			params: params,
			encode: true
		}
		this.request(request_url, options, callback)
    }

    toURL(params) {
        return Object.keys(params).map((key) => {
            return encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
        }).join('&')
    }

    rand(low, high) {
        low = low || 0
        high = high || (9 * 1000000)
        let r = Math.floor(Math.random() * (high - low + 1) + low)
        return r
    }

    randIndex(items) {
        return this.rand(0, Math.abs(items.length - 1))
    }

    time() {
        return Math.round(new Date().getTime() / 1000)
    }

    jsonFromFile(file) {
        var data = ''
        try {
            data = fs.readFileSync(file, 'utf8')
            return JSON.parse(data)
        } catch(e) {
            console.log(e)
            console.log(data)
            return false
        }
    }

    jsonToFile(file, json) {
        return fs.writeFile(file, (typeof json === 'string' ? json : JSON.stringify(json)), 'utf8', () => { });
    }
    
    intval(value) {
        try {
            if (value === true) return 1
            value = parseInt(value) || 0
            return value == NaN ? 0 : value
        } catch(e) {
            return 0
        }
    }

    getMilliseconds() {
        return (new Date).getTime()
    }

    getLogStart(methodName = 'unknown') {
        let self = this
        if (!self.monitorItems[methodName]) {
            self.monitorItems[methodName] = []
        }
        let timing = {
            startTime: self.getMilliseconds()
        }
        timing.end = () => {
            let t = Math.abs(timing.startTime - self.getMilliseconds())
            self.monitorItems[methodName].push(t)
        }
        return timing
    }
}

module.exports = new Utils()
