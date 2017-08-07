'use strict'

const Utils = require('./utils')
const API_URL = 'https://api.vk.com/method/'
const API_VERSION = '5.67'

class API {
    constructor(tokens) {
        let self = this
        self.CallbackRegistry = {}
        self.MethodQueue = []
        self.AccessTokens = tokens
        self.LastToken = 0
        let t = Math.ceil(1000 / (self.AccessTokens.length * 3)) + 50
        setInterval(() => self.execute(), t)
    }

    execute() {
        let self = this
        let methods = self.MethodQueue.slice(0, 25)
        self.MethodQueue = self.MethodQueue.slice(25)
        if (!methods.length) return
        let code = 'return [' + methods.join(',') + '];'
        self.api('execute', {code: code}, (data, error) => {
            if (!data || !data.response) return
            let execute_errors = []
            for (var i = 0; i < (data.execute_errors || []); i++) {
                if (data.execute_errors[i].method != 'execute') execute_errors.push()
            }
            for (var i = 0; i < data.response.length; i++) {
                let item = data.response[i]
                if (self.CallbackRegistry[item.callback]) {
                    try {
                        self.CallbackRegistry[item.callback](item.response, !item.response ? execute_errors.shift() : false)
                    } catch(e) {
                        console.log('API.execute', e)
                        self.CallbackRegistry[item.callback](item.response, {error: {error_code: -1, error_msg: 'Execution failed'}})
                    }
                }
            }
        })
    }

    api(method = 'execute', params = {}, callback = Function()) {
        let self = this
        if (method != 'execute' && method != 'photos.getOwnerCoverPhotoUploadServer' && method != 'photos.saveOwnerCoverPhoto' && method != 'messages.getLongPollServer') {
            let callbackName = 'request' + Utils.time() + '_' + Utils.rand() + '_' + Utils.rand()
            var isOk = false
            let timerId = setTimeout(() => { 
                if (!isOk) {
                    callback(false, {e: 'Timeout', callbackName: callbackName, params: params})
                }
            }, 6000)
            self.CallbackRegistry[callbackName] = (data, error) => {
                isOk = true
                if (error) {
                    error.request_params = []
                    Object.keys(params).forEach((key) => error.request_params.push({key: key, value: params[key]}))
                }
                callback(data, error)
                clearTimeout(timerId)
                delete self.CallbackRegistry[callbackName]
            }
            self.MethodQueue.push('{"callback": "' + callbackName + '", "response": API.' + method + '(' + JSON.stringify(params) + ')}')
        } else {
            if (!params.v) {
                params.v = API_VERSION
            }
            params.access_token = self.AccessTokens[self.LastToken]
            self.LastToken++
            if (self.LastToken >= self.AccessTokens.length) {
                self.LastToken = 0
            }
            let log = Utils.getLogStart('vk_api')
            Utils.post(API_URL + method, params, (body, response) => {
                log.end()
                if (!body && !response) {
                    return callback(false, {response: response, body: body})
                }
                if (!response.headers['content-type'].startsWith('application/json')) {
                    return callback(false, {response: response, body: body})
                }
                try {
                    body = JSON.parse(body)
                } catch(e) {
                    console.log('API', e)
                    return callback(false, e)
                }
                if (body.response) {
                    return callback(body)
                }
                switch (body.error.error_code) {
                    case 10:
                    case 9:
                    case 6:
                    case 1:
                        return callback(false, body)
                    case 901:
                        return callback(false, body)
                    default:
                        console.log(body)
                        callback(false, body)
                }
            })
      }
    }
}

module.exports = API
