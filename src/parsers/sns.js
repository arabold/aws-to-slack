"use strict";

const _ = require("lodash");

/**
 * Abstract SNS parsing class.
 * Use by implementing handleMessage(message) inside sub-class.
 */
class SNSParser {

	/**
	 * Process an individual record from the SNS event.
	 *
	 * @param {{}} event Root event object containing a single-value "Records" array
	 * @returns {Promise<?{}>} Slack message, if one was generated
	 */
	async parse(event) {
		if (!_.has(event, "Records[0].Sns.Message")) {
			return false;// not of interest for us
		}

		this.event = event;// store for future use in sub-class?
		this.record = event.Records[0];

		// Assume the message is a JSON string
		let message = _.get(this.record, "Sns.Message");
		if (_.isString(message) && _.startsWith(message, "{") && _.endsWith(message, "}")) {
			try {
				message = JSON.parse(message);
			}
			catch (err) {
				console.log(`Sns.Message looked like JSON, but failed parse: ${err.message}`, message);
			}
		}

		// Delegate processing to sub-class
		const slackMessage = await this.handleMessage(message);
		if (slackMessage) {
			this.decorateWithSource(slackMessage);
			return slackMessage;
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

	/**
	 * Add default values when not filled by sub-class.
	 *
	 * @param {{}} slackMessage Message to populate
	 * @returns {void} Nothing
	 * @protected
	 */
	decorateWithSource(slackMessage) {
		const att = _.get(slackMessage, "attachments[0]");

		if (att && !att.footer) {
			// Add link to SNS ARN in footer
			// Example: arn:aws:sns:region:account-id:topicname:subscriptionid
			const snsArn = _.split(this.record.EventSubscriptionArn, ":");
			// Only override empty footers
			if (snsArn.length >= 6) {
				const region = snsArn[3];
				const accountId = snsArn[4];
				const topic = snsArn[5];
				const url = `https://console.aws.amazon.com/sns/v2/home?region=${region}#/topics/arn:aws:sns:${region}:${accountId}:${topic}`;
				const signin = `https://${accountId}.signin.aws.amazon.com/console/sns?region=${region}`;
				// limit visible length of topic
				const topicVisible = topic.length > 40
					? topic.substr(0, 35) + "..."
					: topic;

				att.footer = `Received via <${url}|SNS ${topicVisible}> | <${signin}|Sign-In>`;

				// footer is limited to 300 chars, seemingly including URLs
				// https://api.slack.com/docs/message-attachments#footer
				if (att.footer.length > 300) {
					att.footer = `Received via <${url}|SNS ${topicVisible}>`;
				}
			}
		}
	}

	/**
	 * Override in sub-class.
	 *
	 * @param {{}} message Parsed string from Sns.Message
	 * @returns {{}|boolean} False if cannot handle message, object if can produce Slack message
	 * @abstract
	 */
	handleMessage(message) {
		throw `${message} - Implement in sub-class`;
	}
}

module.exports = SNSParser;
