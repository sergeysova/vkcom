'use strict'

const API = require('./API')
const Utils = require('./utils')

class User {

	constructor(token) {
        this.API = new API(typeof token === 'object' ? token : [token])
        this.LastMentions = []
	}


    api(method, params, callback) {
        callback = callback || Function()
        return this.API.api(method, params, (data) => {
            if (data && data.error) {
                callback(false)
            } else {
                callback(data)
            }
        })
    }
}

module.exports = User
