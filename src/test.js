"use strict";

const Handler = require("./index.js")
	, stdin = process.stdin
	, inputChunks = [];

stdin.resume();
stdin.setEncoding("utf8");

stdin.on("data", chunk => {
	inputChunks.push(chunk);
});

stdin.on("end", () => {
	const inputJSON = inputChunks.join();
	const eventData = JSON.parse(inputJSON);
	Handler.handler(eventData, {}, () => {
		// Done.
		process.exit();
	});
});
