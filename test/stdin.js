const handleEvent = require("../src/index");

function handleStdIn() {
	const stdin = process.stdin,
		inputChunks = [];

	stdin.on("data", inputChunks.push.bind(inputChunks));

	stdin.on("end", () => {
		const inputJSON = inputChunks.join();
		const eventData = JSON.parse(inputJSON);
		handleEvent.handler(eventData, {}, () => {
			// Done.
			process.exit();
		});
	});

	stdin.setEncoding("utf8");
	stdin.resume();

	setTimeout(() => {
		if (!inputChunks.length) {
			console.error("No input after 10 seconds...");
		}
	}, 10 * 1000);
}

module.exports = handleStdIn;

if (require.main === module) {
	handleStdIn();
}
