const url = require("url")
	, https = require("https")
	, AWS = require("aws-sdk")
	, _ = require("lodash");

/** The Slack hook URL */
const hookUrlPromise = shouldDecryptBlob(process.env.SLACK_HOOK_URL, s =>
	// URL should be 78-80 characters long when decrypted
	s.length > 100 && !/https?:\/\/\w/.test(s));

/** The Slack channel to send a message to stored in the slackChannel environment variable */
const slackChannelPromise = shouldDecryptBlob(process.env.SLACK_CHANNEL);

/**
 * Decrypt environment variable if it looks like a KMS encrypted string.
 *
 * @param {string} blob Raw or encrypted base64 value
 * @param {Function} [isValid] Checks whether to attempt to decrypt the value
 * @returns {Promise<string>} Resolved decrypted value, or raw value if fails
 */
function shouldDecryptBlob(blob, isValid) {
	return new Promise(resolve => {
		if (_.isString(blob)
			// encrypted values are usually 250+ characters
			&& blob.length > 50 && !_.includes(blob, " ")
			&& (!isValid || isValid(blob))
		) {
			const kmsClient = new AWS.KMS();
			kmsClient.decrypt({ CiphertextBlob: Buffer.from(blob, "base64") }, (err, data) => {
				if (err) {
					console.error("Error decrypting (using as-is):", err);
					resolve(blob);
				}
				else {
					resolve(data.Plaintext.toString("ascii"));
				}
			});
		}
		else {
			// use as-is
			resolve(blob);
		}
	});
}

/**
 * Slack Helper Utility
 */
class Slack {
	/**
	 * Converts a given {@link Date} object to a Slack-compatible epoch timestamp.
	 *
	 * @param {Date} date - Date object to convert
	 * @returns {Integer} Epoch time
	 */
	static toEpochTime(date) {
		return date.getTime() / 1000 | 0;
	}

	/**
	 * Posts a message to Slack.
	 *
	 * @param {Object} message - Message to post to Slack
	 * @returns {Promise} Fulfills on success, rejects on error.
	 */
	static postMessage(message) {
		return retry(3, async () => {
			const hookUrl = await hookUrlPromise;
			const slackChannel = await slackChannelPromise;
			if (_.isEmpty(message.channel) && !_.isEmpty(slackChannel)) {
				message.channel = slackChannel;
			}

			const response = await postJson(message, hookUrl);
			const statusCode = response.statusCode;

			if (200 <= statusCode && statusCode < 300) {
				console.info("Message posted successfully.");
				return response;
			}
			if (400 <= statusCode && statusCode < 500) {
				const e = new Error(`Slack API reports bad request [HTTP:${response.statusCode}] ${response.statusMessage}: ${response.body}`);
				e.retryable = false;
				throw e;
			}

			throw `Slack API error [HTTP:${response.statusCode}]: ${response.body}`;
		});
	}
}

/**
 * Set of predefined colors for different alert levels
 */
Slack.COLORS = {
	critical: "danger",  // "#FF324D",
	warning: "warning", // "#FFD602",
	ok: "good",    // "#8CC800",
	accent: "#1E90FF",
	neutral: "#A8A8A8",
};

/**
 * Wait for specified number of milliseconds.
 *
 * @param {Number} ms Milliseconds to wait
 * @returns {Promise<any>} _nothing_
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Await function return value repeatedly.
 * Allows Error.retryable=false to override retry behavior.
 *
 * @param {Number} retries Maximum number of times to call function
 * @param {Function} func Function to call
 * @returns {Promise<*>} Return value of function
 */
async function retry(retries, func) {
	let numTries = 0;
	for (; ;) {
		try {
			return await func();
		}
		catch (e) {
			if ((_.isUndefined(e.retryable) || e.retryable) && ++numTries < retries) {
				// Exponential back-off
				const waitFor = Math.pow(2, numTries) * 200;
				console.error(`[ERROR-Retryable] attempt#${numTries}, waiting ${waitFor}ms]:`, e);
				await sleep(waitFor);
				continue;
			}
			throw e;
		}
	}
}

/**
 * Post specified data to HTTPS endpoint.
 *
 * @param {{}} data Data to stringify
 * @param {string} endpoint HTTPS URL destination
 * @returns {Promise<{}>} Response description
 */
function postJson(data, endpoint) {
	return new Promise((resolve, reject) => {
		const body = JSON.stringify(data);
		const options = url.parse(endpoint);
		options.method = "POST";
		options.headers = {
			"Content-Type": "application/json",
			"Content-Length": Buffer.byteLength(body),
		};
		options.timeout = 3500;

		const postReq = https.request(options, res => {
			const chunks = [];
			res.setEncoding("utf8");
			res.on("data", chunks.push.bind(chunks));
			res.on("error", reject);
			res.on("end", () => {
				resolve({
					body: chunks.join(""),
					statusCode: res.statusCode,
					statusMessage: res.statusMessage,
				});
			});
			return res;
		});

		postReq.write(body);
		postReq.end();
	});
}

module.exports = Slack;
