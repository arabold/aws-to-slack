"use strict";

const _ = require("lodash"),
	Slack = require("../slack");

class SNSParser {

	constructor() {
		this.attachments = [];
		this.in_flight = [];
		this.event = null;
		this.record = null;
	}

	async parse(event) {
		this.event = event;
		for (const i in event.Records) {
			this.record = event.Records[i];
			await this._parseRecord(this.record);
		}

		// If we only have attachments to send, we can return a single joined message.
		// Otherwise, we have to manually send each message.

		if (this.attachments.length) {
			const slackMessage = { attachments: this.attachments };
			if (!this.in_flight.length) { // did we send a custom message already?
				// return single joined message (important for testing sub-classes)
				return slackMessage;
			}
			else {
				// can't return, so send all attachments as a single Slack message
				this.in_flight.push(Slack.postMessage(slackMessage));
			}
		}

		if (this.in_flight.length) {
			await Promise.all(this.in_flight);
			return true; // mark this message as "processed"
		}

		return false;
	}

	/**
	 * Process an individual record from the SNS event.
	 *
	 * @param {{}} record Content of Sns.Message key
	 * @returns {Promise<void>} No return value
	 * @private
	 */
	async _parseRecord(record) {
		// Assume the message is a JSON string
		let message = _.get(record, "Sns.Message");
		if (_.isString(message)) {
			try {
				message = JSON.parse(message);
			}
			catch (err) {
				console.log(`SNS message could not be JSON-parsed: ${err.message}`, message);
			}
		}

		// Delegate processing to sub-class
		const slackMessage = await this.handleMessage(message, event);
		if (!slackMessage) {
			return;// skip message
		}

		SNSParser.decorateWithSource(record, slackMessage);

		const keys = _.keys(slackMessage);
		if (keys.length === 1 && keys[0] === "attachments") {
			// there are JUST attachments, we append to our primary message
			for (const i in slackMessage.attachments) {
				this.attachments.push(slackMessage.attachments[i]);
			}
		}
		else {
			// looks like a custom message, so must send individually
			const promise = Slack.postMessage(slackMessage);
			this.in_flight.push(promise);
		}
	}

	/**
	 * Get SNS subject from current record.
	 *
	 * @returns {string} The Sns.Subject field
	 */
	getSubject() {
		return _.get(this.record, "Sns.Subject");
	}

	/**
	 * Get SNS timestamp from current record.
	 *
	 * @returns {string} The Sns.Timestamp field
	 */
	getTimestamp() {
		return _.get(this.record, "Sns.Timestamp");
	}

	/**
	 * Get region from SNS ARN of the current event.
	 *
	 * @returns {string} Region string
	 */
	getRegion() {
		// Example: arn:aws:sns:region:account-id:topicname:subscriptionid
		const snsArn = _.split(this.record.EventSubscriptionArn, ":");
		if (snsArn.length >= 6) {
			return snsArn[3];
		}
		return "us-east-1";
	}

	/**
	 * Get Account ID from SNS ARN of the current event.
	 *
	 * @returns {string} Account ID string
	 */
	getAccountId() {
		// Example: arn:aws:sns:region:account-id:topicname:subscriptionid
		const snsArn = _.split(this.record.EventSubscriptionArn, ":");
		if (snsArn.length >= 6) {
			return snsArn[4];
		}
		return "";
	}

	static decorateWithSource(record, slackMessage) {
		const att = _.get(slackMessage, "attachments[0]");

		if (att && !att.footer) {
			// Add link to SNS ARN in footer
			// Example: arn:aws:sns:region:account-id:topicname:subscriptionid
			const snsArn = _.split(record.EventSubscriptionArn, ":");
			// Only override empty footers
			if (snsArn.length >= 6) {
				const region = snsArn[3];
				const accountId = snsArn[4];
				const topic = snsArn[5];
				const url = `https://console.aws.amazon.com/sns/v2/home?region=${region}#/topics/arn:aws:sns:${region}:${accountId}:${topic}`;
				const signin = `https://${accountId}.signin.aws.amazon.com/console/sns?region=${region}`;

				att.footer = `Received via <${url}|SNS ${topic}> | <${signin}|Sign-In>`;
			}
		}
	}

	handleMessage(message, record) {
		throw `${message} - ${record}: Implement in sub-class`;
	}
}

module.exports = SNSParser;
