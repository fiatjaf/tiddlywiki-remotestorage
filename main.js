/*\
title: $:/plugins/tiddlywiki/remotestorage/syncadaptor.js
type: application/javascript
module-type: syncadaptor

Saves tiddlers to somewhere under the tiddlers/ namespace on remoteStorage.

\*/

/* global $tw */

class RSSyncer {
  constructor (options) {
    this.wiki = options.wiki

    let style = document.createElement('style')
    style.innerHTML = `#remotestorage-widget {
      position: fixed;
      top: 18px;
      right: 15px;
    }`

    const RemoteStorage = require('remotestoragejs')
    const Widget = require('remotestorage-widget')

    this.rs = new RemoteStorage({logging: false})
    this.rs.access.claim('tiddlers', 'rw')
    this.rs.caching.enable('/tiddlers/')

    this.rs.on('connected', () => {
      console.log('connected')
    })

    this.rs.on('disconnected', () => {
      console.log('disconnected')
    })

    let widget = new Widget(this.rs, {
      leaveOpen: false,
      autoCloseAfter: 4000
    })

    widget.attach()
    document.head.appendChild(style)

    localStorage.setItem(
      '$:/plugins/fiatjaf/remoteStorage/namespace',
      localStorage.getItem('$:/plugins/fiatjaf/remoteStorage/namespace') || 'main'
    )
    localStorage.setItem(
      '$:/plugins/fiatjaf/remoteStorage/private',
      localStorage.getItem('$:/plugins/fiatjaf/remoteStorage/private') || 'no'
    )
  }

  getIndex () {
    if (this._index) return Promise.resolve(this._index)

    return this.getClient()
      .then(client => client.getFile('__index__'))
      .then(res => {
        let index = JSON.parse(res.data || '{}')
        this._index = index
        return index
      })
  }

  saveIndex () {
    return Promise.all([
      this.getClient(),
      this.getIndex()
    ])
      .then(([client, index]) => client.storeFile(
        'application/json',
        '__index__',
        JSON.stringify(index)
      ))
  }

  getClient () {
    return new Promise(resolve => {
      if (this._client) resolve(this._client)

      let ns = this.wiki.getTextReference('$:/plugins/fiatjaf/remoteStorage/namespace') ||
        'main'
      let priv = this.wiki.getTextReference('$:/plugins/fiatjaf/remoteStorage/private') ||
        'no'
      let client = this.rs.scope(`/${priv !== 'yes' ? 'public/' : ''}tiddlers/${ns}/`)
      this._client = client
      resolve(client)
    })
  }

  getTiddlerInfo (tiddler) {
    return {}
  }

  getStatus (callback) {
    callback(null, this.rs.remote.connected, this.rs.remote.userAddress)
  }

  getSkinnyTiddlers (callback) {
    this.getIndex()
      .then(index => {
        let tiddlers = Object.keys(index)
          .map(title => ({
            title,
            tags: index[title].tags
          }))
        callback(null, tiddlers)
      })
      .catch(e => {
        callback(e)
      })

    return true
  }

  saveTiddler (tiddler, callback, tiddlerInfo) {
    if (tiddler.fields.title.slice(0, 33) === '$:/plugins/fiatjaf/remoteStorage/') {
      localStorage.setItem(tiddler.fields.title, tiddler.fields.text)
      callback(null)
      return
    }

    Promise.all([
      this.getClient(),
      this.getIndex()
    ])
      .then(([client, index]) => {
        index[tiddler.fields.title] = {
          tags: tiddler.fields.tags
        }

        return Promise.all([
          client.storeFile(
            'application/json',
            encodeURIComponent(tiddler.fields.title),
            JSON.stringify(tiddler.fields)
          ),
          this.saveIndex()
        ])
      })
      .then(() => {
        callback(null)
      })
      .catch(e => {
        callback(e)
      })

    return true
  }

  loadTiddler (title, callback) {
    if (title.slice(0, 33) === '$:/plugins/fiatjaf/remoteStorage/') {
      return {
        title,
        text: localStorage.getItem(title)
      }
    }

    this.getClient()
     .then(client => client.getFile(encodeURIComponent(title)))
     .then(res => callback(null, JSON.parse(res.data)))
     .catch(e => {
       callback(e)
     })

    return true
  }

  deleteTiddler (title, callback, tiddlerInfo) {
    Promise.all([
      this.getClient(),
      this.getIndex()
    ])
      .then(([client, index]) => {
        delete index[title]

        return Promise.all([
          client.remove(encodeURIComponent(title)),
          this.saveIndex()
        ])
      })
      .then(() => {
        callback(null)
      })
      .catch(e => {
        callback(e)
      })

    return true
  }
}

if ($tw.browser) {
  exports.adaptorClass = RSSyncer
}
