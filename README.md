## Save your tiddlers to [remoteStorage](https://remotestorage.io/)!

Works anywhere, just grab the plugin on [$:/plugins/fiatjaf/remoteStorage](https://tiddly.alhur.es/#%24%3A%2Fplugins%2Ffiatjaf%2FremoteStorage), save, reload, optionally change your preferences on [$:/plugins/fiatjaf/remoteStorage/config](https://tiddly.alhur.es/#%24%3A%2Fplugins%2Ffiatjaf%2FremoteStorage) and you'll be good to go.

Your tiddlers will be saved on `/public/tiddlers/<chosen-namespace>/`.

  * `<chosen-namespace>` defaults to `"main"`.

---

### Easy setup

If you're starting on the [TiddlyWiki](https://tiddlywiki.com/) world, you can just visit https://tiddly.alhur.es/, login with your [remoteStorage account](https://wiki.remotestorage.io/Servers) on the widget and start adding tiddlers! Your TiddlyWiki will be viewable to anyone on `https://tiddly.alhur.es/<your-remotestorage-address>/<chosen-namespace>/` at any moment!

Just remember that, to avoid causing problems to visitors, the wiki displayed at `https://tiddly.alhur.es/<your-remotestorage-address>/<chosen-namespace>/` will not save its edits, not even if you're the one browsing it. To edit and have your edits saved to remoteStorage, go to https://tiddly.alhur.es/ only.

(If you already have a TiddlyWiki and wants to migrate to this remoteStorage-based setup, you'll have to install the plugin on your own TiddlyWiki wherever it is and somehow push all your tiddlers to remoteStorage -- after that you'll be able to use https://tiddly.alhur.es/ normally.)

---

https://tiddly.alhur.es/ is powered by https://github.com/fiatjaf/tiddlywiki-remotestorage-server.
