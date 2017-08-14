"use strict";

const url = require("url")
	, https = require("https")
	, BbPromise = require("bluebird")
	, _ = require("lodash");

/** The Slack hook URL */
const hookUrl = process.env.SLACK_HOOK_URL;
/** The Slack channel to send a message to stored in the slackChannel environment variable */
const slackChannel = process.env.SLACK_CHANNEL;

/**
 * Slack Helper Utility
 */
class Slack {

	/**
	 * Set of predefined colors for different alert levels
	 */
	static get COLORS() {
		return {
			critical: "danger",  // "#FF324D",
			warning:  "warning", // "#FFD602",
			ok:       "good",    // "#8CC800",
			accent:   "#1E90FF",
			neutral:  "#A8A8A8"
		};
	}

	/**
	 * Converts a given {@link Date} object to a Slack-compatible epoch timestamp.
	 *
	 * @param {Date} date - Date object to convert
	 * @returns {Integer} Epoch time
	 */
	static toEpochTime(date) {
		return date.getTime()/1000|0;
	}

	/**
	 * Posts a message to Slack.
	 *
	 * @param {Object} message - Message to post to Slack
	 * @returns {Promise} Fulfills on success, rejects on error.
	 */
	static postMessage(message) {
		console.log("Posting to Slack...");
		return new BbPromise((resolve, reject) => {
			message = _.clone(message);
			if (_.isEmpty(message.channel) && !_.isEmpty(slackChannel)) {
				message.channel = slackChannel;
			}

			const body = JSON.stringify(message);
			const options = url.parse(hookUrl);
			options.method = "POST";
			options.headers = {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(body),
			};

			const postReq = https.request(options, res => {
				const chunks = [];
				res.setEncoding("utf8");
				res.on("data", chunk => chunks.push(chunk));
				res.on("error", err => {
					reject(err);
				});
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
		})
		.then(response => {
			if (response.statusCode < 400) {
				console.info("Message posted successfully.");
				return BbPromise.resolve();
			}
			else if (response.statusCode < 500) {
				console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
				return BbPromise.resolve();
			}

			return BbPromise.reject(new Error(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`));
		})
		.tapCatch(err => {
			console.log("Error posting to Slack:", err);
		});
	}

}

module.exports = Slack;
