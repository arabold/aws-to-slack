"use strict";

const _ = require("lodash"),
	Slack = require("../slack");

class SNSParser extends SNSParser {

	async parse(event) {
		const attachments = [],
			in_flight = [];

		await Promise.all(_.map(event.Records, async (record) => {
			const message = JSON.parse(_.get(record, "Sns.Message"));
			const slackMessage = await this.handleMessage(message, event);
			if (!slackMessage) {
				return;
			}

			SNSParser.decorateWithSource(record, slackMessage);

			const keys = _.keys(slackMessage);
			if (keys.length === 1 && keys[0] === "attachments") {
				attachments.concat(slackMessage.attachments);
			}
			else {
				// send solo
				in_flight.push(Slack.postMessage(slackMessage));
			}
		}));

		if (attachments.length) {
			// send all attachments at once
			in_flight.push(Slack.postMessage({ attachments }));
		}
		if (in_flight.length) {
			// we generated at least one message
			await Promise.all(in_flight);
			return true;
		}
		return false;
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