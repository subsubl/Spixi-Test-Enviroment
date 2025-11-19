# DOS App

This sample app demonstrates integration of the js-dos player (v8) in the Spixi mini-app test environment.

- The app loads the js-dos player from the internet (https://v8.js-dos.com/latest/js-dos.js).
- Use the `Load Digger` button to load a bundled DOS game from the js-dos CDN (digger).
- There is a `Sample bundles` selector with pre-configured example(s):
	- `Digger` — a demo bundle hosted by js-dos: `https://v8.js-dos.com/bundles/digger.jsdos`
	- Use the `Load Selected` button to run the chosen sample bundle.
	- To run your own bundle, paste its URL into the `bundle URL` field and click `Load URL`.

	Dark theme & Auto-start
	-----------------------
	The app defaults to a dark theme and will auto-start the selected sample bundle on page load. You can toggle the `Auto-start` checkbox in the UI to disable this behavior. The js-dos player is configured with `theme: 'dark'` so the player UI matches the page theme.

	Community Bundle Examples
	-------------------------
	Use the `Sample bundles` selector to try public sample bundles. js-dos hosts sample bundles on the v8 CDN, and the js-dos site documents how to build or find your own bundles.

	- Digger: https://v8.js-dos.com/bundles/digger.jsdos

	For more bundles and guidance, see: https://js-dos.com/jsdos-bundle.html
- You can also enter a custom `js-dos` bundle URL and click `Load URL`.
- Click `Stop` to stop the player and free resources.

Note: Bundles are loaded from public CDN and may be blocked if offline or restricted in your environment.
