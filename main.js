/*\
title: $:/plugins/tiddlywiki/remotestorage/syncadaptor.js
type: application/javascript
module-type: syncadaptor

Saves tiddlers to somewhere under the tiddlers/ namespace on remoteStorage.

\*/

/* global $tw, fetch */

class RSSyncer {
  constructor (options) {
    this.wiki = options.wiki

    this.readonly = (
      'yes' === this.wiki.getTextReference('$:/plugins/fiatjaf/remoteStorage/readonly')
    )

    const RemoteStorage = require('remotestoragejs')
    const Widget = require('remotestorage-widget')

    this.Discover = require('remotestoragejs/src/discover')

    this.ls = localStorage
    this.rs = new RemoteStorage({logging: false})

    this.rs.on('connected', () => {
      console.log('connected')
    })

    this.rs.on('disconnected', () => {
      console.log('disconnected')
    })

    if (!this.readonly) {
      this.rs.access.claim('tiddlers', 'rw')
      this.rs.caching.enable('/tiddlers/')

      let widget = new Widget(this.rs, {
        leaveOpen: false,
        autoCloseAfter: 4000
      })

      widget.attach()

      let style = document.createElement('style')
      style.innerHTML = `#remotestorage-widget {
        position: fixed;
        top: 18px;
        right: 15px;
      }`
      document.head.appendChild(style)

      let ns = this.ls.getItem('$:/plugins/fiatjaf/remoteStorage/namespace') || 'main'
      let priv = this.ls.getItem('$:/plugins/fiatjaf/remoteStorage/private') || 'no'
      this.wiki.setText('$:/plugins/fiatjaf/remoteStorage/private', null, null, priv)
      this.wiki.setText('$:/plugins/fiatjaf/remoteStorage/namespace', null, null, ns)
    }
  }

  getClient () {
    let ns = this.wiki.getTextReference('$:/plugins/fiatjaf/remoteStorage/namespace') || 'main'
    let priv = this.wiki.getTextReference('$:/plugins/fiatjaf/remoteStorage/private') || 'no'
    let baseuri = `/${priv !== 'yes' ? 'public/' : ''}tiddlers/${ns}/`

    if (this.readonly) {
      let addr = this.wiki.getTextReference('$:/plugins/fiatjaf/remoteStorage/userAddress')

      return this.Discover(addr)
        .then(info => ({
          getFile (key) {
            return fetch(info.href + baseuri + encodeURIComponent(key))
              .then(r => r.text())
              .then(text => ({data: text}))
          }
        }))
    }

    return Promise.resolve(this.rs.scope(baseuri))
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

  getTiddlerInfo (tiddler) {
    return {}
  }

  getStatus (callback) {
    callback(null, this.rs.remote.connected, this.rs.remote.userAddress)
  }

  getSkinnyTiddlers (callback) {
    this.getIndex()
      .then(index => {
        var tiddlers = Object.keys(index)
          .map(title => ({
            title,
            tags: index[title].tags
          }))

        tiddlers.push({title: '$:/plugins/fiatjaf/remoteStorage/namespace'})
        tiddlers.push({title: '$:/plugins/fiatjaf/remoteStorage/private'})

        if (!this.readonly) tiddlers.push({title: '$:/StoryList'})

        callback(null, tiddlers)
      })
      .catch(e => {
        callback(e)
      })

    return true
  }

  loadTiddler (title, callback) {
    if (this.readonly && title === '$:/StoryList') {
      callback(null, {title: '$:/StoryList'})
      return
    }

    if (title.slice(0, 33) === '$:/plugins/fiatjaf/remoteStorage/' ||
        title === '$:/StoryList') {
      let tiddler = this.ls.getItem(title)

      try {
        callback(null, JSON.parse(tiddler))
      } catch (e) {
        callback(null, {title, text: tiddler})
      }

      return
    }

    this.getClient()
     .then(client => client.getFile(encodeURIComponent(title)))
     .then(res => callback(null, JSON.parse(res.data)))
     .catch(e => {
       callback(e)
     })

    return true
  }

  saveTiddler (tiddler, callback, tiddlerInfo) {
    if (this.readonly) return callback(null)

    if (tiddler.fields.title.slice(0, 33) === '$:/plugins/fiatjaf/remoteStorage/' ||
        tiddler.fields.title === '$:/StoryList') {
      this.ls.setItem(tiddler.fields.title, JSON.stringify(tiddler.fields))

      // whenever this happens we must reload our index
      if (tiddler.fields.title.split('/')[3] === 'remoteStorage') {
        this._index = null
      }

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

  deleteTiddler (title, callback, tiddlerInfo) {
    if (this.readonly) return callback(null)

    if (title.slice(0, 33) === '$:/plugins/fiatjaf/remoteStorage/' ||
        title === '$:/StoryList') {
      this.ls.removeItem(title)
    }

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
